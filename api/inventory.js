// API Endpoint: Get Inventory Data
// Path: /api/inventory.js
// Returns product inventory from Firestore

const { db } = require('../backend/firebase-config');
const { collection, getDocs, query, where } = require('firebase/firestore');

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
        // Get inventory from Firestore
        const inventoryRef = collection(db, 'inventory');
        const snapshot = await getDocs(inventoryRef);

        const products = [];
        let lowStockCount = 0;
        let outOfStockCount = 0;

        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            products.push(product);

            if (product.stock === 0) {
                outOfStockCount++;
            } else if (product.stock <= (product.lowStockThreshold || 10)) {
                lowStockCount++;
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                products,
                lowStockCount,
                outOfStockCount,
                totalProducts: products.length
            }
        });
    } catch (error) {
        console.error('Firestore error (inventory):', error);

        // Return empty data
        return res.status(200).json({
            success: true,
            data: {
                products: [],
                lowStockCount: 0,
                outOfStockCount: 0,
                totalProducts: 0
            }
        });
    }
};
