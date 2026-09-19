/**
 * Anvi Mitra ERP: Enrollment & Session Allocation Module
 */

const { authenticate, requireRoles } = require('./security');

function registerEnrollmentRoutes(app, pool) {
  app.get('/api/enrollments', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.json({ enrollments: [] });
      const { classId, sectionId, sessionId } = req.query;
      const schoolId = req.auth.schoolId;

      let q = `SELECT e.*, s.first_name || ' ' || COALESCE(s.last_name, '') as "studentName",
                      s.admission_no as "admissionNo", c.name as "className", sec.name as "sectionName"
               FROM enrollments e
               JOIN students s ON s.id = e.student_id
               JOIN classes c ON c.id = e.class_id
               LEFT JOIN sections sec ON sec.id = e.section_id
               WHERE ($1::uuid IS NULL OR e.school_id = $1::uuid)`;
      const params = [schoolId];

      if (classId) {
        params.push(classId);
        q += ` AND e.class_id = $${params.length}`;
      }
      if (sectionId) {
        params.push(sectionId);
        q += ` AND e.section_id = $${params.length}`;
      }
      if (sessionId) {
        params.push(sessionId);
        q += ` AND e.academic_session_id = $${params.length}`;
      }

      q += ' ORDER BY s.first_name ASC LIMIT 100';
      const { rows } = await pool.query(q, params);
      res.json({ enrollments: rows });
    } catch (err) { next(err); }
  });
}

module.exports = { registerEnrollmentRoutes };
