const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Load Service Account
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Initialized with serviceAccountKey.json');
} catch (e) {
    console.error('❌ Failed to load serviceAccountKey.json', e);
    process.exit(1);
}

const db = admin.firestore();
const USERS_COLLECTION = 'users';

async function testLogin(email, password) {
    console.log(`\n🔍 Use Case: Login with ${email}`);

    try {
        // 1. Find User
        const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            console.error('❌ User NOT found in DB');
            return;
        }

        const doc = snapshot.docs[0];
        const user = { id: doc.id, ...doc.data() };
        console.log('✅ User Found:', user.email);
        console.log('   ID:', user.id);
        console.log('   Hash:', user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'MISSING');

        // 2. Verify Password
        if (!user.password_hash) {
            console.error('❌ User has no password_hash');
            return;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`   Password Match: ${isValid}`);

        if (isValid) {
            console.log('🎉 LOGIN SHOULD SUCCEED');
        } else {
            console.error('❌ LOGIN FAILED (Password mismatch)');
        }

    } catch (error) {
        console.error('❌ DB Error:', error);
    }
}

// Run Test
testLogin('admin@nextgate.com', 'Admin@123456');
