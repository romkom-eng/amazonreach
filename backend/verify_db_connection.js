const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

console.log('🔍 Starting Firebase Verification...');

try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin Initialized Successfully');
    }
} catch (error) {
    console.error('❌ Firebase Initialization Failed:', error.message);
    process.exit(1);
}

const db = admin.firestore();
const USERS_COLLECTION = 'users';

async function checkAdminUser() {
    const adminEmail = 'admin@nextgate.com';
    console.log(`🔍 Checking for user: ${adminEmail}`);

    try {
        const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', adminEmail).limit(1).get();
        
        if (snapshot.empty) {
            console.error('❌ Admin user NOT found in Firestore.');
            console.log('💡 Suggestion: The server might need to seed the admin user. Restart the server or check the seeding logic.');
        } else {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            console.log('✅ Admin user FOUND in Firestore.');
            console.log('   - ID:', userDoc.id);
            console.log('   - Email:', userData.email);
            console.log('   - Password Hash (excerpt):', userData.password_hash ? userData.password_hash.substring(0, 10) + '...' : 'MISSING');
            console.log('   - Account Locked:', userData.account_locked);
        }
    } catch (error) {
        console.error('❌ Error querying Firestore:', error.message);
        if (error.code === 5) { // NOT_FOUND
             console.error('   Hint: Check if the Firestore database is created in the Firebase Console.');
        }
    }
}

checkAdminUser().then(() => {
    console.log('🏁 Verification Complete');
    process.exit(0);
}).catch(err => {
    console.error('❌ Unexpected Error:', err);
    process.exit(1);
});
