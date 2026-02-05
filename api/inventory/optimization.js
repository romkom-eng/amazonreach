// API Endpoint: AI Inventory Optimization (Professional+ only)
// Path: /api/inventory/optimization.js

const { db } = require('../../backend/firebase-config');
const { collection, getDocs, query, where, orderBy, updateDoc, doc } = require('firebase/firestore');
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

        // Check user plan
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

        // Only Professional+ can use AI optimization
        if (userPlan === 'starter') {
            return res.status(403).json({
                success: false,
                error: 'Upgrade required',
                message: 'AI inventory optimization requires Professional plan or higher',
                currentPlan: userPlan,
                requiredPlan: 'professional'
            });
        }

        if (req.method === 'GET') {
            // Get AI optimization recommendations
            const inventoryRef = collection(db, 'inventory');
            const inventorySnapshot = await getDocs(inventoryRef);

            // Fetch recent order history (last 30 days)
            const ordersRef = collection(db, 'orders');
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const ordersQuery = query(
                ordersRef,
                where('createdAt', '>=', thirtyDaysAgo.toISOString())
            );
            const ordersSnapshot = await getDocs(ordersQuery);

            // Calculate sales velocity for each product
            const salesVelocity = {};
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                const productId = order.productId || 'unknown';
                salesVelocity[productId] = (salesVelocity[productId] || 0) + 1;
            });

            // Generate recommendations
            const recommendations = [];

            inventorySnapshot.forEach(doc => {
                const item = doc.data();
                const productId = doc.id;
                const currentStock = item.stock || 0;
                const velocity = salesVelocity[productId] || 0;
                const avgDailySales = velocity / 30;

                // Calculate days of stock remaining
                const daysRemaining = avgDailySales > 0 ? currentStock / avgDailySales : 999;

                // AI recommendation logic
                let recommendation = {
                    productId,
                    sku: item.sku,
                    name: item.name,
                    currentStock,
                    avgDailySales: Math.round(avgDailySales * 100) / 100,
                    daysRemaining: Math.round(daysRemaining),
                    action: 'maintain',
                    suggestedReorder: 0,
                    priority: 'low'
                };

                if (daysRemaining < 7) {
                    recommendation.action = 'reorder_urgent';
                    recommendation.suggestedReorder = Math.ceil(avgDailySales * 30); // 30 days supply
                    recommendation.priority = 'high';
                } else if (daysRemaining < 14) {
                    recommendation.action = 'reorder_soon';
                    recommendation.suggestedReorder = Math.ceil(avgDailySales * 30);
                    recommendation.priority = 'medium';
                } else if (daysRemaining > 90 && velocity > 0) {
                    recommendation.action = 'overstock';
                    recommendation.priority = 'low';
                }

                recommendations.push(recommendation);
            });

            // Sort by priority
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

            return res.status(200).json({
                success: true,
                recommendations,
                summary: {
                    total: recommendations.length,
                    urgentReorders: recommendations.filter(r => r.action === 'reorder_urgent').length,
                    upcomingReorders: recommendations.filter(r => r.action === 'reorder_soon').length,
                    overstocked: recommendations.filter(r => r.action === 'overstock').length
                }
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('AI optimization error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
