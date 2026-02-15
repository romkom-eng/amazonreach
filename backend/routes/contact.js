const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

router.post('/', async (req, res) => {
    try {
        // Initialize Resend per request to ensure latest env vars and better debugging
        const apiKey = process.env.RESEND_API_KEY;

        if (!apiKey) {
            console.error('FATAL: RESEND_API_KEY is missing in process.env');
            // Log available keys for debugging (masking values)
            console.log('Available Env Vars:', Object.keys(process.env));

            return res.status(500).json({
                error: 'Server Configuration Error',
                message: 'RESEND_API_KEY is missing. Please check Railway Variables.'
            });
        }

        const resend = new Resend(apiKey);
        const { companyName, contactName, email, phone, inquiryType, message } = req.body;

        // Validating required fields
        if (!companyName || !contactName || !email || !inquiryType || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const targetEmail = process.env.CONTACT_EMAIL || 'support@amazonreach.com';

        const { data, error } = await resend.emails.send({
            from: 'AmazonReach Contact <onboarding@resend.dev>', // Keep this as is for testing/basic tier
            to: [targetEmail],
            replyTo: email,
            subject: `[AmazonReach Inquiry] ${inquiryType} - ${companyName}`,
            html: `
                <h2>New Inquiry from AmazonReach Website</h2>
                <p><strong>Inquiry Type:</strong> ${inquiryType}</p>
                <hr />
                <h3>Contact Details</h3>
                <ul>
                    <li><strong>Company:</strong> ${companyName}</li>
                    <li><strong>Name:</strong> ${contactName}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Phone:</strong> ${phone || 'N/A'}</li>
                </ul>
                <h3>Message</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `
        });

        if (error) {
            console.error('Resend Error:', error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.error('Contact Form Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
