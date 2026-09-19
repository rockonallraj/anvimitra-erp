/**
 * Anvi Mitra ERP: Core General API Routes
 */

const { authenticate } = require('./security');

function registerRoutes(app, pool) {
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'online',
      system: 'Anvi Mitra Multi-School ERP',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/me', authenticate, (req, res) => {
    res.json({ user: req.auth });
  });
}

module.exports = { registerRoutes };
