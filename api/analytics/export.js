// API Endpoint: Export Analytics Data (Professional+ only)
// Path: /api/analytics/export.js

const { db } = require('../../backend/firebase-config');
const { collection, getDocs, query, where } = require('firebase/firestore');
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

        // Only Professional+ can export
        if (userPlan === 'starter') {
            return res.status(403).json({
                success: false,
                error: 'Upgrade required',
                message: 'Data export requires Professional plan or higher',
                currentPlan: userPlan,
                requiredPlan: 'professional'
            });
        }

        const { format = 'csv', type = 'sales' } = req.query;

        // Fetch data based on type
        let data = [];

        if (type === 'sales') {
            const ordersRef = collection(db, 'orders');
            const ordersSnapshot = await getDocs(ordersRef);

            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                data.push({
                    orderNumber: order.orderNumber || doc.id,
                    date: order.date || order.createdAt,
                    amount: order.amount || 0,
                    status: order.status || 'N/A'
                });
            });
        } else if (type === 'inventory') {
            const inventoryRef = collection(db, 'inventory');
            const inventorySnapshot = await getDocs(inventoryRef);

            inventorySnapshot.forEach(doc => {
                const item = doc.data();
                data.push({
                    sku: item.sku || 'N/A',
                    name: item.name || 'N/A',
                    stock: item.stock || 0,
                    lowStockThreshold: item.lowStockThreshold || 0
                });
            });
        }

        // Generate CSV
        if (format === 'csv') {
            if (data.length === 0) {
                return res.status(200).send('No data available');
            }

            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row =>
                Object.values(row).map(val => `"${val}"`).join(',')
            );

            const csv = [headers, ...rows].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`);
            return res.status(200).send(csv);
        }

        // Return JSON
        return res.status(200).json({
            success: true,
            format,
            type,
            count: data.length,
            data
        });

    } catch (error) {
        console.error('Export error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
