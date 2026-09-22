/**
 * Anvi Mitra ERP: Schools Management Module
 */

const { authenticate, requireRoles } = require('./security');

function registerSchoolRoutes(app, pool) {
  app.get('/api/schools', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.json({ schools: [] });
      const { rows } = await pool.query(
        'SELECT id, name, code, status, created_at FROM schools ORDER BY name ASC'
      );
      res.json({ schools: rows });
    } catch (err) { next(err); }
  });

  app.post('/api/schools', authenticate, requireRoles('super_admin'), async (req, res, next) => {
    try {
      const { name, code } = req.body || {};
      if (!name || !code) return res.status(400).json({ error: 'name and code are required' });
      if (!pool) return res.json({ school: { id: 'mock-school-id', name, code: code.toUpperCase() } });

      const { rows } = await pool.query(
        'INSERT INTO schools (name, code) VALUES ($1, $2) RETURNING id, name, code, status',
        [name.trim(), code.trim().toUpperCase()]
      );
      res.status(201).json({ school: rows[0] });
    } catch (err) { next(err); }
  });

  app.get('/api/schools/:id', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.status(404).json({ error: 'School not found' });
      const { rows } = await pool.query(
        `SELECT s.id, s.name, s.code, s.status, ss.display_name, ss.logo_url, ss.primary_color, ss.secondary_color, ss.address, ss.phone, ss.email
         FROM schools s
         LEFT JOIN school_settings ss ON ss.school_id = s.id
         WHERE s.id = $1`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'School not found' });
      res.json({ school: rows[0] });
    } catch (err) { next(err); }
  });

  app.patch('/api/schools/:id', authenticate, requireRoles('super_admin'), async (req, res, next) => {
    try {
      const { name, status } = req.body || {};
      if (!pool) return res.json({ school: { id: req.params.id, name, status } });
      const { rows } = await pool.query(
        'UPDATE schools SET name = COALESCE($1, name), status = COALESCE($2, status), updated_at = now() WHERE id = $3 RETURNING *',
        [name, status, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'School not found' });
      res.json({ school: rows[0] });
    } catch (err) { next(err); }
  });

  app.put('/api/schools/:id', authenticate, requireRoles('super_admin'), async (req, res, next) => {
    try {
      const { name, code, status } = req.body || {};
      if (!pool) return res.json({ school: { id: req.params.id, name, code, status } });
      const { rows } = await pool.query(
        'UPDATE schools SET name = COALESCE($1, name), code = COALESCE($2, code), status = COALESCE($3, status), updated_at = now() WHERE id = $4 RETURNING *',
        [name, code ? code.toUpperCase() : null, status, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'School not found' });
      res.json({ school: rows[0] });
    } catch (err) { next(err); }
  });

  app.delete('/api/schools/:id', authenticate, requireRoles('super_admin'), async (req, res, next) => {
    try {
      if (!pool) return res.json({ message: 'School deleted successfully', id: req.params.id });
      const { rowCount } = await pool.query('DELETE FROM schools WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: 'School not found' });
      res.json({ message: 'School deleted successfully', id: req.params.id });
    } catch (err) { next(err); }
  });
}

module.exports = { registerSchoolRoutes };
