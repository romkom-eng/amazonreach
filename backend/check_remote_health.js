const https = require('https');

const url = 'https://amazonreach-production.up.railway.app/api/health';

console.log(`Checking status of: ${url}`);

const req = https.get(url, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Body:', data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.setTimeout(5000, () => { // 5 second timeout
    console.error('Request timed out');
    req.destroy();
});
