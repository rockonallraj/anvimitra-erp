/**
 * Anvi Mitra ERP: Branches Management Module
 */

const { authenticate, requireRoles } = require('./security');

function registerBranchRoutes(app, pool) {
  app.get('/api/schools/:schoolId/branches', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.json({ branches: [] });
      const { rows } = await pool.query(
        'SELECT id, school_id, name, code, is_main, status, address, phone, email FROM branches WHERE school_id = $1 ORDER BY is_main DESC, name ASC',
        [req.params.schoolId]
      );
      res.json({ branches: rows });
    } catch (err) { next(err); }
  });

  app.post('/api/schools/:schoolId/branches', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      const { name, code, isMain = false, address = null, phone = null, email = null } = req.body || {};
      if (!name || !code) return res.status(400).json({ error: 'name and code are required' });
      if (!pool) return res.json({ branch: { id: 'mock-branch-id', schoolId: req.params.schoolId, name, code } });

      const { rows } = await pool.query(
        'INSERT INTO branches (school_id, name, code, is_main, address, phone, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [req.params.schoolId, name.trim(), code.trim().toUpperCase(), Boolean(isMain), address, phone, email]
      );
      res.status(201).json({ branch: rows[0] });
    } catch (err) { next(err); }
  });
}

module.exports = { registerBranchRoutes };
