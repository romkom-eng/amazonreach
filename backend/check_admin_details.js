const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

console.log('🔍 Checking Admin User Full Details...');

try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (error) {
    console.error('❌ Firebase Initialization Failed:', error.message);
    process.exit(1);
}

const db = admin.firestore();
const USERS_COLLECTION = 'users';

async function checkAdminUser() {
    const adminEmail = 'admin@nextgate.com';
    
    try {
        const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', adminEmail).limit(1).get();
        
        if (snapshot.empty) {
            console.error('❌ Admin user NOT found in Firestore.');
        } else {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            console.log('✅ Admin user FOUND in Firestore.');
            console.log('   - ID:', userDoc.id);
            console.log('   - Email:', userData.email);
            console.log('   - Subscription Status:', userData.subscription_status);
            console.log('   - Subscription Plan:', userData.subscription_plan);
            console.log('   - Account Locked:', userData.account_locked);
            console.log('   - Failed Login Attempts:', userData.failed_login_attempts);
            console.log('   - MFA Enabled:', userData.mfa_enabled);
            console.log('\n📋 Full User Data:');
            console.log(JSON.stringify(userData, null, 2));
        }
    } catch (error) {
        console.error('❌ Error querying Firestore:', error.message);
    }
}

checkAdminUser().then(() => {
    console.log('🏁 Verification Complete');
    process.exit(0);
}).catch(err => {
    console.error('❌ Unexpected Error:', err);
    process.exit(1);
});
