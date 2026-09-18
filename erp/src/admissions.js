const { authenticate, requireRoles } = require('./auth');

function registerAdmissionRoutes(app, pool) {
  const staffRoles = ['super_admin', 'principal', 'admin', 'office_staff'];

  app.get('/api/admissions', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const schoolId = req.auth.schoolId;
      const branchId = req.auth.branchId || null;
      const { sessionId, classId, status } = req.query || {};

      const params = [schoolId];
      const conditions = ['a.school_id = $1'];

      if (branchId) {
        params.push(branchId);
        conditions.push(`(a.branch_id = $${params.length} OR a.branch_id IS NULL)`);
      }
      if (sessionId) {
        params.push(sessionId);
        conditions.push(`a.session_id = $${params.length}`);
      }
      if (classId) {
        params.push(classId);
        conditions.push(`a.applied_class_id = $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`a.status = $${params.length}`);
      }

      const { rows } = await pool.query(
        `SELECT a.id, a.application_no AS "applicationNo", a.session_id AS "sessionId",
                sess.name AS "sessionName", a.applied_class_id AS "appliedClassId",
                c.name AS "appliedClassName", a.student_name AS "studentName",
                a.date_of_birth AS "dateOfBirth", a.gender, a.father_name AS "fatherName",
                a.mother_name AS "motherName", a.guardian_phone AS "guardianPhone",
                a.status, a.branch_id AS "branchId", b.name AS "branchName",
                a.created_at AS "createdAt", a.updated_at AS "updatedAt"
         FROM admissions a
         LEFT JOIN academic_sessions sess ON sess.id = a.session_id AND sess.school_id = a.school_id
         LEFT JOIN classes c ON c.id = a.applied_class_id AND c.school_id = a.school_id
         LEFT JOIN branches b ON b.id = a.branch_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY a.created_at DESC`,
        params
      );

      res.json({ applications: rows });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/admissions', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const b = req.body || {};
      const studentName = String(b.studentName || '').trim();
      const applicationNo = String(b.applicationNo || ('APP-' + Date.now().toString(36).toUpperCase())).trim();
      const sessionId = b.sessionId || null;

      if (!studentName || !sessionId) {
        return res.status(400).json({ error: 'studentName and sessionId are required' });
      }

      const branchId = b.branchId || req.auth.branchId || null;

      const { rows } = await pool.query(
        `INSERT INTO admissions (
           school_id, branch_id, application_no, session_id, applied_class_id,
           student_name, date_of_birth, gender, father_name, mother_name,
           guardian_phone, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
         RETURNING id, application_no AS "applicationNo", session_id AS "sessionId",
                   applied_class_id AS "appliedClassId", student_name AS "studentName",
                   date_of_birth AS "dateOfBirth", gender, father_name AS "fatherName",
                   mother_name AS "motherName", guardian_phone AS "guardianPhone",
                   status, branch_id AS "branchId", created_at AS "createdAt"`,
        [
          req.auth.schoolId,
          branchId,
          applicationNo,
          sessionId,
          b.appliedClassId || null,
          studentName,
          b.dateOfBirth || null,
          b.gender || null,
          b.fatherName || null,
          b.motherName || null,
          b.guardianPhone || null,
        ]
      );

      res.status(201).json({ application: rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Application number already exists' });
      }
      next(err);
    }
  });

  app.get('/api/admissions/:id', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT a.id, a.application_no AS "applicationNo", a.session_id AS "sessionId",
                sess.name AS "sessionName", a.applied_class_id AS "appliedClassId",
                c.name AS "appliedClassName", a.student_name AS "studentName",
                a.date_of_birth AS "dateOfBirth", a.gender, a.father_name AS "fatherName",
                a.mother_name AS "motherName", a.guardian_phone AS "guardianPhone",
                a.status, a.branch_id AS "branchId", a.created_at AS "createdAt"
         FROM admissions a
         LEFT JOIN academic_sessions sess ON sess.id = a.session_id AND sess.school_id = a.school_id
         LEFT JOIN classes c ON c.id = a.applied_class_id AND c.school_id = a.school_id
         WHERE a.id = $1 AND a.school_id = $2`,
        [req.params.id, req.auth.schoolId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Application not found' });
      res.json({ application: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/admissions/:id/status', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const status = String(req.body?.status || '').trim().toLowerCase();
      if (!['pending', 'approved', 'rejected', 'enrolled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid admission status' });
      }
      const { rows } = await pool.query(
        `UPDATE admissions SET status = $1, updated_at = now()
         WHERE id = $2 AND school_id = $3
         RETURNING id, application_no AS "applicationNo", status, updated_at AS "updatedAt"`,
        [status, req.params.id, req.auth.schoolId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Application not found' });
      res.json({ application: rows[0] });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { registerAdmissionRoutes };
