const { authenticate, requireRoles } = require('./auth');

function registerStudentCrudRoutes(app, pool) {
  const staffRoles = ['super_admin', 'principal', 'admin', 'office_staff', 'teacher', 'accountant'];
  const editRoles = ['super_admin', 'principal', 'admin', 'office_staff'];

  // 1. List students
  app.get('/api/students', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const schoolId = req.auth.schoolId;
      const branchId = req.auth.branchId || null;
      const { classId, sectionId, sessionId, status, q } = req.query || {};

      const params = [schoolId];
      const conditions = ['s.school_id = $1'];

      if (branchId) {
        params.push(branchId);
        conditions.push(`(s.branch_id = $${params.length} OR s.branch_id IS NULL)`);
      }
      if (status) {
        params.push(status);
        conditions.push(`s.status = $${params.length}`);
      }
      if (classId) {
        params.push(classId);
        conditions.push(`en.class_id = $${params.length}`);
      }
      if (sectionId) {
        params.push(sectionId);
        conditions.push(`en.section_id = $${params.length}`);
      }
      if (sessionId) {
        params.push(sessionId);
        conditions.push(`en.session_id = $${params.length}`);
      }
      if (q) {
        params.push(`%${q.trim()}%`);
        conditions.push(`(s.full_name ILIKE $${params.length} OR s.admission_no ILIKE $${params.length})`);
      }

      const { rows } = await pool.query(
        `SELECT s.id, s.admission_no AS "admissionNo", s.admission_no AS admission_no,
                s.roll_no AS "rollNo", s.roll_no AS roll_no,
                s.full_name AS "fullName", s.full_name AS full_name,
                s.date_of_birth AS "dateOfBirth", s.gender, s.photo_url AS "photoUrl",
                s.status, s.branch_id AS "branchId", b.name AS "branchName",
                en.id AS "enrollmentId", en.session_id AS "sessionId", sess.name AS "sessionName",
                en.class_id AS "classId", c.name AS "className", c.name AS class_name,
                en.section_id AS "sectionId", sec.name AS "sectionName", sec.name AS section_name
         FROM students s
         LEFT JOIN branches b ON b.id = s.branch_id
         LEFT JOIN enrollments en ON en.student_id = s.id AND en.school_id = s.school_id AND en.status = 'active'
         LEFT JOIN academic_sessions sess ON sess.id = en.session_id AND sess.school_id = s.school_id
         LEFT JOIN classes c ON c.id = en.class_id AND c.school_id = s.school_id
         LEFT JOIN sections sec ON sec.id = en.section_id AND sec.school_id = s.school_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY s.full_name ASC
         LIMIT 500`,
        params
      );

      res.json({ students: rows, data: rows });
    } catch (err) {
      next(err);
    }
  });

  // 2. Search students autocomplete
  app.get('/api/students/search', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
      const params = [req.auth.schoolId, `%${q}%`];
      let branchFilter = '';

      if (req.auth.branchId) {
        params.push(req.auth.branchId);
        branchFilter = `AND (s.branch_id = $${params.length} OR s.branch_id IS NULL)`;
      }

      const { rows } = await pool.query(
        `SELECT s.id, s.admission_no AS "admissionNo", s.full_name AS "fullName",
                s.roll_no AS "rollNo", s.status, s.branch_id AS "branchId", b.name AS "branchName",
                c.name AS "className", sec.name AS "sectionName"
         FROM students s
         LEFT JOIN branches b ON b.id = s.branch_id
         LEFT JOIN enrollments en ON en.student_id = s.id AND en.school_id = s.school_id AND en.status = 'active'
         LEFT JOIN classes c ON c.id = en.class_id
         LEFT JOIN sections sec ON sec.id = en.section_id
         WHERE s.school_id = $1 AND (s.full_name ILIKE $2 OR s.admission_no ILIKE $2)
           ${branchFilter}
         ORDER BY s.full_name ASC
         LIMIT ${limit}`,
        params
      );

      res.json({ students: rows });
    } catch (err) {
      next(err);
    }
  });

  // 3. Single student details
  app.get('/api/students/:id', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const params = [req.params.id, req.auth.schoolId];
      let branchFilter = '';
      if (req.auth.branchId) {
        params.push(req.auth.branchId);
        branchFilter = `AND (s.branch_id = $${params.length} OR s.branch_id IS NULL)`;
      }

      const { rows } = await pool.query(
        `SELECT s.id, s.admission_no AS "admissionNo", s.admission_no AS admission_no,
                s.roll_no AS "rollNo", s.roll_no AS roll_no,
                s.full_name AS "fullName", s.full_name AS full_name,
                s.date_of_birth AS "dateOfBirth", s.gender, s.photo_url AS "photoUrl",
                s.status, s.admission_date AS "admissionDate",
                s.branch_id AS "branchId", b.name AS "branchName",
                en.id AS "enrollmentId", en.session_id AS "sessionId", sess.name AS "sessionName",
                en.class_id AS "classId", c.name AS "className", c.name AS class_name,
                en.section_id AS "sectionId", sec.name AS "sectionName", sec.name AS section_name
         FROM students s
         LEFT JOIN branches b ON b.id = s.branch_id
         LEFT JOIN enrollments en ON en.student_id = s.id AND en.school_id = s.school_id AND en.status = 'active'
         LEFT JOIN academic_sessions sess ON sess.id = en.session_id AND sess.school_id = s.school_id
         LEFT JOIN classes c ON c.id = en.class_id AND c.school_id = s.school_id
         LEFT JOIN sections sec ON sec.id = en.section_id AND sec.school_id = s.school_id
         WHERE s.id = $1 AND s.school_id = $2 ${branchFilter}`,
        params
      );

      if (!rows.length) return res.status(404).json({ error: 'Student not found' });
      res.json({ student: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  // 4. Update student
  app.patch('/api/students/:id', authenticate, requireRoles(...editRoles), async (req, res, next) => {
    try {
      const b = req.body || {};
      const fields = {
        full_name: b.fullName !== undefined ? b.fullName : b.name,
        roll_no: b.rollNo,
        date_of_birth: b.dateOfBirth,
        gender: b.gender,
        photo_url: b.photoUrl,
        status: b.status,
      };

      const sets = [];
      const vals = [];
      for (const [col, val] of Object.entries(fields)) {
        if (val !== undefined) {
          vals.push(val);
          sets.push(`${col} = $${vals.length}`);
        }
      }

      if (sets.length) {
        vals.push(req.params.id, req.auth.schoolId);
        const { rows } = await pool.query(
          `UPDATE students SET ${sets.join(', ')}, updated_at = now()
           WHERE id = $${vals.length - 1} AND school_id = $${vals.length}
           RETURNING id, admission_no AS "admissionNo", full_name AS "fullName", roll_no AS "rollNo", status`,
          vals
        );
        if (!rows.length) return res.status(404).json({ error: 'Student not found' });
      }

      if (b.classId || b.sectionId) {
        await pool.query(
          `UPDATE enrollments SET class_id = COALESCE($1, class_id), section_id = COALESCE($2, section_id), updated_at = now()
           WHERE student_id = $3 AND school_id = $4 AND status = 'active'`,
          [b.classId || null, b.sectionId || null, req.params.id, req.auth.schoolId]
        );
      }

      const { rows: updatedRows } = await pool.query(
        `SELECT s.id, s.admission_no AS "admissionNo", s.full_name AS "fullName", s.roll_no AS "rollNo",
                s.date_of_birth AS "dateOfBirth", s.gender, s.status,
                c.name AS "className", sec.name AS "sectionName"
         FROM students s
         LEFT JOIN enrollments en ON en.student_id = s.id AND en.status = 'active'
         LEFT JOIN classes c ON c.id = en.class_id
         LEFT JOIN sections sec ON sec.id = en.section_id
         WHERE s.id = $1 AND s.school_id = $2`,
        [req.params.id, req.auth.schoolId]
      );

      res.json({ student: updatedRows[0] || { id: req.params.id } });
    } catch (err) {
      next(err);
    }
  });

  // 5. Student Documents
  app.get('/api/students/:id/documents', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, student_id AS "studentId", document_type AS "documentType",
                document_no AS "documentNo", file_url AS "fileUrl", created_at AS "createdAt"
         FROM student_documents
         WHERE student_id = $1 AND school_id = $2
         ORDER BY created_at DESC`,
        [req.params.id, req.auth.schoolId]
      );
      res.json({ documents: rows });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/students/:id/documents', authenticate, requireRoles(...editRoles), async (req, res, next) => {
    try {
      const b = req.body || {};
      const documentType = String(b.documentType || 'General').trim();
      const documentNo = String(b.documentNo || '').trim();
      const fileUrl = b.fileUrl || null;

      const { rows } = await pool.query(
        `INSERT INTO student_documents (school_id, student_id, document_type, document_no, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, student_id AS "studentId", document_type AS "documentType",
                   document_no AS "documentNo", file_url AS "fileUrl", created_at AS "createdAt"`,
        [req.auth.schoolId, req.params.id, documentType, documentNo, fileUrl]
      );

      res.status(201).json({ document: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  // 6. Direct Create Student
  app.post('/api/students', authenticate, requireRoles(...editRoles), async (req, res, next) => {
    const client = await pool.connect();
    try {
      const b = req.body || {};
      const fullName = String(b.fullName || b.name || '').trim();
      const admissionNo = String(b.admissionNo || ('ADM' + Math.floor(Math.random() * 90000 + 10000))).trim();
      const rollNo = b.rollNo ? String(b.rollNo).trim() : null;
      const gender = b.gender || 'other';
      const dob = b.dateOfBirth || null;
      const branchId = b.branchId || req.auth.branchId || null;
      const status = b.status || 'active';

      if (!fullName) return res.status(400).json({ error: 'Full name is required' });

      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO students (school_id, branch_id, admission_no, full_name, roll_no, gender, date_of_birth, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, admission_no AS "admissionNo", full_name AS "fullName", roll_no AS "rollNo", status, branch_id AS "branchId"`,
        [req.auth.schoolId, branchId, admissionNo, fullName, rollNo, gender, dob, status]
      );
      const student = rows[0];

      if (b.classId || b.sectionId) {
        await client.query(
          `INSERT INTO enrollments (school_id, student_id, class_id, section_id, session_id, status)
           VALUES ($1, $2, $3, $4, $5, 'active')`,
          [req.auth.schoolId, student.id, b.classId || null, b.sectionId || null, b.sessionId || null]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Student created successfully', student });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (err.code === '23505') return res.status(409).json({ error: 'Admission number already exists' });
      next(err);
    } finally {
      client.release();
    }
  });

  // 7. Delete Student
  app.delete('/api/students/:id', authenticate, requireRoles(...editRoles), async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM student_documents WHERE student_id = $1 AND school_id = $2', [req.params.id, req.auth.schoolId]);
      await client.query('DELETE FROM student_attendance WHERE student_id = $1 AND school_id = $2', [req.params.id, req.auth.schoolId]);
      await client.query('DELETE FROM enrollments WHERE student_id = $1 AND school_id = $2', [req.params.id, req.auth.schoolId]);
      const { rowCount } = await client.query('DELETE FROM students WHERE id = $1 AND school_id = $2', [req.params.id, req.auth.schoolId]);
      if (!rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Student not found' });
      }
      await client.query('COMMIT');
      res.json({ message: 'Student deleted successfully', id: req.params.id });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  });
}

module.exports = { registerStudentCrudRoutes };
