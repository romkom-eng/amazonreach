const { Resend } = require('resend');

try {
    console.log('Attempting to initialize Resend without key...');
    const resend = new Resend(undefined);
    console.log('Success (surprisingly):', resend);
} catch (error) {
    console.error('Caught expected error:', error.message);
}
