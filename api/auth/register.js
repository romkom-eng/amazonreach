// API Endpoint: User Registration
// Path: /api/auth/register.js
// Creates new user account and adds to Firestore sellers collection

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../../backend/firebase-config');
const { collection, addDoc, query, where, getDocs } = require('firebase/firestore');

const JWT_SECRET = process.env.JWT_SECRET || 'nextgate-jwt-secret-2026-change-in-production';
const JWT_EXPIRES_IN = '7d';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, companyName, phone } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: '이메일과 비밀번호를 입력해주세요.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: '비밀번호는 최소 8자 이상이어야 합니다.'
            });
        }

        // Check if user already exists
        const sellersRef = collection(db, 'sellers');
        const q = query(sellersRef, where('email', '==', email));
        const existingUser = await getDocs(q);

        if (!existingUser.empty) {
            return res.status(400).json({
                success: false,
                error: '이미 등록된 이메일입니다.'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user document in Firestore
        const newSeller = {
            email,
            password: hashedPassword,
            companyName: companyName || '',
            phone: phone || '',
            role: 'seller',
            status: 'active',
            totalRevenue: 0,
            // Plan fields
            plan: 'starter', // Default plan
            planStartDate: new Date().toISOString(),
            planExpiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14-day trial
            revenueThisMonth: 0,
            marketplaceIntegrations: [],
            teamMembers: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await addDoc(sellersRef, newSeller);

        // Generate JWT token
        const token = jwt.sign(
            {
                id: docRef.id,
                email,
                role: 'seller'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Return success with token
        return res.status(201).json({
            success: true,
            message: '회원가입이 완료되었습니다.',
            token,
            user: {
                id: docRef.id,
                email,
                companyName: companyName || '',
                role: 'seller'
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: '회원가입 중 오류가 발생했습니다.'
        });
    }
};
