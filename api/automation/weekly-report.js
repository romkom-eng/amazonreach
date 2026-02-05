// API Endpoint: Weekly Report Automation
// Path: /api/automation/weekly-report.js
// Runs every Monday 9AM via Vercel Cron

const { db } = require('../../backend/firebase-config');
const { collection, getDocs, query, where, orderBy } = require('firebase/firestore');
const gemini = require('../../backend/services/gemini');
const email = require('../../backend/services/email');
const sheets = require('../../backend/services/sheets');
const slack = require('../../backend/services/slack');

const SHEET_ID = process.env.HELIUM10_SHEET_ID || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@amazonreach.com';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('📊 Generating weekly report...');

        // Calculate date range (last 7 days)
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Get orders from last week
        const ordersRef = collection(db, 'orders');
        const ordersQuery = query(
            ordersRef,
            where('createdAt', '>=', sevenDaysAgo.toISOString()),
            where('createdAt', '<=', today.toISOString())
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        // Calculate metrics
        let totalRevenue = 0;
        let totalOrders = 0;
        const productSales = {};

        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            totalRevenue += order.amount || 0;
            totalOrders++;

            const product = order.productName || 'Unknown';
            productSales[product] = (productSales[product] || 0) + (order.amount || 0);
        });

        // Find top product
        let topProduct = 'None';
        let maxSales = 0;
        for (const [product, sales] of Object.entries(productSales)) {
            if (sales > maxSales) {
                maxSales = sales;
                topProduct = product;
            }
        }

        // TODO: Calculate ROAS (would need ad spend data)
        const roas = 3.2; // Mock value

        // Generate AI insights
        const aiInsights = await gemini.generateReportSummary({
            totalRevenue,
            totalOrders,
            avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            topProduct,
            period: `${sevenDaysAgo.toDateString()} - ${today.toDateString()}`
        });

        const reportData = {
            period: `${sevenDaysAgo.toDateString()} - ${today.toDateString()}`,
            revenue: totalRevenue,
            orders: totalOrders,
            roas,
            topProduct,
            aiInsights,
            trend: 15 // Mock: +15%
        };

        // Update Google Sheets
        if (SHEET_ID) {
            try {
                await sheets.updateWeeklyReport(SHEET_ID, reportData);
                console.log('✅ Google Sheets updated');
            } catch (error) {
                console.error('Sheets update failed:', error);
            }
        }

        // Send to Slack
        try {
            await slack.sendWeeklyReport(reportData);
            console.log('✅ Slack notification sent');
        } catch (error) {
            console.error('Slack send failed:', error);
        }

        // Send email report
        try {
            await email.sendWeeklyReport(ADMIN_EMAIL, reportData);
            console.log('✅ Email report sent');
        } catch (error) {
            console.error('Email send failed:', error);
        }

        return res.status(200).json({
            success: true,
            message: 'Weekly report generated and distributed',
            report: reportData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Weekly report error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
};
