/**
 * Anvi Mitra ERP: Teachers Management Module
 */

const { authenticate, requireRoles } = require('./security');

function registerTeacherRoutes(app, pool) {
  app.get('/api/teachers', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.json({ teachers: [] });
      const schoolId = req.auth.schoolId;
      const { rows } = await pool.query(
        `SELECT t.id, t.school_id as "schoolId", t.branch_id as "branchId",
                t.employee_code as "employeeCode", t.first_name || ' ' || COALESCE(t.last_name, '') as "name",
                t.email, t.phone, t.designation, t.qualification, t.status
         FROM teachers t
         WHERE ($1::uuid IS NULL OR t.school_id = $1::uuid)
         ORDER BY t.first_name ASC`,
        [schoolId]
      );
      res.json({ teachers: rows });
    } catch (err) { next(err); }
  });

  app.post('/api/teachers', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      const { firstName, lastName = '', employeeCode, email = null, phone = null, designation = 'Teacher', branchId = null } = req.body || {};
      if (!firstName || !employeeCode) return res.status(400).json({ error: 'firstName and employeeCode are required' });
      if (!pool) return res.status(201).json({ teacher: { id: 'mock-teacher-id', firstName, employeeCode } });

      const schoolId = req.auth.schoolId;
      const { rows } = await pool.query(
        `INSERT INTO teachers (school_id, branch_id, employee_code, first_name, last_name, email, phone, designation, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         RETURNING *`,
        [schoolId, branchId, employeeCode.trim(), firstName.trim(), lastName.trim(), email, phone, designation]
      );
      res.status(201).json({ teacher: rows[0] });
    } catch (err) { next(err); }
  });
}

module.exports = { registerTeacherRoutes };
