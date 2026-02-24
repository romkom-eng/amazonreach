import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', async () => {
    const googleBtn = document.getElementById('googleLoginBtn');
    if (!googleBtn) return;

    try {
        const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : 'https://amazonreach-production.up.railway.app';

        // Fetch config from our backend (so we don't expose it in HTML)
        const res = await fetch(`${BACKEND_URL}/api/config/firebase`);
        const config = await res.json();

        if (!config.apiKey || config.apiKey === '') {
            console.warn('Firebase API Key not configured on the server. Google Login is disabled.');
            googleBtn.addEventListener('click', () => {
                alert('Google Login is currently disabled. Please contact support or use Email/Password.');
            });
            return;
        }

        // Initialize Firebase
        const app = initializeApp({
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            storageBucket: config.storageBucket,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId
        });

        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();

        googleBtn.addEventListener('click', async () => {
            const errorDiv = document.getElementById('error-message');
            if (errorDiv) errorDiv.style.display = 'none';

            // Check for plan parameter (from checkout-choice page)
            const urlParams = new URLSearchParams(window.location.search);
            const pendingPlan = urlParams.get('plan');

            try {
                googleBtn.disabled = true;
                const originalText = googleBtn.innerHTML;
                googleBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-lg">sync</span> Connecting...';

                // 1. Popup Google Sign In
                const result = await signInWithPopup(auth, provider);
                const token = await result.user.getIdToken();

                // 2. Send token to our backend for verification and session setup
                const backendRes = await fetch(`${BACKEND_URL}/api/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                const data = await backendRes.json();

                if (backendRes.ok && data.success) {
                    if (data.token) {
                        localStorage.setItem('jwt_token', data.token);
                    }

                    if (typeof window.startCheckoutAfterLogin === 'function' && pendingPlan && pendingPlan !== 'enterprise') {
                        await window.startCheckoutAfterLogin(pendingPlan, data.token);
                    } else if (typeof window.startCheckoutAfterRegister === 'function' && pendingPlan && pendingPlan !== 'enterprise') {
                        await window.startCheckoutAfterRegister(pendingPlan, data.token);
                    } else {
                        window.location.href = '/dashboard/dashboard.html';
                    }
                } else {
                    throw new Error(data.error || 'Authentication failed on server');
                }
            } catch (error) {
                console.error('Google Login Error:', error);
                if (errorDiv) {
                    errorDiv.textContent = error.message || 'Google Login failed. Please try again.';
                    errorDiv.style.display = 'block';
                } else {
                    alert(error.message || 'Google Login failed. Please try again.');
                }
                googleBtn.disabled = false;
                googleBtn.innerHTML = `
                <svg class="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google`;
            }
        });

    } catch (e) {
        console.error('Failed to initialize Firebase Auth:', e);
    }
});
