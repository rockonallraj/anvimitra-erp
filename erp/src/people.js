/**
 * Anvi Mitra ERP: People & Directory Module
 */

const { authenticate } = require('./security');

function registerPeopleRoutes(app, pool) {
  app.get('/api/people/search', authenticate, async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!pool) return res.json({ people: [] });

      const schoolId = req.auth.schoolId;
      const { rows } = await pool.query(
        `SELECT id, email, phone, role, status FROM users
         WHERE ($1::uuid IS NULL OR school_id = $1::uuid)
           AND (email ILIKE '%' || $2 || '%' OR phone ILIKE '%' || $2 || '%')
         LIMIT 20`,
        [schoolId, q]
      );
      res.json({ people: rows });
    } catch (err) { next(err); }
  });
}

module.exports = { registerPeopleRoutes };
