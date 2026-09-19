/**
 * Anvi Mitra ERP: Fee Ledger Module
 */

const { authenticate, requireRoles } = require('./security');
const financeRoles = ['super_admin', 'principal', 'admin', 'accountant', 'office_staff'];

function registerFeeLedgerRoutes(app, pool) {
  app.get('/api/fees/ledger/:studentId', authenticate, requireRoles(...financeRoles, 'parent'), async (req, res, next) => {
    try {
      if (!pool) return res.json({ ledger: [] });
      const schoolId = req.auth.schoolId;
      const { rows } = await pool.query(
        `SELECT fl.*, fh.name as "feeHeadName"
         FROM fee_ledger fl
         LEFT JOIN fee_heads fh ON fh.id = fl.fee_head_id
         WHERE fl.student_id = $1 AND ($2::uuid IS NULL OR fl.school_id = $2::uuid)
         ORDER BY fl.entry_date DESC, fl.created_at DESC`,
        [req.params.studentId, schoolId]
      );
      res.json({ ledger: rows });
    } catch (err) { next(err); }
  });
}

module.exports = { registerFeeLedgerRoutes };
