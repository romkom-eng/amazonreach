// API Endpoint: Get Orders List
// Path: /api/orders.js
// Returns list of recent orders from Firestore

const { db } = require('../backend/firebase-config');
const { collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

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
        const limitParam = parseInt(req.query.limit) || 50;

        // Get orders from Firestore
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(limitParam));
        const snapshot = await getDocs(q);

        const orders = [];
        snapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return res.status(200).json({
            success: true,
            data: {
                orders,
                count: orders.length
            }
        });
    } catch (error) {
        console.error('Firestore error (orders):', error);

        // Return empty data
        return res.status(200).json({
            success: true,
            data: {
                orders: [],
                count: 0
            }
        });
    }
};
