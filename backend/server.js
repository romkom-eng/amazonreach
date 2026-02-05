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
const adminRoutes = require('./routes/admin');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== Security Middleware ==========
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
    origin: true, // Allow any origin (or specify your Vercel domain)
    credentials: true // Enable credentials (cookies, authorization headers)
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
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

// ========== Routes ==========
app.use('/api/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/admin', adminRoutes);

// Landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========== Authentication Middleware ==========
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
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
app.get('/api/sales', isAuthenticated, hasActiveSubscription, (req, res) => {
    const financials = generateMockFinancials();
    const revenueTrend = generateRevenueTrend();

    res.json({
        success: true,
        data: {
            ...financials,
            revenueTrend: revenueTrend,
            totalOrders: mockOrders.length,
            averageOrderValue: (parseFloat(financials.totalRevenue) / mockOrders.length).toFixed(2)
        }
    });
});

// Get orders
app.get('/api/orders', isAuthenticated, hasActiveSubscription, async (req, res) => {
    const { status, limit = 10 } = req.query;

    let filteredOrders = mockOrders;

    // Filter by status if provided
    if (status && status !== 'all') {
        filteredOrders = mockOrders.filter(order =>
            order.OrderStatus.toLowerCase() === status.toLowerCase()
        );
    }

    // Apply limit
    const limitedOrders = filteredOrders.slice(0, parseInt(limit));

    // Audit Log
    try {
        await db.createAuditLog({
            user_id: req.session.user.id,
            action: 'DATA_ACCESS_ORDERS',
            details: { limit, status: status || 'all' },
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });
    } catch (e) { console.error('Audit log failed:', e); }

    res.json({
        success: true,
        data: {
            orders: limitedOrders,
            total: filteredOrders.length
        }
    });
});

// Get single order details
app.get('/api/orders/:orderId', isAuthenticated, hasActiveSubscription, async (req, res) => {
    const { orderId } = req.params;
    const order = mockOrders.find(o => o.AmazonOrderId === orderId);

    if (order) {
        try {
            await db.createAuditLog({
                user_id: req.session.user.id,
                action: 'DATA_ACCESS_ORDER_DETAIL',
                details: { orderId },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
        } catch (e) { console.error('Audit log failed:', e); }

        res.json({ success: true, data: order });
    } else {
        res.status(404).json({ success: false, error: 'Order not found' });
    }
});

// Get inventory/products
app.get('/api/inventory', isAuthenticated, hasActiveSubscription, async (req, res) => {
    const { status } = req.query;

    let filteredInventory = mockInventory;

    // Filter by stock status
    if (status) {
        filteredInventory = mockInventory.filter(item =>
            item.Status.toLowerCase().includes(status.toLowerCase())
        );
    }

    try {
        await db.createAuditLog({
            user_id: req.session.user.id,
            action: 'DATA_ACCESS_INVENTORY',
            details: { filter: status || 'all' },
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });
    } catch (e) { console.error('Audit log failed:', e); }

    res.json({
        success: true,
        data: {
            products: filteredInventory,
            total: filteredInventory.length,
            lowStockCount: mockInventory.filter(i => i.Status === 'Low Stock').length,
            outOfStockCount: mockInventory.filter(i => i.Status === 'Out of Stock').length
        }
    });
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
app.get('/api/dashboard/summary', isAuthenticated, hasActiveSubscription, (req, res) => {
    const financials = generateMockFinancials();

    res.json({
        success: true,
        data: {
            revenue: financials.totalRevenue,
            profit: financials.netProfit,
            profitMargin: financials.profitMargin,
            totalOrders: mockOrders.length,
            pendingOrders: mockOrders.filter(o => o.OrderStatus === 'Pending').length,
            shippedOrders: mockOrders.filter(o => o.OrderStatus === 'Shipped').length,
            deliveredOrders: mockOrders.filter(o => o.OrderStatus === 'Delivered').length,
            lowStockItems: mockInventory.filter(i => i.Status === 'Low Stock' || i.Status === 'Out of Stock').length,
            activeShipments: mockShipments.filter(s => s.Status === 'In Transit').length
        }
    });
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
if (require.main === module) {
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
        console.log(`   Login:             http://localhost:${PORT}/frontend/login.html`);
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
}

module.exports = app;
