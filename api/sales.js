// API Endpoint: Get Sales Data
// Path: /api/sales.js
// Returns aggregated sales metrics from Firestore orders

const { db } = require('../backend/firebase-config');
const { collection, getDocs, query, where } = require('firebase/firestore');
const { getPlanLimits } = require('../backend/middleware/planAccess');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'amazonreach-jwt-secret-2026';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify JWT and get user plan
        const authHeader = req.headers.authorization;
        let userPlan = 'starter'; // default

        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = jwt.verify(token, JWT_SECRET);

                // Get user's plan from Firestore
                const sellersRef = collection(db, 'sellers');
                const userQuery = query(sellersRef, where('email', '==', decoded.email));
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    userPlan = userSnapshot.docs[0].data().plan || 'starter';
                }
            } catch (err) {
                console.log('Token verification failed, using starter plan');
            }
        }

        const planLimits = getPlanLimits(userPlan);
        // Get orders from Firestore
        const ordersRef = collection(db, 'orders');
        const snapshot = await getDocs(ordersRef);

        let totalRevenue = 0;
        let totalOrders = 0;
        let revenueTrend = [];

        const orders = [];
        snapshot.forEach(doc => {
            const order = doc.data();
            orders.push(order);
            totalRevenue += order.amount || 0;
            totalOrders++;
        });

        // Calculate metrics
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const netProfit = totalRevenue * 0.3; // Assume 30% profit margin
        const profitMargin = 30;

        // Generate trend data (last 7 days)
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const dayRevenue = orders
                .filter(o => {
                    const orderDate = new Date(o.createdAt || o.date);
                    return orderDate.toDateString() === date.toDateString();
                })
                .reduce((sum, o) => sum + (o.amount || 0), 0);

            revenueTrend.push({
                date: date.toISOString(),
                revenue: dayRevenue
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                netProfit,
                profitMargin,
                totalOrders,
                averageOrderValue,
                revenueTrend,
                amazonFees: (totalRevenue * 0.15).toFixed(2),
                shippingCosts: (totalRevenue * 0.10).toFixed(2),
                marketingCosts: (totalRevenue * 0.05).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Firestore error (sales):', error);

        // Return mock data if Firestore is not set up
        return res.status(200).json({
            success: true,
            data: {
                totalRevenue: 0,
                netProfit: 0,
                profitMargin: 0,
                totalOrders: 0,
                averageOrderValue: 0,
                revenueTrend: [],
                amazonFees: "0.00",
                shippingCosts: "0.00",
                marketingCosts: "0.00"
            }
        });
    }
};
