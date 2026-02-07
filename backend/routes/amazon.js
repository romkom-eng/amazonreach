const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');

// Environment variables
const CLIENT_ID = process.env.AMAZON_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
const REDIRECT_URI = process.env.BASE_URL + '/api/amazon/callback';

// 0. Check Connection Status
router.get('/status', (req, res) => {
    const isConnected = !!process.env.AMAZON_REFRESH_TOKEN;
    res.json({
        connected: isConnected,
        merchantId: 'A36...' // Mock or extract from DB in real implementation
    });
});

// 0. Check Connection Status
router.get('/status', (req, res) => {
    const isConnected = !!process.env.AMAZON_REFRESH_TOKEN;
    res.json({
        connected: isConnected,
        merchantId: 'A36...'
    });
});

// 1. Generate Login with Amazon (LWA) Authorization URL
router.get('/auth', (req, res) => {
    const appId = process.env.AMAZON_APP_ID;

    // For Draft/Sandbox SP-API apps, we must use the Seller Central "Authorize" endpoint.
    // LWA endpoint (amazon.com/ap/oa) does not support SP-API scopes for draft apps.
    // URL format: https://sellercentral.amazon.com/apps/authorize/consent?application_id={appId}&state={state}&version=beta

    const params = {
        application_id: appId,
        state: 'random_state_string', // Should use a secure random string in production
        version: 'beta', // REQUIRED for Draft apps
        redirect_uri: REDIRECT_URI // Optional but good practice
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

    try {
        // Exchange code for LWA Access Token & Refresh Token
        const tokenResponse = await axios.post('https://api.amazon.com/auth/o2/token', querystring.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // In a real app, save these tokens securely to the database linked to the user
        console.log('Amazon Connection Successful!');
        console.log('Access Token:', access_token.substring(0, 10) + '...');
        console.log('Refresh Token:', refresh_token.substring(0, 10) + '...');

        // If we received selling_partner_id (Merchant ID), save it too
        if (selling_partner_id) {
            console.log('Selling Partner ID:', selling_partner_id);
        }

        // Redirect back to dashboard settings with success
        res.redirect('/dashboard/settings.html?amazon_connected=true');

    } catch (error) {
        console.error('Amazon OAuth Error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed: ' + JSON.stringify(error.response?.data));
    }
});

module.exports = router;
