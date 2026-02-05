// ============================================
// Vercel Serverless Function: /api/auth/status
// Check authentication status
// ============================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nextgate-jwt-secret-change-in-production';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                error: 'No authorization header'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                error: 'No token provided'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);

        return res.status(200).json({
            success: true,
            authenticated: true,
            user: {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            }
        });

    } catch (error) {
        console.error('Status check error:', error);
        return res.status(401).json({
            success: false,
            authenticated: false,
            error: 'Invalid or expired token'
        });
    }
};
