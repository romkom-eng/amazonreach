const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Clean and parse JSON from AI response
function cleanAndParseJSON(text) {
    try {
        // Remove markdown code blocks if present
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error('Failed to parse JSON:', e);
        return null;
    }
}

router.post('/chat', async (req, res) => {
    try {
        const { message, conversationId } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is missing');
            return res.status(500).json({
                success: false,
                error: 'AI service configuration error'
            });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "You are the AI support assistant for AmazonReach, a global e-commerce management platform. Help users with questions about features, pricing (14-day free trial available), and general Amazon selling tips. Be professional but friendly." }],
                },
                {
                    role: "model",
                    parts: [{ text: "Hello! I'm the AmazonReach AI assistant. I'm here to help you scale your Amazon business globally. Ask me anything about our features like Global Fulfillment, Real-Time Analytics, or how to get started with your 14-day free trial!" }],
                },
            ],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({
            success: true,
            response: text,
            conversationId: conversationId || Date.now().toString()
        });

    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process message'
        });
    }
});

module.exports = router;
