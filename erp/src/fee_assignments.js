/**
 * Anvi Mitra ERP: Fee Assignments Module
 */

const { authenticate, requireRoles } = require('./security');
const financeRoles = ['super_admin', 'principal', 'admin', 'accountant', 'office_staff'];

function registerFeeAssignmentRoutes(app, pool) {
  app.get('/api/fees/assignments', authenticate, requireRoles(...financeRoles), async (req, res, next) => {
    try {
      if (!pool) return res.json({ assignments: [] });
      const { studentId, sessionId } = req.query;
      const schoolId = req.auth.schoolId;

      let q = `SELECT fa.*, fh.name as "feeHeadName", s.first_name || ' ' || COALESCE(s.last_name, '') as "studentName"
               FROM student_fee_assignments fa
               JOIN fee_heads fh ON fh.id = fa.fee_head_id
               JOIN students s ON s.id = fa.student_id
               WHERE ($1::uuid IS NULL OR fa.school_id = $1::uuid)`;
      const params = [schoolId];

      if (studentId) {
        params.push(studentId);
        q += ` AND fa.student_id = $${params.length}`;
      }
      if (sessionId) {
        params.push(sessionId);
        q += ` AND fa.academic_session_id = $${params.length}`;
      }

      q += ' ORDER BY fa.created_at DESC';
      const { rows } = await pool.query(q, params);
      res.json({ assignments: rows });
    } catch (err) { next(err); }
  });

  app.post('/api/fees/assignments', authenticate, requireRoles(...financeRoles), async (req, res, next) => {
    try {
      const { studentId, sessionId, feeHeadId, amount, frequency = 'monthly', startDate, dueDay = 10 } = req.body || {};
      if (!studentId || !sessionId || !feeHeadId || amount === undefined) {
        return res.status(400).json({ error: 'studentId, sessionId, feeHeadId, and amount are required' });
      }
      if (!pool) return res.status(201).json({ assignment: { id: 'mock-assign-id', studentId, amount } });

      const schoolId = req.auth.schoolId;
      const { rows } = await pool.query(
        `INSERT INTO student_fee_assignments (school_id, student_id, academic_session_id, fee_head_id, amount, frequency, start_date, due_day)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE), $8)
         RETURNING *`,
        [schoolId, studentId, sessionId, feeHeadId, amount, frequency, startDate, dueDay]
      );
      res.status(201).json({ assignment: rows[0] });
    } catch (err) { next(err); }
  });
}

module.exports = { registerFeeAssignmentRoutes };
