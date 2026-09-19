/**
 * Anvi Mitra ERP: Fee Installments Module
 */

const { authenticate, requireRoles } = require('./security');
const financeRoles = ['super_admin', 'principal', 'admin', 'accountant', 'office_staff'];

function registerFeeInstallmentRoutes(app, pool) {
  app.get('/api/fees/installments', authenticate, requireRoles(...financeRoles), async (req, res, next) => {
    try {
      if (!pool) return res.json({ installments: [] });
      const { studentId, status } = req.query;
      const schoolId = req.auth.schoolId;

      let q = `SELECT fi.*, fh.name as "feeHeadName"
               FROM fee_installments fi
               JOIN student_fee_assignments fa ON fa.id = fi.assignment_id
               JOIN fee_heads fh ON fh.id = fa.fee_head_id
               WHERE ($1::uuid IS NULL OR fi.school_id = $1::uuid)`;
      const params = [schoolId];

      if (studentId) {
        params.push(studentId);
        q += ` AND fi.student_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        q += ` AND fi.status = $${params.length}`;
      }

      q += ' ORDER BY fi.due_date ASC';
      const { rows } = await pool.query(q, params);
      res.json({ installments: rows });
    } catch (err) { next(err); }
  });
}

module.exports = { registerFeeInstallmentRoutes };
