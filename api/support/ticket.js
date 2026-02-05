// API Endpoint: Support Ticket System
// Path: /api/support/ticket.js

const { db } = require('../../backend/firebase-config');
const { collection, addDoc, getDocs, query, where } = require('firebase/firestore');
const jwt = require('jsonwebtoken');
const { getPlanLimits } = require('../../backend/middleware/planAccess');
const slack = require('../../backend/services/slack');

const JWT_SECRET = process.env.JWT_SECRET || 'amazonreach-jwt-secret-2026';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Verify JWT
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user plan
        const sellersRef = collection(db, 'sellers');
        const userQuery = query(sellersRef, where('email', '==', decoded.email));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userData = userSnapshot.docs[0].data();
        const userPlan = userData.plan || 'starter';
        const planLimits = getPlanLimits(userPlan);

        // Determine support level
        const supportLevel = planLimits.features.prioritySupport ? 'priority' : 'standard';
        const responseTime = supportLevel === 'priority' ? '24 hours' : '48 hours';

        // POST: Create ticket
        if (req.method === 'POST') {
            const { subject, message, category } = req.body;

            if (!subject || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Subject and message required'
                });
            }

            const ticketsRef = collection(db, 'support_tickets');
            const newTicket = {
                userId: userSnapshot.docs[0].id,
                userEmail: decoded.email,
                userPlan,
                supportLevel,
                subject,
                message,
                category: category || 'general',
                status: 'open',
                priority: supportLevel === 'priority' ? 'high' : 'normal',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const ticketDoc = await addDoc(ticketsRef, newTicket);

            // Send Slack notification for high priority tickets
            if (supportLevel === 'priority') {
                await slack.sendSupportEscalation({
                    ...newTicket,
                    id: ticketDoc.id
                });
            }

            // TODO: Send email notification
            // sendEmail(support@amazonreach.com, newTicket)

            return res.status(201).json({
                success: true,
                message: 'Support ticket created',
                ticket: {
                    id: ticketDoc.id,
                    ...newTicket,
                    expectedResponse: responseTime
                }
            });
        }

        // GET: List user's tickets
        if (req.method === 'GET') {
            const ticketsRef = collection(db, 'support_tickets');
            const ticketsQuery = query(
                ticketsRef,
                where('userEmail', '==', decoded.email)
            );
            const ticketsSnapshot = await getDocs(ticketsQuery);

            const tickets = [];
            ticketsSnapshot.forEach(doc => {
                tickets.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return res.status(200).json({
                success: true,
                supportLevel,
                responseTime,
                tickets
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Support ticket error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
