// ============================================
// Stripe Subscription Routes
// Handle subscription creation, webhooks, and management
// ============================================

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database');

// ========== Subscription Plans ==========

const PLANS = {
    basic: {
        name: 'Basic',
        price: 49,
        priceId: process.env.STRIPE_PRICE_ID_BASIC || 'price_basic',
        features: [
            'Up to 100 orders per month',
            'Basic analytics',
            'Email support',
            '7-day data retention'
        ]
    },
    pro: {
        name: 'Professional',
        price: 99,
        priceId: process.env.STRIPE_PRICE_ID_PRO || 'price_pro',
        features: [
            'Unlimited orders',
            'Advanced analytics',
            'Priority support',
            '30-day data retention',
            'Custom reports',
            'API access'
        ]
    },
    enterprise: {
        name: 'Enterprise',
        price: 299,
        priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise',
        features: [
            'Everything in Pro',
            'Dedicated account manager',
            'Custom integrations',
            'Unlimited data retention',
            'White-label dashboard',
            '24/7 phone support'
        ]
    }
};

// ========== Routes ==========

// Get Stripe publishable key (public endpoint)
router.get('/config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
    });
});

// Get available plans
router.get('/plans', (req, res) => {
    res.json({
        success: true,
        plans: PLANS
    });
});

// Create Stripe checkout session
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { plan } = req.body;
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!PLANS[plan]) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        // Create or retrieve Stripe customer
        let customerId = user.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id.toString(),
                    name: user.name
                }
            });
            customerId = customer.id;

            // Update user with customer ID
            await db.updateUser(user.id, {
                stripe_customer_id: customerId
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: PLANS[plan].priceId,
                    quantity: 1
                }
            ],
            mode: 'subscription',
            success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/subscribe-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/subscribe-cancel.html`,
            metadata: {
                userId: user.id.toString(),
                plan: plan
            }
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create checkout session'
        });
    }
});

// Guest checkout (no auth required)
router.post('/guest-checkout', async (req, res) => {
    try {
        const { plan, name, email, phone } = req.body;

        if (!plan || !PLANS[plan]) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        if (!email || !name) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Check if user already exists
        let user = await db.findUserByEmail(email);
        let customerId;

        if (user && user.stripe_customer_id) {
            customerId = user.stripe_customer_id;
        } else {
            // Create Stripe customer
            const customer = await stripe.customers.create({
                email,
                name,
                phone: phone || undefined,
                metadata: { source: 'guest_checkout' }
            });
            customerId = customer.id;

            if (user) {
                // Update existing user with Stripe customer ID
                await db.updateUser(user.id, {
                    stripe_customer_id: customerId,
                    phone: phone || user.phone
                });
            } else {
                // Create guest user in Firebase
                await db.createGuestUser({
                    email,
                    name,
                    phone: phone || '',
                    stripe_customer_id: customerId,
                    is_guest: true
                });
            }
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: PLANS[plan].priceId,
                    quantity: 1
                }
            ],
            mode: 'subscription',
            success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/subscribe-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/subscribe-cancel.html`,
            metadata: {
                email,
                plan,
                source: 'guest_checkout'
            }
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Guest checkout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create guest checkout session'
        });
    }
});

// Create customer portal session
router.post('/create-portal-session', async (req, res) => {
    try {
        const user = req.session.user;

        if (!user || !user.stripe_customer_id) {
            return res.status(401).json({ error: 'No active subscription found' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/dashboard/dashboard.html`
        });

        res.json({
            success: true,
            url: session.url
        });

    } catch (error) {
        console.error('Portal session error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create portal session'
        });
    }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
});

// ========== Webhook Handlers ==========

async function handleCheckoutCompleted(session) {
    const userId = parseInt(session.metadata.userId);
    const plan = session.metadata.plan;

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    await db.updateSubscription(userId, {
        customer_id: session.customer,
        subscription_id: subscription.id,
        status: subscription.status,
        plan: plan,
        current_period_end: new Date(subscription.current_period_end * 1000)
    });

    await db.createAuditLog({
        user_id: userId,
        action: 'SUBSCRIPTION_CREATED',
        details: { plan, subscription_id: subscription.id }
    });

    console.log(`✅ Subscription created for user ${userId}: ${plan}`);
}

async function handleSubscriptionUpdated(subscription) {
    const customerId = subscription.customer;
    const user = await db.findUserByStripeCustomerId(customerId);

    if (user) {
        await db.updateSubscription(user.id, {
            customer_id: customerId,
            subscription_id: subscription.id,
            status: subscription.status,
            plan: subscription.metadata.plan,
            current_period_end: new Date(subscription.current_period_end * 1000)
        });

        await db.createAuditLog({
            user_id: user.id,
            action: 'SUBSCRIPTION_UPDATED',
            details: { status: subscription.status }
        });
    }

    console.log(`✅ Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription) {
    const customerId = subscription.customer;
    const user = await db.findUserByStripeCustomerId(customerId);

    if (user) {
        await db.updateUser(user.id, {
            subscription_status: 'canceled',
            subscription_id: null
        });

        await db.createAuditLog({
            user_id: user.id,
            action: 'SUBSCRIPTION_CANCELED'
        });
    }

    console.log(`✅ Subscription canceled: ${subscription.id}`);
}

async function handlePaymentSucceeded(invoice) {
    console.log(`✅ Payment succeeded: ${invoice.id}`);
}

async function handlePaymentFailed(invoice) {
    const customerId = invoice.customer;
    // Notify user about failed payment
    console.log(`❌ Payment failed for customer: ${customerId}`);

    // Update subscription status to past_due
    // This will be handled by subscription.updated webhook
}

module.exports = router;
