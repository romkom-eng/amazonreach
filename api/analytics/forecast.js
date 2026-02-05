// API Endpoint: Revenue Forecasting (Professional+ only)
// Path: /api/analytics/forecast.js

const { db } = require('../../backend/firebase-config');
const { collection, getDocs, query, where, orderBy } = require('firebase/firestore');
const { requireFeature } = require('../../backend/middleware/planAccess');
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

        // Check if user has forecasting feature
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

        // Only Professional+ can access forecasting
        if (userPlan === 'starter') {
            return res.status(403).json({
                success: false,
                error: 'Upgrade required',
                message: 'Revenue forecasting requires Professional plan or higher',
                currentPlan: userPlan,
                requiredPlan: 'professional',
                upgradeUrl: '/pricing'
            });
        }

        // Fetch historical orders (last 90 days)
        const ordersRef = collection(db, 'orders');
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const ordersQuery = query(
            ordersRef,
            where('createdAt', '>=', ninetyDaysAgo.toISOString()),
            orderBy('createdAt', 'asc')
        );

        const ordersSnapshot = await getDocs(ordersQuery);

        // Simple linear regression forecasting
        const dailyRevenue = {};

        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const date = order.date || order.createdAt.split('T')[0];

            if (!dailyRevenue[date]) {
                dailyRevenue[date] = 0;
            }
            dailyRevenue[date] += order.amount || 0;
        });

        // Calculate trend (simple moving average)
        const dates = Object.keys(dailyRevenue).sort();
        const revenues = dates.map(d => dailyRevenue[d]);

        // Calculate average growth rate
        let totalGrowth = 0;
        for (let i = 1; i < revenues.length; i++) {
            if (revenues[i - 1] > 0) {
                totalGrowth += (revenues[i] - revenues[i - 1]) / revenues[i - 1];
            }
        }
        const avgGrowthRate = revenues.length > 1 ? totalGrowth / (revenues.length - 1) : 0;

        // Forecast next 30 days
        const lastRevenue = revenues.length > 0 ? revenues[revenues.length - 1] : 0;
        const forecast = [];

        for (let i = 1; i <= 30; i++) {
            const forecastDate = new Date();
            forecastDate.setDate(forecastDate.getDate() + i);

            const forecastRevenue = lastRevenue * Math.pow(1 + avgGrowthRate, i);

            forecast.push({
                date: forecastDate.toISOString().split('T')[0],
                predictedRevenue: Math.max(0, Math.round(forecastRevenue * 100) / 100),
                confidence: Math.max(0, 1 - (i * 0.02)) // Confidence decreases over time
            });
        }

        // Calculate monthly forecast
        const monthlyForecast = forecast.reduce((sum, day) => sum + day.predictedRevenue, 0);

        return res.status(200).json({
            success: true,
            forecast: {
                daily: forecast,
                monthly: {
                    total: Math.round(monthlyForecast * 100) / 100,
                    growthRate: Math.round(avgGrowthRate * 10000) / 100, // percentage
                    confidence: 0.85
                },
                historical: {
                    dates: dates.slice(-30), // Last 30 days
                    revenues: revenues.slice(-30)
                }
            }
        });

    } catch (error) {
        console.error('Forecast error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
