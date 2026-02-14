const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addAmazonCredentialsToAdmin() {
    try {
        console.log('🔧 Adding Amazon credentials to admin account...');

        // Find admin user
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', 'admin@nextgate.com').limit(1).get();

        if (snapshot.empty) {
            console.error('❌ Admin user not found!');
            return;
        }

        const adminDoc = snapshot.docs[0];
        const adminId = adminDoc.id;

        // Update with Amazon credentials
        await usersRef.doc(adminId).update({
            amazon_refresh_token: 'Atzr|IwEBIDummy_Admin_Refresh_Token_For_Testing',
            amazon_merchant_id: 'A1234567890ABC',
            amazon_connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        console.log('✅ Amazon credentials added to admin account!');
        console.log('   - Merchant ID: A1234567890ABC');
        console.log('   - Refresh Token: Atzr|IwEBIDummy_Admin_Refresh_Token_For_Testing');

        // Verify
        const updatedDoc = await usersRef.doc(adminId).get();
        const data = updatedDoc.data();
        console.log('\n📋 Updated Admin Data:');
        console.log('   - Email:', data.email);
        console.log('   - Amazon Merchant ID:', data.amazon_merchant_id);
        console.log('   - Amazon Refresh Token:', data.amazon_refresh_token ? '✓ Set' : '✗ Not set');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

addAmazonCredentialsToAdmin();
