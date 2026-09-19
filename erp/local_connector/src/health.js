/**
 * Anvi Mitra Local Connector: Health Endpoint Server
 */

const http = require('http');

function initHealthServer(port = 4899) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      agent: 'anvi-mitra-local-connector',
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  });

  server.listen(port, '127.0.0.1', () => {
    console.log('Local Connector health server listening on 127.0.0.1:' + port);
  });
  return server;
}

module.exports = { initHealthServer };
