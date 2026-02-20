// ============================================
// Stripe Pricing Integration
// Handles checkout flow for subscription plans
// ============================================

(function () {
    const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://amazonreach-production.up.railway.app';

    let stripe = null;

    // Initialize Stripe
    async function initStripe() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/stripe/config`);
            const data = await res.json();
            if (data.publishableKey) {
                stripe = Stripe(data.publishableKey);
            }
        } catch (err) {
            console.warn('Stripe config not available:', err.message);
        }
    }

    // Check if user is logged in
    async function checkAuth() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/status`, { credentials: 'include' });
            const data = await res.json();
            return data.authenticated ? data : null;
        } catch {
            return null;
        }
    }

    // Create Stripe Checkout Session
    async function startCheckout(plan) {
        const btn = document.querySelector(`[data-plan="${plan}"]`);
        const originalText = btn ? btn.textContent : '';

        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Redirecting...';
            }

            // Check auth first
            const auth = await checkAuth();
            if (!auth) {
                // Not logged in — redirect to register with plan param
                window.location.href = `/register.html?plan=${plan}`;
                return;
            }

            // Create checkout session
            const res = await fetch(`${BACKEND_URL}/api/stripe/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ plan })
            });

            const data = await res.json();

            if (data.success && data.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }

        } catch (error) {
            console.error('Checkout error:', error);
            alert('Unable to start checkout. Please try again or contact support.');
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    }

    // Bind pricing buttons
    function bindPricingButtons() {
        document.querySelectorAll('[data-plan]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const plan = btn.getAttribute('data-plan');
                if (plan === 'enterprise') {
                    // Enterprise — scroll to contact form
                    const contactSection = document.getElementById('contact');
                    if (contactSection) {
                        contactSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    return;
                }
                startCheckout(plan);
            });
        });
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        initStripe();
        bindPricingButtons();
    });
})();
