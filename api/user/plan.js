// API Endpoint: Get User Plan Information
// Path: /api/user/plan.js

const { db } = require('../../backend/firebase-config');
const { collection, doc, getDoc, updateDoc, query, where, getDocs } = require('firebase/firestore');
const { getPlanLimits } = require('../../backend/middleware/planAccess');
const jwt = require('jsonwebtoken');

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
        // Verify JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        // GET: Return user's plan info
        if (req.method === 'GET') {
            const sellersRef = collection(db, 'sellers');
            const q = query(sellersRef, where('email', '==', decoded.email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const userData = snapshot.docs[0].data();
            const userPlan = userData.plan || 'starter';
            const planLimits = getPlanLimits(userPlan);

            return res.status(200).json({
                success: true,
                plan: {
                    name: userPlan,
                    displayName: userPlan.charAt(0).toUpperCase() + userPlan.slice(1),
                    startDate: userData.planStartDate || null,
                    expiryDate: userData.planExpiryDate || null,
                    limits: planLimits,
                    usage: {
                        revenueThisMonth: userData.revenueThisMonth || 0,
                        revenueLimit: planLimits.monthlyRevenueLimit,
                        integrations: userData.marketplaceIntegrations?.length || 0,
                        integrationLimit: planLimits.marketplaceIntegrations,
                        teamMembers: userData.teamMembers || 1,
                        teamMemberLimit: planLimits.teamMembers
                    }
                }
            });
        }

        // POST: Upgrade/downgrade plan (future implementation with payment)
        if (req.method === 'POST') {
            const { newPlan } = req.body;

            if (!['starter', 'professional', 'enterprise'].includes(newPlan)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid plan'
                });
            }

            // TODO: Implement payment logic (Stripe checkout)
            // For now, just update the plan (demo mode)

            const sellersRef = collection(db, 'sellers');
            const q = query(sellersRef, where('email', '==', decoded.email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const userDocRef = doc(db, 'sellers', snapshot.docs[0].id);

            await updateDoc(userDocRef, {
                plan: newPlan,
                planStartDate: new Date().toISOString(),
                planExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                updatedAt: new Date().toISOString()
            });

            return res.status(200).json({
                success: true,
                message: `Plan upgraded to ${newPlan}`,
                newPlan
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Plan API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
