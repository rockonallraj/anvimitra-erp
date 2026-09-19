/**
 * Anvi Mitra ERP: Students Directory and Linking Module
 */

const { authenticate } = require('./security');

function registerStudentRoutes(app, pool) {
  app.get('/api/students/search', authenticate, async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!pool) return res.json({ students: [] });

      const schoolId = req.auth.schoolId;
      const { rows } = await pool.query(
        `SELECT s.id, s.admission_no as "admissionNo", s.first_name || ' ' || COALESCE(s.last_name, '') as "fullName",
                s.gender, s.dob, s.roll_no as "rollNo", s.status
         FROM students s
         WHERE ($1::uuid IS NULL OR s.school_id = $1::uuid)
           AND (s.admission_no ILIKE '%' || $2 || '%' OR s.first_name ILIKE '%' || $2 || '%' OR s.last_name ILIKE '%' || $2 || '%')
         LIMIT 25`,
        [schoolId, q]
      );
      res.json({ students: rows });
    } catch (err) { next(err); }
  });

  app.get('/api/students/:id/profile', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.status(404).json({ error: 'Student not found' });
      const { rows } = await pool.query(
        `SELECT s.*, p.first_name || ' ' || COALESCE(p.last_name, '') as "parentName", p.phone as "parentPhone"
         FROM students s
         LEFT JOIN parents p ON p.id = s.parent_id
         WHERE s.id = $1 AND ($2::uuid IS NULL OR s.school_id = $2::uuid)`,
        [req.params.id, req.auth.schoolId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Student not found' });
      res.json({ student: rows[0] });
    } catch (err) { next(err); }
  });
}

module.exports = { registerStudentRoutes };
