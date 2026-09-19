/**
 * Anvi Mitra ERP: Mobile Client Sync & Bootstrap Routes
 */

const { authenticate } = require('./security');

function registerMobileRoutes(app, pool) {
  app.get('/api/mobile/bootstrap', authenticate, async (req, res, next) => {
    try {
      const user = req.auth;
      let schoolConfig = { name: 'Anvi Mitra ERP', primaryColor: '#172b55', secondaryColor: '#0d9488' };
      if (pool && user.schoolId) {
        const { rows } = await pool.query(
          'SELECT s.name, ss.display_name, ss.primary_color, ss.secondary_color, ss.logo_url FROM schools s LEFT JOIN school_settings ss ON ss.school_id = s.id WHERE s.id = $1',
          [user.schoolId]
        );
        if (rows.length) {
          const s = rows[0];
          schoolConfig = {
            name: s.display_name || s.name,
            primaryColor: s.primary_color || '#172b55',
            secondaryColor: s.secondary_color || '#0d9488',
            logoUrl: s.logo_url
          };
        }
      }

      res.json({
        user,
        school: schoolConfig,
        syncIntervalSeconds: 30,
        serverTime: new Date().toISOString()
      });
    } catch (err) { next(err); }
  });
}

module.exports = { registerMobileRoutes };
