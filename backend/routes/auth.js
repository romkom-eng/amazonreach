// ============================================
// Authentication Routes
// User signup, login, password management
// ============================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const validator = require('validator');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../database');
const alertSystem = require('../utils/alert');

const JWT_SECRET = process.env.JWT_SECRET || 'nextgate-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

// ========== Helper Functions ==========

function validatePassword(password) {
    const errors = [];

    if (password.length < 12) {
        errors.push('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return errors;
}

function generateJWT(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// ========== Routes ==========

// Sign up
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name, company_name } = req.body;

        // Validate email
        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Valid email is required'
            });
        }

        // Validate password
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Password does not meet requirements',
                details: passwordErrors
            });
        }

        // Create user
        const user = await db.createUser({
            email,
            password,
            name,
            company_name
        });

        // Create audit log
        await db.createAuditLog({
            user_id: user.id,
            action: 'USER_SIGNUP',
            details: { email },
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        // Create session
        req.session.user = user;

        // Generate JWT
        const token = generateJWT(user);

        res.json({
            success: true,
            message: 'Account created successfully',
            user,
            token
        });

    } catch (error) {
        console.error('Signup error:', error);

        if (error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: 'An account with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create account'
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await db.findUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check if account is locked
        if (user.account_locked) {
            // Trigger Alert
            await alertSystem.sendAlert('LOCKED_ACCOUNT_LOGIN_ATTEMPT', {
                user_id: user.id,
                email: user.email,
                ip: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'Account is locked due to multiple failed login attempts. Please contact support.'
            });
        }

        // Verify password
        const isValidPassword = await db.verifyPassword(password, user.password_hash);

        if (!isValidPassword) {
            // Increment failed attempts
            await db.incrementFailedLogins(user.id);

            // Create audit log
            await db.createAuditLog({
                user_id: user.id,
                action: 'LOGIN_FAILED',
                details: { reason: 'Invalid password' },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check password expiration
        if (db.isPasswordExpired(user)) {
            return res.status(403).json({
                success: false,
                error: 'Password has expired. Please reset your password.',
                password_expired: true
            });
        }

        // Check subscription status
        if (user.subscription_status !== 'active' && user.subscription_status !== 'trialing') {
            return res.status(403).json({
                success: false,
                error: 'Your subscription has expired. Please renew to access the dashboard.',
                subscription_expired: true
            });
        }

        // Reset failed attempts
        await db.resetFailedLogins(user.id);

        // Update last login
        await db.updateUser(user.id, {
            last_login: new Date(),
            ip_address: req.ip
        });

        // Create audit log
        await db.createAuditLog({
            user_id: user.id,
            action: 'LOGIN_SUCCESS',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        // Check MFA
        if (user.mfa_enabled) {
            req.session.temp_user_id = user.id;
            return res.json({
                success: true,
                mfa_required: true,
                message: 'MFA code required'
            });
        }

        // Create session
        const sanitizedUser = db.sanitizeUser(user);
        req.session.user = sanitizedUser;

        // Generate JWT
        const token = generateJWT(sanitizedUser);

        res.json({
            success: true,
            message: 'Login successful',
            user: sanitizedUser,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    const userId = req.session.user?.id;

    if (userId) {
        db.createAuditLog({
            user_id: userId,
            action: 'LOGOUT',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });
    }

    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Check authentication status
router.get('/status', (req, res) => {
    if (req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user,
            subscription: {
                plan: req.session.user.subscription_plan || 'free_trial',
                status: req.session.user.subscription_status || 'active',
                stripe_customer_id: req.session.user.stripe_customer_id || null
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Get current user profile
router.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
        success: true,
        user: req.session.user
    });
});

// ========== MFA Routes ==========

// MFA Setup - Generate Secret & QR Code
router.post('/mfa/setup', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const secret = speakeasy.generateSecret({
        name: `NextGate (${req.session.user.email})`
    });

    QRCode.toDataURL(secret.otpauth_url, async (err, data_url) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to generate QR code' });
        }

        // Temporarily save secret in session until verified
        req.session.mfa_temp_secret = secret.base32;

        res.json({
            success: true,
            secret: secret.base32,
            qr_code: data_url
        });
    });
});

// MFA Verify & Enable
router.post('/mfa/verify', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { token } = req.body;
    const tempSecret = req.session.mfa_temp_secret;

    if (!tempSecret) {
        return res.status(400).json({ error: 'MFA setup not initiated' });
    }

    const verified = speakeasy.totp.verify({
        secret: tempSecret,
        encoding: 'base32',
        token: token
    });

    if (verified) {
        const userId = req.session.user.id;

        // Update user: enable MFA and save secret
        // Note: In a real DB, encrypt this secret!
        db.updateUser(userId, {
            mfa_enabled: true,
            mfa_secret: tempSecret
        });

        // Update session user
        req.session.user.mfa_enabled = true;
        delete req.session.mfa_temp_secret;

        await db.createAuditLog({
            user_id: userId,
            action: 'MFA_ENABLED',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({ success: true, message: 'MFA enabled successfully' });
    } else {
        res.status(400).json({ success: false, error: 'Invalid token' });
    }
});

// Validate MFA during login (2nd step)
router.post('/mfa/validate', async (req, res) => {
    // Expecting temp session from 1st step of login
    if (!req.session.temp_user_id) {
        return res.status(401).json({ error: 'Login session expired' });
    }

    const { token } = req.body;
    const user = db.findUserById(req.session.temp_user_id);

    if (!user || !user.mfa_enabled) {
        return res.status(400).json({ error: 'MFA not valid for this user' });
    }

    const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: token
    });

    if (verified) {
        // Complete login
        const sanitizedUser = db.sanitizeUser(user);
        req.session.user = sanitizedUser;
        delete req.session.temp_user_id;

        // Generate JWT
        const token = generateJWT(sanitizedUser);

        // Audit log
        await db.createAuditLog({
            user_id: user.id,
            action: 'LOGIN_MFA_SUCCESS',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Login successful',
            user: sanitizedUser,
            token
        });
    } else {
        await db.createAuditLog({
            user_id: user.id,
            action: 'LOGIN_MFA_FAILED',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.status(401).json({ success: false, error: 'Invalid MFA token' });
    }
});

module.exports = router;
