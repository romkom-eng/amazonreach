// API Endpoint: AI Chat (Support & Onboarding)
// Path: /api/ai/chat.js

const { db } = require('../../backend/firebase-config');
const { collection, addDoc, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
const jwt = require('jsonwebtoken');
const gemini = require('../../backend/services/gemini');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.GEMINI_API_KEY || 'amazonreach-jwt-secret-2026';

// Load knowledge base
let knowledgeBase = '';
try {
    const kbPath = path.join(__dirname, '../../backend/knowledge/amazonreach_knowledge.md');
    knowledgeBase = fs.readFileSync(kbPath, 'utf8');
} catch (error) {
    console.error('Failed to load knowledge base:', error);
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify JWT
        const authHeader = req.headers.authorization;
        let userInfo = { email: 'guest', plan: 'starter' };
        let authenticated = false;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = jwt.verify(token, JWT_SECRET);

                // Get user info from Firestore
                const sellersRef = collection(db, 'sellers');
                const userQuery = query(sellersRef, where('email', '==', decoded.email));
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    userInfo = {
                        email: decoded.email,
                        plan: userData.plan || 'starter',
                        companyName: userData.companyName
                    };
                    authenticated = true;
                }
            } catch (err) {
                console.log('Auth failed, continuing as guest');
            }
        }

        const { message, type = 'support', conversationId = null } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message required'
            });
        }

        // Get conversation history
        let conversationHistory = [];
        if (conversationId) {
            const messagesRef = collection(db, 'ai_conversations');
            const historyQuery = query(
                messagesRef,
                where('conversationId', '==', conversationId),
                orderBy('createdAt', 'asc'),
                limit(10) // Last 10 messages for context
            );

            const historySnapshot = await getDocs(historyQuery);
            conversationHistory = historySnapshot.docs.map(doc => ({
                role: doc.data().role,
                content: doc.data().content
            }));
        }

        // Generate AI response based on type
        let aiResponse;

        if (type === 'onboarding') {
            aiResponse = await gemini.onboardingChat(message, userInfo, conversationHistory);
        } else if (type === 'support') {
            aiResponse = await gemini.supportChat(message, userInfo, knowledgeBase, conversationHistory);
        } else {
            aiResponse = await gemini.chat(message);
        }

        // Save conversation to Firestore
        const newConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const messagesRef = collection(db, 'ai_conversations');

        // Save user message
        await addDoc(messagesRef, {
            conversationId: newConversationId,
            role: 'user',
            content: message,
            userEmail: userInfo.email,
            type,
            createdAt: new Date().toISOString()
        });

        // Save AI response
        await addDoc(messagesRef, {
            conversationId: newConversationId,
            role: 'assistant',
            content: aiResponse,
            userEmail: userInfo.email,
            type,
            createdAt: new Date().toISOString()
        });

        return res.status(200).json({
            success: true,
            response: aiResponse,
            conversationId: newConversationId,
            type
        });

    } catch (error) {
        console.error('AI chat error:', error);

        // Fallback response if Gemini fails
        if (error.message && error.message.includes('API key')) {
            return res.status(500).json({
                success: false,
                error: 'AI service temporarily unavailable. Please contact support@amazonreach.com',
                fallback: true
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
