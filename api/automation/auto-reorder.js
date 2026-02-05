// API Endpoint: Auto-Reorder System
// Path: /api/automation/auto-reorder.js
// Runs daily via Vercel Cron to check inventory and automatically reorder

const { db } = require('../../backend/firebase-config');
const { collection, getDocs, query, where } = require('firebase/firestore');
const gemini = require('../../backend/services/gemini');
const email = require('../../backend/services/email');
const slack = require('../../backend/services/slack');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('🔄 Auto-reorder system started...');

        // Get all inventory items
        const inventoryRef = collection(db, 'inventory');
        const inventorySnapshot = await getDocs(inventoryRef);

        if (inventorySnapshot.empty) {
            return res.status(200).json({
                success: true,
                message: 'No inventory items found',
                reorders: []
            });
        }

        // Get sales history (last 30 days)
        const ordersRef = collection(db, 'orders');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const ordersQuery = query(
            ordersRef,
            where('createdAt', '>=', thirtyDaysAgo.toISOString())
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        // Calculate sales velocity per product
        const salesVelocity = {};
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const productId = order.productId || 'unknown';
            salesVelocity[productId] = (salesVelocity[productId] || 0) + (order.quantity || 1);
        });

        // Check each item for potential stockout
        const reorders = [];

        for (const doc of inventorySnapshot.docs) {
            const item = doc.data();
            const productId = doc.id;
            const currentStock = item.stock || 0;
            const sold = salesVelocity[productId] || 0;
            const avgDailySales = sold / 30;

            // Calculate days remaining
            const daysRemaining = avgDailySales > 0 ? currentStock / avgDailySales : 999;

            // If stockout predicted within 7 days → reorder
            if (daysRemaining < 7 && daysRemaining > 0) {
                const reorderQuantity = Math.ceil(avgDailySales * 30); // 30 days supply

                // Check if supplier email exists
                if (item.supplierEmail) {
                    // Send purchase order email
                    const emailResult = await email.sendPurchaseOrder(
                        item.supplierEmail,
                        {
                            name: item.name || 'Unknown Product',
                            sku: item.sku || productId
                        },
                        reorderQuantity,
                        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toDateString() // 14 days from now
                    );

                    // Send Slack notification
                    await slack.sendReorderAlert(
                        {
                            name: item.name || 'Unknown Product',
                            sku: item.sku || productId
                        },
                        reorderQuantity,
                        item.supplierEmail
                    );

                    reorders.push({
                        productId,
                        productName: item.name,
                        currentStock,
                        daysRemaining: Math.round(daysRemaining),
                        reorderQuantity,
                        supplierEmail: item.supplierEmail,
                        emailSent: emailResult.success
                    });

                    console.log(`✅ Reorder sent for ${item.name}`);
                } else {
                    console.log(`⚠️  No supplier for ${item.name}`);
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: `Auto-reorder check complete. ${reorders.length} reorder(s) triggered.`,
            reorders,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Auto-reorder error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
};
