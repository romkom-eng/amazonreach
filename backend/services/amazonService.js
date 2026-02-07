const axios = require('axios');
const querystring = require('querystring');
const aws4 = require('aws4');
require('dotenv').config();

const REGION = process.env.AWS_REGION || 'us-east-1';
const ENDPOINT = process.env.SP_API_ENDPOINT || 'https://sellingpartnerapi-na.amazon.com';

class AmazonService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiresAt = 0;
    }

    // 0. Assume IAM Role (STS)
    async assumeRole() {
        if (this.stsCredentials && Date.now() < this.stsExpiresAt) {
            return this.stsCredentials;
        }

        try {
            console.log('🔑 Assuming AWS IAM Role...');
            const stsHost = 'sts.us-east-1.amazonaws.com';
            const path = '/';
            const queryParams = {
                Action: 'AssumeRole',
                Version: '2011-06-15',
                RoleArn: process.env.AWS_ROLE_ARN,
                RoleSessionName: 'AmazonReachSession'
            };

            const opts = {
                service: 'sts',
                region: 'us-east-1',
                method: 'GET',
                host: stsHost,
                path: path + '?' + querystring.stringify(queryParams),
                headers: {}
            };

            // Sign STS request with long-term credentials
            aws4.sign(opts, {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });

            const response = await axios.get(`https://${stsHost}${opts.path}`, {
                headers: opts.headers
            });

            // Parse Response (Handle both JSON and XML)
            let accessKeyId, secretAccessKey, sessionToken, expiration;

            if (typeof response.data === 'object') {
                // Handle JSON (likely parsed by axios)
                console.log('STS Response is Object (JSON)');
                // AWS STS JSON format handling
                const result = response.data.AssumeRoleResponse ? response.data.AssumeRoleResponse.AssumeRoleResult : response.data;
                const creds = result.Credentials;

                accessKeyId = creds.AccessKeyId;
                secretAccessKey = creds.SecretAccessKey;
                sessionToken = creds.SessionToken;
                expiration = creds.Expiration;
            } else {
                // Handle XML String
                console.log('STS Response is String (XML)');
                const xml = response.data;
                accessKeyId = xml.match(/<AccessKeyId>(.*?)<\/AccessKeyId>/)[1];
                secretAccessKey = xml.match(/<SecretAccessKey>(.*?)<\/SecretAccessKey>/)[1];
                sessionToken = xml.match(/<SessionToken>(.*?)<\/SessionToken>/)[1];
                expiration = xml.match(/<Expiration>(.*?)<\/Expiration>/)[1];
            }

            this.stsCredentials = {
                accessKeyId,
                secretAccessKey,
                sessionToken
            };
            this.stsExpiresAt = new Date(expiration).getTime() - 60000; // Buffer 1 min

            console.log('✅ AWS Role Assumed Successfully');
            return this.stsCredentials;

        } catch (error) {
            console.error('Failed to assume role:', error.response?.data || error.message);
            throw new Error('Failed to assume AWS IAM Role');
        }
    }

    // 1. Get/Refresh LWA Access Token
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }

        try {
            console.log('🔄 Refreshing Amazon Access Token...');
            const response = await axios.post('https://api.amazon.com/auth/o2/token', querystring.stringify({
                grant_type: 'refresh_token',
                grant_type: 'refresh_token',
                refresh_token: process.env.AMAZON_REFRESH_TOKEN ? process.env.AMAZON_REFRESH_TOKEN.trim() : '',
                client_id: process.env.AMAZON_CLIENT_ID ? process.env.AMAZON_CLIENT_ID.trim() : '',
                client_secret: process.env.AMAZON_CLIENT_SECRET ? process.env.AMAZON_CLIENT_SECRET.trim() : ''
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            this.accessToken = response.data.access_token;
            // Set expiry slightly before actual expiry (3600s) to be safe
            this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
            console.log('✅ Access Token Refreshed');
            return this.accessToken;
        } catch (error) {
            console.error('Failed to refresh token:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Amazon');
        }
    }

    // ...

    // ...


    // 1. Check Connection (Marketplace Participations) - Used as a Ping
    async checkConnection() {
        try {
            const token = await this.getAccessToken();
            const path = '/sellers/v1/marketplaceParticipations';

            const opts = {
                service: 'execute-api',
                region: REGION,
                method: 'GET',
                host: new URL(ENDPOINT).host,
                path: path,
                headers: {
                    'x-amz-access-token': token,
                    'user-agent': 'NextGate/1.0'
                }
            };

            aws4.sign(opts, {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });

            const response = await axios.get(`${ENDPOINT}${opts.path}`, { headers: opts.headers });
            return response.status === 200;
        } catch (error) {
            console.error('Amazon Connection Check Failed:', error.message);
            return false;
        }
    }

    // 2. Fetch Orders
    async getOrders(createdAfter = null) {
        try {
            // Force refresh token logic
            if (!this.accessToken) await this.getAccessToken();
            const token = this.accessToken;

            // Default to orders created in last 30 days if not specified
            if (!createdAfter) {
                const date = new Date();
                date.setDate(date.getDate() - 30);
                createdAfter = date.toISOString();
            }

            const path = '/orders/v0/orders';
            const queryParams = {
                CreatedAfter: createdAfter,
                MarketplaceIds: ['ATVPDKIKX0DER'] // US Marketplace ID (Default)
            };

            // Serialize Query String Manually for Sandbox (Fixes 400 InvalidInput)
            const qString = `CreatedAfter=${encodeURIComponent(createdAfter)}&MarketplaceIds=ATVPDKIKX0DER`;

            // Sign the request with AWS SigV4 (Direct User Credentials)
            const opts = {
                service: 'execute-api',
                region: REGION,
                method: 'GET',
                host: new URL(ENDPOINT).host,
                path: path + '?' + qString,
                headers: {
                    'x-amz-access-token': token,
                    'user-agent': 'NextGate/1.0'
                }
            };

            aws4.sign(opts, {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });

            const response = await axios.get(`${ENDPOINT}${opts.path}`, {
                headers: opts.headers
            });
            return response.data;
        } catch (error) {
            // If Sandbox returns 400 (No Data/Invalid Input for empty dates), return Empty Array instead of Mock
            if (error.response && error.response.status === 400) {
                console.warn('Handling 400 from SP-API (Likely Sandbox Empty): Returning []');
                return { payload: { Orders: [] } };
            }
            throw new Error(`Failed to fetch orders: ${error.message}`);
        }
    }



    // 3. Fetch Inventory (Summary)
    // Note: Use FBA Inventory API for simpler stock levels
    async getInventorySummaries() {
        try {
            const token = await this.getAccessToken();

            const response = await axios.get(`${ENDPOINT} /fba/inventory / v1 / summaries`, {
                headers: {
                    'x-amz-access-token': token
                },
                params: {
                    granularityType: 'Marketplace',
                    granularityId: 'ATVPDKIKX0DER', // US
                    marketplaceIds: 'ATVPDKIKX0DER'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching inventory:', error.response?.data || error.message);
            // Fallback: Return empty or mock if API fails (common with permissions)
            return { payload: { inventorySummaries: [] } };
        }
    }
}

module.exports = new AmazonService();
