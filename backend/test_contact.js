const axios = require('axios');

async function testContactForm() {
    try {
        console.log('Testing Contact Form Submission...');

        const response = await axios.post('http://localhost:3000/contact-form', {
            companyName: 'Test Company Inc.',
            contactName: 'Test User',
            email: 'test@example.com',
            phone: '123-456-7890',
            inquiryType: 'Test Inquiry',
            message: 'This is a test message from the backend verification script.'
        });

        console.log('Response:', response.data);

        if (response.data && response.data.id) {
            console.log('✅ Email sent successfully!');
            console.log('Email ID:', response.data.id);
        } else {
            console.log('⚠️ Email sent but no ID returned (check logs)');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

testContactForm();
