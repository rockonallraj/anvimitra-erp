/**
 * Anvi Mitra ERP Service Health & Diagnostic Check
 */

const http = require('http');

const url = process.env.API_URL || 'http://127.0.0.1:4000/api/health';

http.get(url, (res) => {
  let body = '';
  res.on('data', (d) => (body += d));
  res.on('end', () => {
    console.log('Health check status:', res.statusCode);
    console.log('Response:', body);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
}).on('error', (err) => {
  console.error('Health check error:', err.message);
  process.exit(1);
});
