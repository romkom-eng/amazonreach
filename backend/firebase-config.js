// Firebase Configuration for NextGate
// This file initializes Firebase and exports db, auth instances
// SECURITY: All credentials are loaded from environment variables

const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
let db;
let auth;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

module.exports = { db, auth, app };
