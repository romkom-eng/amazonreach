require('dotenv').config();
const axios = require('axios');
const aws4 = require('aws4');
const querystring = require('querystring');
// const xml2js = require('xml2js'); // Removed dependency

const ENDPOINT = process.env.SP_API_ENDPOINT;
const REGION = process.env.AWS_REGION;

async function run() {
    console.log('🚀 Starting SP-API Debug Script...');

    // 1. Get LWA Token
    console.log('1️⃣ Fetching LWA Token...');
    let lwaToken;
    try {
        const tokenRes = await axios.post('https://api.amazon.com/auth/o2/token', querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: process.env.AMAZON_REFRESH_TOKEN.trim(), // Sanitize
            client_id: process.env.AMAZON_CLIENT_ID.trim(),
            client_secret: process.env.AMAZON_CLIENT_SECRET.trim()
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        lwaToken = tokenRes.data.access_token;
        console.log('✅ LWA Token Retrieved');
        console.log(`🔑 Access Token: ${lwaToken.substring(0, 10)}...${lwaToken.substring(lwaToken.length - 10)} (Length: ${lwaToken.length})`);
    } catch (err) {
        console.error('❌ LWA Token Failed:', err.response?.data || err.message);
        return;
    }

    // 2. Assume Role - SKIPPED (Testing Direct User Access)
    console.log('2️⃣ Skipping AssumeRole (Testing Direct User Identity)...');
    const creds = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: undefined // No session token for long-term user keys
    };

    // 3. Call SP-API (Orders - Testing Sandbox)
    // 3. Call SP-API (MarketplaceParticipations - Testing Sandbox)
    console.log('3️⃣ Calling SP-API (MarketplaceParticipations)...');
    try {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        const createdAfter = date.toISOString();


        const path = '/sellers/v1/marketplaceParticipations';

        // TEST SANDBOX ENDPOINT
        const SANDBOX_ENDPOINT = 'https://sandbox.sellingpartnerapi-na.amazon.com';
        const host = new URL(SANDBOX_ENDPOINT).host;
        console.log('🌐 Testing SANDBOX Endpoint:', SANDBOX_ENDPOINT);
        console.log('🌍 Region:', REGION);


        const opts = {
            service: 'execute-api',
            region: REGION,
            method: 'GET',
            host: host,
            path: path,
            headers: {
                'x-amz-access-token': lwaToken,
                'user-agent': 'NextGate/DebugScript'
            }
        };

        // SIGNING
        console.log('📝 Signing request...');
        aws4.sign(opts, {
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
            sessionToken: creds.sessionToken
        });

        console.log('📤 Sending Request to:', `${ENDPOINT}${opts.path}`);
        console.log('📋 Headers:', JSON.stringify(opts.headers, null, 2));

        const res = await axios.get(`${ENDPOINT}${opts.path}`, { headers: opts.headers });
        console.log('✅ SP-API Success! Status:', res.status);
        console.log('📦 Orders Count:', res.data.payload?.Orders?.length);
    } catch (err) {
        console.error('❌ SP-API Failed');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
            console.error('Headers:', JSON.stringify(err.response.headers, null, 2));
        } else {
            console.error('Error:', err.message);
        }
    }
}

run();
