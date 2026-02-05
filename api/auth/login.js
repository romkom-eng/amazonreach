// ============================================
// Vercel Serverless Function: /api/auth/login
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nextgate-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

// In-memory user database (demo)
const users = [
    {
        id: 1,
        email: 'admin@nextgate.com',
        password_hash: '$2a$10$dZN.sCCn9ofbaFHbrCssWOK/H6.FEvg2miBd.kbbYkOOwKv0FcE.e',
        name: 'NextGate Admin',
        role: 'admin',
        subscription_status: 'active',
        subscription_plan: 'enterprise'
    }
];

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        console.log('Login attempt for:', email);

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find user
        const user = users.find(u => u.email === email);

        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            console.log('Invalid password for:', email);
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Generate JWT
        const sanitizedUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            subscription_status: user.subscription_status,
            subscription_plan: user.subscription_plan
        };

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log('Login successful for:', email);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: sanitizedUser,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
