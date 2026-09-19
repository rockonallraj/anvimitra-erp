/**
 * Anvi Mitra ERP: Report Card List & Registry Routes
 */

const { authenticate } = require('./security');

function registerReportCardListRoutes(app, pool) {
  app.get('/api/report-cards/list', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.json({ reportCards: [] });
      const { classId, sectionId, examId } = req.query;
      const schoolId = req.auth.schoolId;

      let q = `SELECT rc.*, s.first_name || ' ' || COALESCE(s.last_name, '') as "studentName",
                      s.admission_no as "admissionNo"
               FROM report_cards rc
               JOIN students s ON s.id = rc.student_id
               WHERE ($1::uuid IS NULL OR rc.school_id = $1::uuid)`;
      const params = [schoolId];

      if (classId) {
        params.push(classId);
        q += ` AND rc.class_id = $${params.length}`;
      }
      if (examId) {
        params.push(examId);
        q += ` AND rc.exam_id = $${params.length}`;
      }
      q += ' ORDER BY rc.created_at DESC LIMIT 100';

      const { rows } = await pool.query(q, params);
      res.json({ reportCards: rows });
    } catch (err) { next(err); }
  });
}

module.exports = { registerReportCardListRoutes };
