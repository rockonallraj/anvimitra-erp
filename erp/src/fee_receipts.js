/**
 * Anvi Mitra ERP: Fee Receipts Module
 */

const { authenticate, requireRoles } = require('./security');
const financeRoles = ['super_admin', 'principal', 'admin', 'accountant', 'office_staff'];

function registerFeeReceiptRoutes(app, pool) {
  app.get('/api/fees/receipts', authenticate, requireRoles(...financeRoles), async (req, res, next) => {
    try {
      if (!pool) return res.json({ receipts: [] });
      const { studentId, receiptNo } = req.query;
      const schoolId = req.auth.schoolId;

      let q = `SELECT fr.*, s.first_name || ' ' || COALESCE(s.last_name, '') as "studentName", s.admission_no as "admissionNo"
               FROM fee_receipts fr
               JOIN students s ON s.id = fr.student_id
               WHERE ($1::uuid IS NULL OR fr.school_id = $1::uuid)`;
      const params = [schoolId];

      if (studentId) {
        params.push(studentId);
        q += ` AND fr.student_id = $${params.length}`;
      }
      if (receiptNo) {
        params.push(receiptNo);
        q += ` AND fr.receipt_number ILIKE '%' || $${params.length} || '%'`;
      }
      q += ' ORDER BY fr.receipt_date DESC LIMIT 50';

      const { rows } = await pool.query(q, params);
      res.json({ receipts: rows });
    } catch (err) { next(err); }
  });

  app.get('/api/fees/receipts/:id', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.status(404).json({ error: 'Receipt not found' });
      const { rows } = await pool.query(
        `SELECT fr.*, s.first_name || ' ' || COALESCE(s.last_name, '') as "studentName", s.admission_no as "admissionNo"
         FROM fee_receipts fr
         JOIN students s ON s.id = fr.student_id
         WHERE fr.id = $1 AND ($2::uuid IS NULL OR fr.school_id = $2::uuid)`,
        [req.params.id, req.auth.schoolId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Receipt not found' });
      res.json({ receipt: rows[0] });
    } catch (err) { next(err); }
  });
}

module.exports = { registerFeeReceiptRoutes };
