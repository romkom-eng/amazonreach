const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;

try {
    // 1. Try Environment Variable (JSON String) - Best for Railway/Heroku
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log('✅ Loaded Firebase credentials from FIREBASE_SERVICE_ACCOUNT');
        } catch (e) {
            console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
        }
    }

    // 2. Try Individual Environment Variables (Fallback)
    if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
            project_id: process.env.FIREBASE_PROJECT_ID,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') // Fix newlines in private key
        };
        console.log('✅ Loaded Firebase credentials from Individual Env Vars');
    }

    // 3. Try Local File
    if (!serviceAccount) {
        try {
            serviceAccount = require('./serviceAccountKey.json');
            console.log('✅ Loaded Firebase credentials from serviceAccountKey.json');
        } catch (e) {
            console.warn('⚠️ serviceAccountKey.json not found.');
        }
    }

    if (serviceAccount) {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin Initialized');
        }
    } else {
        console.error('❌ No Firebase credentials found. Authentication will fail.');
    }
} catch (error) {
    console.error('❌ Firebase Admin Initialization Error:', error);
}

const db = admin.apps.length ? admin.firestore() : {
    collection: () => ({
        add: () => Promise.reject(new Error("Firebase not initialized")),
        where: () => ({ limit: () => ({ get: () => Promise.reject(new Error("Firebase not initialized")) }) }),
        doc: () => ({ get: () => Promise.reject(new Error("Firebase not initialized")), update: () => Promise.reject(new Error("Firebase not initialized")) }),
        get: () => Promise.reject(new Error("Firebase not initialized")),
        orderBy: () => ({ limit: () => ({ get: () => Promise.reject(new Error("Firebase not initialized")) }) })
    })
};

const auth = admin.apps.length ? admin.auth() : {};

module.exports = { admin, db, auth };
