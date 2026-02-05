// API Endpoint: Marketplace Integrations
// Path: /api/integrations/connect.js

const { db } = require('../../backend/firebase-config');
const { collection, doc, getDoc, updateDoc, query, where, getDocs } = require('firebase/firestore');
const jwt = require('jsonwebtoken');
const { getPlanLimits } = require('../../backend/middleware/planAccess');

const JWT_SECRET = process.env.JWT_SECRET || 'amazonreach-jwt-secret-2026';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

        // Get user
        const sellersRef = collection(db, 'sellers');
        const userQuery = query(sellersRef, where('email', '==', decoded.email));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userId = userSnapshot.docs[0].id;
        const userData = userSnapshot.docs[0].data();
        const userPlan = userData.plan || 'starter';
        const planLimits = getPlanLimits(userPlan);
        const currentIntegrations = userData.marketplaceIntegrations || [];

        // GET: List integrations
        if (req.method === 'GET') {
            return res.status(200).json({
                success: true,
                integrations: currentIntegrations,
                plan: userPlan,
                limit: planLimits.marketplaceIntegrations,
                available: [
                    { id: 'amazon', name: 'Amazon', icon: '📦' },
                    { id: 'ebay', name: 'eBay', icon: '🛒' },
                    { id: 'shopify', name: 'Shopify', icon: '🛍️' },
                    { id: 'walmart', name: 'Walmart', icon: '🏪' },
                    { id: 'etsy', name: 'Etsy', icon: '🎨' }
                ]
            });
        }

        // POST: Add integration
        if (req.method === 'POST') {
            const { marketplace, credentials } = req.body;

            if (!marketplace) {
                return res.status(400).json({
                    success: false,
                    error: 'Marketplace required'
                });
            }

            // Check limit
            if (currentIntegrations.length >= planLimits.marketplace Integrations) {
                return res.status(403).json({
                    success: false,
                    error: 'Integration limit reached',
                    message: `Your ${userPlan} plan allows ${planLimits.marketplaceIntegrations} marketplace integration(s)`,
                    currentCount: currentIntegrations.length,
                    limit: planLimits.marketplaceIntegrations,
                    upgradeUrl: '/pricing'
                });
            }

            // Check if already connected
            if (currentIntegrations.includes(marketplace)) {
                return res.status(400).json({
                    success: false,
                    error: 'Marketplace already connected'
                });
            }

            // Add integration
            const updatedIntegrations = [...currentIntegrations, marketplace];
            const userDocRef = doc(db, 'sellers', userId);

            await updateDoc(userDocRef, {
                marketplaceIntegrations: updatedIntegrations,
                updatedAt: new Date().toISOString()
            });

            return res.status(200).json({
                success: true,
                message: `${marketplace} connected successfully`,
                integrations: updatedIntegrations
            });
        }

        // DELETE: Remove integration
        if (req.method === 'DELETE') {
            const { marketplace } = req.body;

            if (!marketplace) {
                return res.status(400).json({
                    success: false,
                    error: 'Marketplace required'
                });
            }

            const updatedIntegrations = currentIntegrations.filter(m => m !== marketplace);
            const userDocRef = doc(db, 'sellers', userId);

            await updateDoc(userDocRef, {
                marketplaceIntegrations: updatedIntegrations,
                updatedAt: new Date().toISOString()
            });

            return res.status(200).json({
                success: true,
                message: `${marketplace} disconnected`,
                integrations: updatedIntegrations
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Integration API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
