/**
 * Anvi Mitra ERP: Marks Permissions Enforcement Module
 */

const { authenticate, requireRoles } = require('./security');

function registerMarksPermissionRoutes(app, pool) {
  app.get('/api/marks/permissions/check', authenticate, async (req, res, next) => {
    try {
      const { teacherId, classId, sectionId, subjectId, examSubjectId } = req.query;
      const targetTeacher = teacherId || req.auth.sub;

      if (!pool) return res.json({ allowed: true, reason: 'standalone_mode' });

      if (['super_admin', 'principal', 'admin'].includes(req.auth.role)) {
        return res.json({ allowed: true, reason: 'administrative_override' });
      }

      const { rows } = await pool.query(
        `SELECT 1 FROM teacher_subject_assignments
         WHERE teacher_id = $1 AND class_id = $2 AND section_id = $3 AND subject_id = $4 AND status = 'active'
         LIMIT 1`,
        [targetTeacher, classId, sectionId, subjectId]
      );

      const allowed = rows.length > 0;
      res.json({ allowed, teacherId: targetTeacher, classId, sectionId, subjectId });
    } catch (err) { next(err); }
  });
}

module.exports = { registerMarksPermissionRoutes };
