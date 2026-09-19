/**
 * Anvi Mitra ERP: Users Management Module
 */

const { authenticate, requireRoles, hashPassword } = require('./security');

function registerUserRoutes(app, pool) {
  app.get('/api/users', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      if (!pool) return res.json({ users: [] });
      const schoolId = req.auth.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.auth.schoolId;
      let query = 'SELECT id, school_id, branch_id, email, phone, role, status, last_login_at, created_at FROM users';
      const params = [];
      if (schoolId) {
        query += ' WHERE school_id = $1';
        params.push(schoolId);
      }
      query += ' ORDER BY created_at DESC LIMIT 100';
      const { rows } = await pool.query(query, params);
      res.json({ users: rows });
    } catch (err) { next(err); }
  });

  app.post('/api/users', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      const { email, phone, password, role = 'teacher', schoolId = null, branchId = null } = req.body || {};
      if (!email && !phone) return res.status(400).json({ error: 'email or phone is required' });
      if (!password) return res.status(400).json({ error: 'password is required' });

      const targetSchoolId = req.auth.role === 'super_admin' ? schoolId : req.auth.schoolId;
      const passHash = await hashPassword(password);

      if (!pool) return res.status(201).json({ user: { id: 'mock-user-id', email, role, schoolId: targetSchoolId } });

      const { rows } = await pool.query(
        'INSERT INTO users (school_id, branch_id, email, phone, password_hash, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, school_id, branch_id, email, phone, role, status, created_at',
        [targetSchoolId, branchId, email ? String(email).trim().toLowerCase() : null, phone, passHash, role, 'active']
      );
      res.status(201).json({ user: rows[0] });
    } catch (err) { next(err); }
  });
}

module.exports = { registerUserRoutes };
