const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;

try {
    // 1. Try Environment Variable (JSON String) - Best for Railway/Heroku
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✅ Loaded Firebase credentials from Environment Variable');
    }
    // 2. Try Local File
    else {
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

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
