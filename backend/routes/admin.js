
const express = require('express');
const router = express.Router();
const db = require('../database');
const authorize = require('../middleware/rbac');

// All routes in this file require 'admin' role
router.use(authorize(['admin']));

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Admin API Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

// Lock user account
router.post('/users/:id/lock', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await db.findUserById(userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Prevent locking self
        if (userId === req.session.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot lock your own account' });
        }

        await db.updateUser(userId, { account_locked: true });

        await db.createAuditLog({
            user_id: req.session.user.id,
            action: 'ADMIN_LOCK_USER',
            details: { target_user_id: userId, target_email: user.email },
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({ success: true, message: 'User account locked' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to lock user' });
    }
});

// Unlock user account
router.post('/users/:id/unlock', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        await db.updateUser(userId, {
            account_locked: false,
            failed_login_attempts: 0
        });

        await db.createAuditLog({
            user_id: req.session.user.id,
            action: 'ADMIN_UNLOCK_USER',
            details: { target_user_id: userId },
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({ success: true, message: 'User account unlocked' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to unlock user' });
    }
});

// Get Audit Logs
router.get('/audit-logs', async (req, res) => {
    try {
        const logs = await db.getAuditLogs(null, 100); // Get last 100 logs
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch logs' });
    }
});

module.exports = router;
