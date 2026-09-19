/**
 * Anvi Mitra ERP: Sync Conflicts Resolution Module
 */

const { authenticate, requireRoles } = require('./security');

function registerConflictRoutes(app, pool) {
  app.get('/api/sync/conflicts', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      if (!pool) return res.json({ conflicts: [] });
      const { rows } = await pool.query(
        `SELECT sc.*, sd.device_name as "deviceName"
         FROM sync_conflicts sc
         LEFT JOIN sync_devices sd ON sd.id = sc.device_id
         WHERE ($1::uuid IS NULL OR sc.school_id = $1::uuid)
         ORDER BY sc.created_at DESC LIMIT 50`,
        [req.auth.schoolId]
      );
      res.json({ conflicts: rows });
    } catch (err) { next(err); }
  });

  app.post('/api/sync/conflicts/:id/resolve', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      const { resolution = 'server_wins' } = req.body || {};
      if (!pool) return res.json({ success: true, resolution });

      await pool.query(
        `UPDATE sync_conflicts SET status = 'resolved', resolution_strategy = $1, resolved_at = now(), resolved_by = $2 WHERE id = $3`,
        [resolution, req.auth.sub, req.params.id]
      );
      res.json({ success: true, conflictId: req.params.id, resolution });
    } catch (err) { next(err); }
  });
}

module.exports = { registerConflictRoutes };
