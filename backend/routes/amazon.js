const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');

// Environment variables
const CLIENT_ID = process.env.AMAZON_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;

// Dynamic REDIRECT_URI helper
const getRedirectUri = (req) => {
    // If running on localhost, use the actual host from the request
    // This handles different ports like 3000, 3006, etc.
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
        const protocol = req.protocol;
        const host = req.get('host'); // includes port
        return `${protocol}://${host}/api/amazon/callback`;
    }
    // Otherwise use BASE_URL from env or fallback
    return (process.env.BASE_URL || 'https://amazonreach-production.up.railway.app') + '/api/amazon/callback';
};

const db = require('../database');

// 0. Check Connection Status
router.get('/status', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json({ connected: false });
        }
        const user = await db.findUserById(req.session.user.id);
        const isConnected = !!(user && user.amazon_refresh_token);
        res.json({
            connected: isConnected,
            merchantId: user ? user.amazon_merchant_id : null
        });
    } catch (error) {
        console.error('Status Check Error:', error);
        res.status(500).json({ connected: false, error: 'Failed to check status' });
    }
});

// 1. Generate Login with Amazon (LWA) Authorization URL
router.get('/auth', (req, res) => {
    const appId = process.env.AMAZON_APP_ID;

    // For Draft/Sandbox SP-API apps, we must use the Seller Central "Authorize" endpoint.
    // LWA endpoint (amazon.com/ap/oa) does not support SP-API scopes for draft apps.
    // URL format: https://sellercentral.amazon.com/apps/authorize/consent?application_id={appId}&state={state}&version=beta

    application_id: appId,
        state: 'random_state_string', // Should use a secure random string in production
            version: 'beta', // REQUIRED for Draft apps
                redirect_uri: getRedirectUri(req) // Dynamic based on current host
};

const authUrl = 'https://sellercentral.amazon.com/apps/authorize/consent?' + querystring.stringify(params);

console.log('Redirecting to Seller Central Auth:', authUrl);
res.json({ url: authUrl });
});

// 2. OAuth Callback
router.get('/callback', async (req, res) => {
    const { code, state, selling_partner_id, mws_auth_token } = req.query;

    if (!code) {
        return res.status(400).send('Error: Authorization code missing');
    }

    if (!req.session.user) {
        return res.status(401).send('Error: User must be logged in');
    }

    try {
        // Exchange code for LWA Access Token & Refresh Token
        const tokenResponse = await axios.post('https://api.amazon.com/auth/o2/token', querystring.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: getRedirectUri(req),
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Save tokens securely to the database linked to the user
        await db.updateAmazonCredentials(req.session.user.id, {
            refresh_token: refresh_token,
            merchant_id: selling_partner_id
        });

        console.log('Amazon Connection Successful for user:', req.session.user.email);

        // Redirect back to dashboard settings with success
        // Use FRONTEND_URL if available (e.g., https://amazonreach.pages.dev)
        const frontendUrl = process.env.FRONTEND_URL || '';
        res.redirect(`${frontendUrl}/dashboard/settings.html?amazon_connected=true`);

    } catch (error) {
        console.error('Amazon OAuth Error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed: ' + JSON.stringify(error.response?.data));
    }
});

module.exports = router;
