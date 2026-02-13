const axios = require('axios');

async function testLogin() {
    const API_URL = 'http://localhost:3000';

    console.log('🔍 Testing Login API Endpoint...\n');

    try {
        const response = await axios.post(`${API_URL}/api/auth/login`, {
            email: 'admin@nextgate.com',
            password: 'Admin@123456'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });

        console.log('✅ Login Successful!');
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Login Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testLogin().then(() => {
    console.log('\n🏁 Test Complete');
    process.exit(0);
});
