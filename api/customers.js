// API Endpoint: Get Customers/Sellers List
// Path: /api/customers.js
// Returns list of all sellers from Firestore

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
        // Get sellers from Firestore
        const sellersRef = collection(db, 'sellers');
        const q = query(sellersRef, orderBy('createdAt', 'desc'), limit(100));
        const snapshot = await getDocs(q);

        const sellers = [];
        snapshot.forEach(doc => {
            sellers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return res.status(200).json({
            success: true,
            data: {
                sellers,
                count: sellers.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Firestore error (customers):', error);

        // Return empty data if Firestore is not yet set up
        return res.status(200).json({
            success: true,
            data: {
                sellers: [],
                count: 0,
                message: 'No customers yet. Add customers in Firestore.'
            }
        });
    }
};
