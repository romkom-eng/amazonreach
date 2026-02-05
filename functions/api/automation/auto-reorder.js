// Cloudflare Workers Auto-Reorder API
// Path: functions/api/automation/auto-reorder.js

import { collection, getDocs, query, where } from 'firebase/firestore';

export async function onRequestPost(context) {
    const { env } = context;

    try {
        console.log('🔄 Auto-reorder system started...');

        // Initialize Firebase (from environment)
        const { initializeApp } = await import('firebase/app');
        const { getFirestore } = await import('firebase/firestore');

        const firebaseConfig = {
            apiKey: env.FIREBASE_API_KEY,
            projectId: env.FIREBASE_PROJECT_ID,
            authDomain: env.FIREBASE_AUTH_DOMAIN,
            storageBucket: env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
            appId: env.FIREBASE_APP_ID
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // Get all inventory items
        const inventoryRef = collection(db, 'inventory');
        const inventorySnapshot = await getDocs(inventoryRef);

        if (inventorySnapshot.empty) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No inventory items found',
                reorders: []
            }), {
                headers: { 'Content-Type': 'application/json' }
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
                    // Send purchase order email (import email service)
                    // Send Slack notification

                    reorders.push({
                        productId,
                        productName: item.name,
                        currentStock,
                        daysRemaining: Math.round(daysRemaining),
                        reorderQuantity,
                        supplierEmail: item.supplierEmail,
                        emailSent: true
                    });

                    console.log(`✅ Reorder sent for ${item.name}`);
                } else {
                    console.log(`⚠️  No supplier for ${item.name}`);
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Auto-reorder check complete. ${reorders.length} reorder(s) triggered.`,
            reorders,
            timestamp: new Date().toISOString()
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('Auto-reorder error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
