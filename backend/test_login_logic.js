const db = require('./database');
const bcrypt = require('bcryptjs');

async function testLoginLogic() {
    console.log('🔍 Testing Login Logic...');

    try {
        const email = 'admin@nextgate.com';
        const password = 'Admin@123456';

        // 1. Find User
        console.log(`1️⃣ Finding user: ${email}`);
        const user = await db.findUserByEmail(email);

        if (!user) {
            console.error('❌ User not found!');
            return;
        }
        console.log('✅ User found.');

        // 2. Verify Password
        console.log('2️⃣ Verifying password...');
        // bcrypt.compare(password, hash)
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`   Password valid: ${isValid}`);

        if (!isValid) {
            console.error('❌ Password verification failed!');
            console.log('   Input:', password);
            console.log('   Hash:', user.password_hash);
        } else {
            console.log('✅ Password verified successfully.');
        }

        // 3. Test Subscription Check
        console.log('3️⃣ Checking subscription status...');
        console.log(`   Status: ${user.subscription_status}`);

        // 4. Test Audit Log (Write permission check)
        console.log('4️⃣ Testing Audit Log creation...');
        try {
            await db.createAuditLog({
                user_id: user.id,
                action: 'TEST_LOGIN_DEBUG',
                ip_address: '127.0.0.1',
                user_agent: 'Test Script'
            });
            console.log('✅ Audit log created successfully.');
        } catch (e) {
            console.error('❌ Failed to create audit log:', e.message);
        }

    } catch (error) {
        console.error('❌ Unexpected error during test:', error);
    }
}

testLoginLogic().then(() => {
    console.log('🏁 Test Complete');
    process.exit(0);
});
