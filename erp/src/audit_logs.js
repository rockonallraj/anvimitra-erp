/**
 * Anvi Mitra ERP: Audit Logs Module
 */

const { authenticate, requireRoles } = require('./security');

function registerAuditLogRoutes(app, pool) {
  app.get('/api/audit-logs', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      if (!pool) return res.json({ logs: [] });
      const schoolId = req.auth.role === 'super_admin' ? req.query.schoolId : req.auth.schoolId;

      let q = `SELECT a.*, u.email as "userEmail", u.role as "userRole"
               FROM audit_logs a
               LEFT JOIN users u ON u.id = a.user_id
               WHERE ($1::uuid IS NULL OR a.school_id = $1::uuid)
               ORDER BY a.created_at DESC LIMIT 100`;
      const { rows } = await pool.query(q, [schoolId || null]);
      res.json({ logs: rows });
    } catch (err) { next(err); }
  });
}

module.exports = { registerAuditLogRoutes };
