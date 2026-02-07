require('dotenv').config();
const axios = require('axios');
const querystring = require('querystring');

async function testToken() {
    console.log('Testing Amazon LWA Token Exchange...');
    console.log('Client ID:', process.env.AMAZON_CLIENT_ID ? 'Exists' : 'Missing');
    console.log('Client Secret:', process.env.AMAZON_CLIENT_SECRET ? 'Exists' : 'Missing');
    console.log('Refresh Token:', process.env.AMAZON_REFRESH_TOKEN ? 'Exists' : 'Missing');

    try {
        const response = await axios.post('https://api.amazon.com/auth/o2/token', querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: process.env.AMAZON_REFRESH_TOKEN,
            client_id: process.env.AMAZON_CLIENT_ID,
            client_secret: process.env.AMAZON_CLIENT_SECRET
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        console.log('✅ Token Exchange SUCCESS!');
        console.log('Access Token:', response.data.access_token.substring(0, 15) + '...');
        console.log('Expires In:', response.data.expires_in);
    } catch (error) {
        console.error('❌ Token Exchange FAILED');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testToken();
