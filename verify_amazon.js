const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

async function verifyAmazonConnection() {
    console.log('🔄 Verifying Amazon SP-API Connection...');
    console.log('Client ID:', process.env.AMAZON_CLIENT_ID ? 'Loaded ✅' : 'Missing ❌');
    console.log('Refresh Token:', process.env.AMAZON_REFRESH_TOKEN ? 'Loaded ✅' : 'Missing ❌');

    try {
        const response = await axios.post('https://api.amazon.com/auth/o2/token', querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: process.env.AMAZON_REFRESH_TOKEN,
            client_id: process.env.AMAZON_CLIENT_ID,
            client_secret: process.env.AMAZON_CLIENT_SECRET
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        console.log('\n✅ Connection Successful!');
        console.log('Access Token:', response.data.access_token.substring(0, 15) + '...');
        console.log('Expires In:', response.data.expires_in, 'seconds');

        return true;
    } catch (error) {
        console.error('\n❌ Connection Failed!');
        if (error.response) {
            console.error('Error Data:', error.response.data);
        } else {
            console.error('Error Message:', error.message);
        }
        return false;
    }
}

verifyAmazonConnection();
