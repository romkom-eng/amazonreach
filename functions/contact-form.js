// AmazonReach Contact Form API
// Sends email notifications via Resend

// Cloudflare Pages Functions handler
export async function onRequestPost(context) {
    try {
        // Get environment variables from context
        const RESEND_API_KEY = context.env.RESEND_API_KEY;
        const CONTACT_EMAIL = context.env.CONTACT_EMAIL || 'denisoppa00@gmail.com';

        const body = await context.request.json();
        const { companyName, contactName, email, phone, inquiryType, message } = body;

        // Validate required fields
        if (!companyName || !contactName || !email || !inquiryType || !message) {
            return new Response(JSON.stringify({
                error: 'Missing required fields',
                details: 'Company name, contact name, email, inquiry type, and message are required.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Map inquiry type to readable format
        const inquiryTypeMap = {
            'pricing': 'Pricing & Plans',
            'demo': 'Request Demo',
            'support': 'Technical Support',
            'partnership': 'Partnership Inquiry',
            'other': 'Other'
        };
        const readableInquiryType = inquiryTypeMap[inquiryType] || inquiryType;

        // Send notification to admin
        await sendAdminNotification({
            companyName,
            contactName,
            email,
            phone: phone || 'Not provided',
            inquiryType: readableInquiryType,
            message,
            resendApiKey: RESEND_API_KEY,
            contactEmail: CONTACT_EMAIL
        });

        // Send confirmation to customer
        await sendCustomerConfirmation({
            to: email,
            customerName: contactName,
            resendApiKey: RESEND_API_KEY
        });

        return new Response(JSON.stringify({
            success: true,
            message: 'Thank you for contacting us! We will get back to you within 24 hours.'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Contact form error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to process your request',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Send notification email to admin
async function sendAdminNotification({ companyName, contactName, email, phone, inquiryType, message, resendApiKey, contactEmail }) {
    const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 20px; }
            .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
            .value { font-size: 16px; color: #333; margin-top: 5px; }
            .message-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">🚀 New Contact Form Submission</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">AmazonReach</p>
            </div>
            <div class="content">
                <div class="field">
                    <div class="label">Company</div>
                    <div class="value">${companyName}</div>
                </div>
                <div class="field">
                    <div class="label">Contact Name</div>
                    <div class="value">${contactName}</div>
                </div>
                <div class="field">
                    <div class="label">Email</div>
                    <div class="value"><a href="mailto:${email}">${email}</a></div>
                </div>
                <div class="field">
                    <div class="label">Phone</div>
                    <div class="value">${phone}</div>
                </div>
                <div class="field">
                    <div class="label">Inquiry Type</div>
                    <div class="value">${inquiryType}</div>
                </div>
                <div class="message-box">
                    <div class="label">Message</div>
                    <div class="value">${message}</div>
                </div>
                <div class="footer">
                    <p>Received at ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: 'AmazonReach <noreply@amazonreach.com>',
            to: [contactEmail],
            subject: `[New Inquiry] ${inquiryType} - ${companyName}`,
            html: emailHTML
        })
    });

    if (!response.ok) {
        throw new Error('Failed to send admin notification');
    }

    return await response.json();
}

// Send confirmation email to customer
async function sendCustomerConfirmation({ to, customerName, resendApiKey }) {
    const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 40px; border-radius: 0 0 8px 8px; }
            .logo { font-size: 48px; margin-bottom: 10px; }
            .btn { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🚀</div>
                <h2 style="margin: 0;">Thank You for Reaching Out!</h2>
            </div>
            <div class="content">
                <p>Hi ${customerName},</p>
                <p>Thank you for contacting AmazonReach. We've received your message and our team will get back to you within 24 hours.</p>
                <p>In the meantime, feel free to explore our platform or check out our resources:</p>
                <ul>
                    <li>📊 Learn about our <strong>Analytics Dashboard</strong></li>
                    <li>🌍 Discover <strong>Global Fulfillment</strong> options</li>
                    <li>🚀 See how <strong>AI Inventory Management</strong> works</li>
                </ul>
                <p style="margin-top: 30px;">
                    <a href="https://amazonreach.pages.dev" class="btn">Visit Our Platform</a>
                </p>
                <div class="footer">
                    <p>Best regards,<br>The AmazonReach Team</p>
                    <p>If you have any urgent questions, please email us at support@amazonreach.com</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: 'AmazonReach <noreply@amazonreach.com>',
            to: [to],
            subject: 'Thank you for contacting AmazonReach',
            html: emailHTML
        })
    });

    if (!response.ok) {
        throw new Error('Failed to send customer confirmation');
    }

    return await response.json();
}
