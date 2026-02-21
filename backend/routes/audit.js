const express = require('express');
const router = express.Router();
const db = require('../database');
const { generateAuditReport } = require('../services/gemini');
require('dotenv').config();

// Authentication middleware (reusing from server.js logic)
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Admin access required' });
    }
};

/**
 * @route POST /api/audit/request
 * @desc Public endpoint for users to request an audit
 */
router.post('/request', async (req, res) => {
    try {
        const { name, email, asin, keyword, monthly_sales } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, error: 'Name and email are required' });
        }

        const audit = await db.createAuditRequest({
            name,
            email,
            asin,
            keyword,
            monthly_sales
        });

        res.json({ success: true, auditId: audit.id });
    } catch (error) {
        console.error('Audit request error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit audit request' });
    }
});

/**
 * @route GET /api/audit/all
 * @desc Admin endpoint to list all audit requests
 */
router.get('/all', isAdmin, async (req, res) => {
    try {
        const audits = await db.getAuditRequests();
        res.json({ success: true, audits });
    } catch (error) {
        console.error('Fetch audits error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch audits' });
    }
});

/**
 * @route GET /api/audit/:id
 * @desc Public endpoint to view a specific audit report
 */
router.get('/:id', async (req, res) => {
    try {
        const audit = await db.getAuditById(req.params.id);
        if (!audit) {
            return res.status(404).json({ success: false, error: 'Audit not found' });
        }
        res.json({ success: true, audit });
    } catch (error) {
        console.error('Get audit error:', error);
        res.status(500).json({ success: false, error: 'Failed' });
    }
});

/**
 * @route POST /api/audit/generate
 * @desc Admin endpoint to provide Helium10 data and generate AI report
 */
router.post('/generate', isAdmin, async (req, res) => {
    try {
        const { auditId, helium10Data } = req.body;

        if (!auditId || !helium10Data) {
            return res.status(400).json({ success: false, error: 'Audit ID and Helium10 data are required' });
        }

        const audit = await db.getAuditById(auditId);
        if (!audit) {
            return res.status(404).json({ success: false, error: 'Audit request not found' });
        }

        // Generate the report using Gemini AI
        const reportHtml = await generateAuditReport(audit, helium10Data);

        // Update database with report
        await db.updateAuditReport(auditId, {
            status: 'completed',
            helium10_data: helium10Data,
            report_html: reportHtml
        });

        res.json({ success: true, reportHtml });
    } catch (error) {
        console.error('Generate audit error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate report' });
    }
});

module.exports = router;
