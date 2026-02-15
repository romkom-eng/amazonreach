// ============================================
//  NextGate Express Server
//  Enhanced with User Authentication & Stripe Subscriptions
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import mock data
const {
    mockOrders,
    mockInventory,
    mockShipments,
    generateMockFinancials,
    generateRevenueTrend
} = require('./mockData');

// Import routes
const authRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripe');
const adminRoutes = require('./routes/admin'); // Admin Routes
const amazonRoutes = require('./routes/amazon'); // Amazon Routes
const contactRoutes = require('./routes/contact'); // Contact Routes
const db = require('./database');
const amazonService = require('./services/amazonService.js');

// --- DEBUG ROUTE (Temporary) ---
// This route helps verify if environment variables are loaded correctly in Railway.
const app = express();
app.get('/debug-env', (req, res) => {
    res.json({
        message: "Environment Variable Debugger v2",
        timestamp: new Date().toISOString(),
        service_info: {
            service_name: process.env.RAILWAY_SERVICE_NAME || "Unknown",
            environment_name: process.env.RAILWAY_ENVIRONMENT_NAME || "Unknown",
            project_id: process.env.RAILWAY_PROJECT_ID || "Unknown"
        },
        resend_key_status: {
            exists: !!process.env.RESEND_API_KEY,
            length: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
            preview: process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 3)}...` : "N/A"
        },
        contact_email: process.env.CONTACT_EMAIL || "Not Set (Using Default)",
        available_env_keys: Object.keys(process.env).sort()
    });
});
const PORT = process.env.PORT || 3000;

// ========== Security Middleware ==========
app.set('trust proxy', 1); // Trust first proxy (Railway/Heroku/AWS LB) - Required for Secure Cookies
app.use(helmet({
    contentSecurityPolicy: false // Disable for development
}));

// Rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later'
});

// ========== Middleware ==========
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any localhost or 127.0.0.1 with any port
        if (/^http:\/\/localhost:\d+$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
            origin.endsWith('.pages.dev') ||
            origin.endsWith('.railway.app') ||
            origin.endsWith('amazonreach.com')) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Parse JSON
app.use((req, res, next) => {
    if (req.originalUrl === '/api/stripe/webhook') {
        next();
    } else {
        express.json()(req, res, next);
    }
});

app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'nextgate-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/dashboard', express.static(path.join(__dirname, '../frontend/dashboard')));

// ========== Routes ==========
app.use('/api/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/amazon', amazonRoutes); // Add Amazon Routes
app.use('/contact-form', contactRoutes); // Add Contact Route
app.use('/api/ai', require('./routes/ai'));

// Landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========== Authentication Middleware ==========
function isAuthenticated(req, res, next) {
    // Debug logging
    console.log(`[AuthCheck] ${req.method} ${req.url} - Session ID: ${req.sessionID}`);
    if (req.session && req.session.user) {
        console.log(`[AuthCheck] User authenticated: ${req.session.user.email}`);
        return next();
    }
    console.log('[AuthCheck] Unauthorized: No active session');
    res.status(401).json({ error: 'Unauthorized. Please login first.' });
}

// Subscription check middleware
function hasActiveSubscription(req, res, next) {
    const user = req.session.user;

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Allow access for active or trialing subscriptions
    if (user.subscription_status === 'active' || user.subscription_status === 'trialing') {
        return next();
    }

    res.status(403).json({
        error: 'Subscription required',
        message: 'Please subscribe to access the dashboard'
    });
}



// ========== Routes ==========

// Home route - Landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========== Enhanced Auth Routes ==========
app.use('/api/auth', authRoutes);

// Apply rate limiting to login
app.post('/api/auth/login', loginLimiter);

// ========== Stripe Routes ==========
app.use('/api/stripe', stripeRoutes);

// ========== Dashboard API Routes (Protected) ==========

// Get sales overview
// Get sales overview
app.get('/api/sales', isAuthenticated, hasActiveSubscription, (req, res) => {
    (async () => {
        try {
            let totalRevenue = 0;
            let revenueTrend = [];
            let totalOrders = 0;
            let revenueGrowth = 0;
            let ordersGrowth = 0;

            // Get user's amazon refresh token from DB
            const user = await db.findUserById(req.session.user.id);
            const refreshToken = user ? user.amazon_refresh_token : null;
            let usingMock = !refreshToken;

            if (!usingMock) {
                try {
                    const amazonResponse = await amazonService.getOrders(refreshToken);
                    if (amazonResponse.payload && amazonResponse.payload.Orders) {
                        const orders = amazonResponse.payload.Orders;

                        // Calculate metrics for current period (last 30 days) and previous period (30-60 days ago)
                        const now = new Date();
                        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

                        let currentRevenue = 0;
                        let previousRevenue = 0;
                        let currentOrders = 0;
                        let previousOrders = 0;

                        const dailyRevenue = {};
                        // Initialize last 30 days bucket
                        for (let i = 0; i < 30; i++) {
                            const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
                            dailyRevenue[d.toISOString().slice(0, 10)] = 0;
                        }

                        orders.forEach(order => {
                            const purchaseDate = new Date(order.PurchaseDate);
                            const amount = order.OrderTotal && order.OrderTotal.Amount ? parseFloat(order.OrderTotal.Amount) : 0;

                            if (purchaseDate >= thirtyDaysAgo) {
                                currentRevenue += amount;
                                currentOrders++;
                                const dateStr = purchaseDate.toISOString().slice(0, 10);
                                if (dailyRevenue[dateStr] !== undefined) {
                                    dailyRevenue[dateStr] += amount;
                                }
                            } else if (purchaseDate >= sixtyDaysAgo) {
                                previousRevenue += amount;
                                previousOrders++;
                            }
                        });

                        totalRevenue = currentRevenue;
                        totalOrders = currentOrders;

                        // Calculate growth (Avoid NaN)
                        if (previousRevenue === 0) {
                            revenueGrowth = currentRevenue > 0 ? 100.0 : 0.0;
                        } else {
                            revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue * 100);
                        }

                        if (previousOrders === 0) {
                            ordersGrowth = currentOrders > 0 ? 100.0 : 0.0;
                        } else {
                            ordersGrowth = ((currentOrders - previousOrders) / previousOrders * 100);
                        }

                        revenueTrend = Object.keys(dailyRevenue).sort().map(date => ({
                            date: date,
                            amount: dailyRevenue[date]
                        }));
                    }
                } catch (err) {
                    console.error('Sales API Amazon Error:', err.message);
                    // Return empty but real source
                    revenueTrend = Array(30).fill(0).map((_, i) => ({
                        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
                        amount: 0
                    }));
                }
            } else {
                // Fallback to mock
                const financials = generateMockFinancials();
                totalRevenue = parseFloat(financials.totalRevenue);
                totalOrders = mockOrders.length;
                revenueTrend = generateRevenueTrend();
                revenueGrowth = 12.5; // Mock values
                ordersGrowth = 8.2;
            }

            res.json({
                success: true,
                data: {
                    totalRevenue: totalRevenue.toFixed(2),
                    netProfit: (totalRevenue * 0.3).toFixed(2),
                    profitMargin: totalRevenue > 0 ? '30%' : '0%',
                    revenueTrend: revenueTrend,
                    totalOrders: totalOrders,
                    averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00',
                    revenueGrowth: revenueGrowth.toFixed(1),
                    ordersGrowth: ordersGrowth.toFixed(1),
                    source: usingMock ? 'Mock' : 'Amazon'
                }
            });

        } catch (error) {
            console.error('Sales API Error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch sales data' });
        }
    })();
});

// Import Amazon Service
// (Moved to top of file)

// Get orders
app.get('/api/orders', isAuthenticated, hasActiveSubscription, async (req, res) => {
    const { status, limit = 10 } = req.query;

    try {
        let ordersData = [];
        let totalCount = 0;
        const user = await db.findUserById(req.session.user.id);
        const refreshToken = user ? user.amazon_refresh_token : null;
        let usingMock = !refreshToken;
        let source = usingMock ? 'Mock' : 'Amazon';

        if (!usingMock) {
            try {
                const amazonResponse = await amazonService.getOrders(refreshToken);
                if (amazonResponse.payload && amazonResponse.payload.Orders) {
                    ordersData = amazonResponse.payload.Orders;
                    totalCount = ordersData.length;
                }
            } catch (err) {
                console.error('Orders API Amazon Error:', err.message);
                ordersData = [];
                totalCount = 0;
            }
        } else {
            ordersData = mockOrders;
            totalCount = mockOrders.length;
        }

        // Client-side filtering (simple version)
        if (status && status !== 'all') {
            ordersData = ordersData.filter(order =>
                (order.OrderStatus || '').toLowerCase() === status.toLowerCase()
            );
        }

        const limitedOrders = ordersData.slice(0, parseInt(limit));

        await db.createAuditLog({
            user_id: req.session.user.id,
            action: 'DATA_ACCESS_ORDERS',
            details: { limit, status: status || 'all', source },
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({
            success: true,
            data: {
                orders: limitedOrders,
                total: totalCount
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
});

// ... (Order Details route would need similar update, skipping for brevity of this turn) ...

// Get inventory/products
app.get('/api/inventory', isAuthenticated, hasActiveSubscription, async (req, res) => {
    const { status } = req.query;

    try {
        let inventoryData = [];
        const user = await db.findUserById(req.session.user.id);
        const refreshToken = user ? user.amazon_refresh_token : null;

        if (refreshToken) {
            try {
                const amazonResponse = await amazonService.getInventorySummaries(refreshToken);
                // Map Amazon FBA Inventory to our Dashboard Format
                if (amazonResponse.payload && amazonResponse.payload.inventorySummaries) {
                    inventoryData = amazonResponse.payload.inventorySummaries.map(item => ({
                        ASIN: item.asin,
                        ProductName: item.productName || 'Amazon Product',
                        Status: item.totalQuantity > 0 ? 'In Stock' : 'Out of Stock',
                        Available: item.totalQuantity || 0,
                        Price: 0
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch inventory from Amazon:', err.message);
                inventoryData = [];
            }
        } else {
            inventoryData = mockInventory;
        }

        if (status) {
            inventoryData = inventoryData.filter(item =>
                (item.Status || '').toLowerCase().includes(status.toLowerCase())
            );
        }

        res.json({
            success: true,
            data: {
                products: inventoryData,
                total: inventoryData.length,
                lowStockCount: inventoryData.filter(i => (i.Available || 0) < 10).length,
                outOfStockCount: inventoryData.filter(i => (i.Available || 0) === 0).length
            }
        });

    } catch (error) {
        console.error('Inventory API Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
    }
});

// Get shipping/tracking
app.get('/api/shipping', isAuthenticated, hasActiveSubscription, async (req, res) => {
    try {
        await db.createAuditLog({
            user_id: req.session.user.id,
            action: 'DATA_ACCESS_SHIPPING',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });
    } catch (e) { console.error('Audit log failed:', e); }

    res.json({
        success: true,
        data: {
            shipments: mockShipments,
            total: mockShipments.length,
            delivered: mockShipments.filter(s => s.Status === 'Delivered').length,
            inTransit: mockShipments.filter(s => s.Status === 'In Transit').length,
            processing: mockShipments.filter(s => s.Status === 'Processing').length
        }
    });
});

// Get dashboard summary (all key metrics)
// Get dashboard summary (all key metrics)
app.get('/api/dashboard/summary', isAuthenticated, hasActiveSubscription, async (req, res) => {
    try {
        let revenue = 0;
        let totalOrders = 0;
        let revenueGrowth = 0;
        let ordersGrowth = 0;
        let pendingOrders = 0;
        let shippedOrders = 0;
        let deliveredOrders = 0;
        const user = await db.findUserById(req.session.user.id);
        const refreshToken = user ? user.amazon_refresh_token : null;
        let usingMock = !refreshToken;
        let source = usingMock ? 'Mock' : 'Amazon';

        if (!usingMock) {
            try {
                const amazonResponse = await amazonService.getOrders(refreshToken);
                if (amazonResponse.payload && amazonResponse.payload.Orders) {
                    const orders = amazonResponse.payload.Orders;
                    source = 'Amazon';

                    const now = new Date();
                    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

                    let currentRevenue = 0;
                    let previousRevenue = 0;
                    let currentOrders = 0;
                    let previousOrders = 0;

                    orders.forEach(order => {
                        const purchaseDate = new Date(order.PurchaseDate);
                        const amount = order.OrderTotal && order.OrderTotal.Amount ? parseFloat(order.OrderTotal.Amount) : 0;

                        if (purchaseDate >= thirtyDaysAgo) {
                            currentRevenue += amount;
                            currentOrders++;

                            const status = (order.OrderStatus || '').toLowerCase();
                            if (status === 'shipped') shippedOrders++;
                            else if (status === 'delivered') deliveredOrders++;
                            else pendingOrders++;
                        } else if (purchaseDate >= sixtyDaysAgo) {
                            previousRevenue += amount;
                            previousOrders++;
                        }
                    });

                    revenue = currentRevenue.toFixed(2);
                    totalOrders = currentOrders;

                    // Growth Calculation (Avoid NaN)
                    if (previousRevenue === 0) {
                        revenueGrowth = currentRevenue > 0 ? 100.0 : 0.0;
                    } else {
                        revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue * 100);
                    }

                    if (previousOrders === 0) {
                        ordersGrowth = currentOrders > 0 ? 100.0 : 0.0;
                    } else {
                        ordersGrowth = ((currentOrders - previousOrders) / previousOrders * 100);
                    }
                }
            } catch (error) {
                console.error('Summary API Amazon Error:', error.message);
                revenue = "0.00";
                totalOrders = 0;
                source = 'Amazon';
            }
        } else {
            const financials = generateMockFinancials();
            revenue = financials.totalRevenue;
            totalOrders = mockOrders.length;
            revenueGrowth = 12.5;
            ordersGrowth = 8.2;
            pendingOrders = mockOrders.filter(o => o.OrderStatus === 'Pending').length;
            shippedOrders = mockOrders.filter(o => o.OrderStatus === 'Shipped').length;
            deliveredOrders = mockOrders.filter(o => o.OrderStatus === 'Delivered').length;
        }

        res.json({
            success: true,
            data: {
                revenue,
                totalOrders,
                revenueGrowth: revenueGrowth.toFixed(1),
                ordersGrowth: ordersGrowth.toFixed(1),
                pendingOrders,
                shippedOrders,
                deliveredOrders,
                source,
                lowStockItems: mockInventory.filter(i => i.Status === 'Low Stock' || i.Status === 'Out of Stock').length,
                activeShipments: mockShipments.filter(s => s.Status === 'In Transit').length
            }
        });
    } catch (error) {
        console.error('Summary API Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch summary' });
    }
});

// ========== Health Check ==========
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'NextGate API is running',
        environment: process.env.NODE_ENV || 'development',
        usingMockData: process.env.USE_MOCK_DATA === 'true',
        features: {
            authentication: true,
            subscriptions: true,
            stripe: !!process.env.STRIPE_SECRET_KEY
        }
    });
});

// Temporary Debug Endpoint for Firebase
app.get('/api/debug/firebase', (req, res) => {
    const { admin } = require('./firebase');
    const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;

    let parseResult = 'N/A';
    if (envVar) {
        try {
            JSON.parse(envVar);
            parseResult = 'Valid JSON';
        } catch (e) {
            parseResult = `Invalid JSON: ${e.message}`;
        }
    }

    res.json({
        firebaseInitialized: !!admin.apps.length,
        envVarPresent: !!envVar,
        envVarLength: envVar ? envVar.length : 0,
        envVarParseStatus: parseResult,
        projectId: process.env.FIREBASE_PROJECT_ID || 'Not Set'
    });
});

// ========== Error Handler ==========
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Log to audit
    if (req.session?.user) {
        db.createAuditLog({
            user_id: req.session.user.id,
            action: 'ERROR',
            details: { error: err.message, stack: err.stack },
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });
    }

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ========== 404 Handler ==========
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// ========== Start Server ==========
async function seedAdminUser() {
    try {
        const adminEmail = 'admin@nextgate.com';
        const existingUser = await db.findUserByEmail(adminEmail);

        if (!existingUser) {
            console.log('🌱 Seeding Admin User...');
            await db.createUser({
                email: adminEmail,
                password: 'Admin@123456',
                name: 'Admin User',
                company_name: 'NextGate HQ'
            });
            console.log('✅ Admin User Created: admin@nextgate.com / Admin@123456');
        } else {
            console.log('ℹ️ Admin User already exists');
        }
    } catch (error) {
        console.error('Failed to seed admin user:', error);
    }
}

if (require.main === module) {
    // Seed admin user then start server
    seedAdminUser().then(() => {
        app.listen(PORT, () => {
            console.log('='.repeat(60));
            console.log('🚀 NextGate Backend Server with Authentication & Subscriptions');
            console.log('='.repeat(60));
            console.log(`✅ Server running on http://localhost:${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔧 Mock Data: ${process.env.USE_MOCK_DATA === 'true' ? 'Enabled' : 'Disabled'}`);
            console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured ✓' : 'Not configured ✗'}`);
            console.log('');
            console.log('📍 Available Routes:');
            console.log(`   Landing Page:      http://localhost:${PORT}/`);
            console.log(`   Login:             http://localhost:${PORT}/login.html`);
            console.log(`   Dashboard:         http://localhost:${PORT}/dashboard/dashboard.html`);
            console.log(`   API Health:        http://localhost:${PORT}/api/health`);
            console.log('');
            console.log('🔐 Authentication:');
            console.log(`   POST /api/auth/signup   - Create new account`);
            console.log(`   POST /api/auth/login    - Login`);
            console.log(`   POST /api/auth/logout   - Logout`);
            console.log(`   GET  /api/auth/status   - Check auth status`);
            console.log('');
            console.log('💳 Subscription:');
            console.log(`   GET  /api/stripe/plans                    - View plans`);
            console.log(`   POST /api/stripe/create-checkout-session - Start subscription`);
            console.log('');
            console.log('🔑 Demo Login:');
            console.log(`   Email: admin@nextgate.com`);
            console.log(`   Password: Admin@123456`);
            console.log('='.repeat(60));
        });
    });
}

module.exports = app;
