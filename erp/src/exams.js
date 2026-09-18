const { authenticate, requireRoles } = require('./auth');

function registerExamRoutes(app, pool) {
  const staffRoles = ['super_admin', 'principal', 'admin', 'teacher'];
  const managerRoles = ['super_admin', 'principal', 'admin'];

  // 1. Exam Types (e.g. FA1, FA2, Half Yearly, Yearly)
  app.get('/api/exam-types', authenticate, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, code, display_order AS "displayOrder", status
         FROM exam_types
         WHERE school_id = $1 AND status = 'active'
         ORDER BY display_order ASC, name ASC`,
        [req.auth.schoolId]
      );
      res.json({ examTypes: rows });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/exam-types', authenticate, requireRoles(...managerRoles), async (req, res, next) => {
    try {
      const b = req.body || {};
      const name = String(b.name || '').trim();
      const code = String(b.code || name).trim().toUpperCase();
      if (!name) return res.status(400).json({ error: 'name is required' });

      const { rows } = await pool.query(
        `INSERT INTO exam_types (school_id, name, code, display_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, code, display_order AS "displayOrder", status`,
        [req.auth.schoolId, name, code, Number(b.displayOrder || 0)]
      );
      res.status(201).json({ examType: rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Exam type code already exists' });
      }
      next(err);
    }
  });

  // 2. Exams
  app.get('/api/exams', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const schoolId = req.auth.schoolId;
      const branchId = req.auth.branchId || null;
      const { sessionId, examTypeId, status } = req.query || {};

      const params = [schoolId];
      const conditions = ['e.school_id = $1'];

      if (branchId) {
        params.push(branchId);
        conditions.push(`(e.branch_id = $${params.length} OR e.branch_id IS NULL)`);
      }
      if (sessionId) {
        params.push(sessionId);
        conditions.push(`e.session_id = $${params.length}`);
      }
      if (examTypeId) {
        params.push(examTypeId);
        conditions.push(`e.exam_type_id = $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`e.status = $${params.length}`);
      }

      const { rows } = await pool.query(
        `SELECT e.id, e.name, e.status, e.starts_on AS "startsOn", e.ends_on AS "endsOn",
                e.session_id AS "sessionId", sess.name AS "sessionName",
                e.exam_type_id AS "examTypeId", et.name AS "typeName", et.code AS "typeCode",
                e.branch_id AS "branchId"
         FROM exams e
         JOIN academic_sessions sess ON sess.id = e.session_id AND sess.school_id = e.school_id
         LEFT JOIN exam_types et ON et.id = e.exam_type_id AND et.school_id = e.school_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY e.starts_on DESC NULLS LAST, e.name ASC`,
        params
      );

      res.json({ exams: rows });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/exams', authenticate, requireRoles(...managerRoles), async (req, res, next) => {
    try {
      const b = req.body || {};
      const name = String(b.name || '').trim();
      const sessionId = b.sessionId || null;
      const examTypeId = b.examTypeId || null;

      if (!name || !sessionId) {
        return res.status(400).json({ error: 'name and sessionId are required' });
      }

      const branchId = b.branchId || req.auth.branchId || null;

      const { rows } = await pool.query(
        `INSERT INTO exams (school_id, branch_id, session_id, exam_type_id, name, starts_on, ends_on, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
         RETURNING id, name, session_id AS "sessionId", exam_type_id AS "examTypeId",
                   starts_on AS "startsOn", ends_on AS "endsOn", status, branch_id AS "branchId"`,
        [req.auth.schoolId, branchId, sessionId, examTypeId, name, b.startsOn || null, b.endsOn || null]
      );

      res.status(201).json({ exam: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  // 3. Exam Subjects
  app.get('/api/exam-subjects', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const schoolId = req.auth.schoolId;
      const branchId = req.auth.branchId || null;
      const { examId, classId } = req.query || {};

      if (!examId) return res.status(400).json({ error: 'examId is required' });

      const params = [schoolId, examId];
      let classFilter = '';
      if (classId) {
        params.push(classId);
        classFilter = `AND es.class_id = $${params.length}`;
      }
      if (branchId) {
        params.push(branchId);
        classFilter += ` AND (es.branch_id = $${params.length} OR es.branch_id IS NULL)`;
      }

      const { rows } = await pool.query(
        `SELECT es.id, es.exam_id AS "examId", es.class_id AS "classId", c.name AS "className",
                es.subject_id AS "subjectId", s.name AS "subjectName", s.code AS "subjectCode",
                es.max_marks AS "maxMarks", es.pass_marks AS "passMarks", es.exam_date AS "examDate",
                es.branch_id AS "branchId"
         FROM exam_subjects es
         JOIN classes c ON c.id = es.class_id AND c.school_id = es.school_id
         JOIN subjects s ON s.id = es.subject_id AND s.school_id = es.school_id
         WHERE es.school_id = $1 AND es.exam_id = $2 ${classFilter}
         ORDER BY c.name ASC, s.name ASC`,
        params
      );

      res.json({ examSubjects: rows });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/exam-subjects', authenticate, requireRoles(...managerRoles), async (req, res, next) => {
    try {
      const b = req.body || {};
      const { examId, classId, subjectId, maxMarks, passMarks, examDate } = b;
      if (!examId || !classId || !subjectId || maxMarks == null) {
        return res.status(400).json({ error: 'examId, classId, subjectId and maxMarks are required' });
      }
      const numMax = Number(maxMarks);
      if (!Number.isFinite(numMax) || numMax <= 0) {
        return res.status(400).json({ error: 'maxMarks must be a positive number' });
      }

      const branchId = b.branchId || req.auth.branchId || null;

      const { rows } = await pool.query(
        `INSERT INTO exam_subjects (school_id, branch_id, exam_id, class_id, subject_id, max_marks, pass_marks, exam_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (exam_id, class_id, subject_id)
         DO UPDATE SET max_marks = EXCLUDED.max_marks, pass_marks = EXCLUDED.pass_marks,
                       exam_date = EXCLUDED.exam_date, updated_at = now()
         RETURNING id, exam_id AS "examId", class_id AS "classId", subject_id AS "subjectId",
                   max_marks AS "maxMarks", pass_marks AS "passMarks", exam_date AS "examDate"`,
        [req.auth.schoolId, branchId, examId, classId, subjectId, numMax, passMarks != null ? Number(passMarks) : null, examDate || null]
      );

      res.status(201).json({ examSubject: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  // 4. Exam Students (for mark entry)
  app.get('/api/exam-students', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const { examSubjectId } = req.query || {};
      if (!examSubjectId) return res.status(400).json({ error: 'examSubjectId is required' });

      const subjectResult = await pool.query(
        `SELECT es.class_id, e.session_id, es.branch_id
         FROM exam_subjects es
         JOIN exams e ON e.id = es.exam_id AND e.school_id = es.school_id
         WHERE es.id = $1 AND es.school_id = $2`,
        [examSubjectId, req.auth.schoolId]
      );
      if (!subjectResult.rows.length) return res.status(404).json({ error: 'Exam subject not found' });
      const { class_id, session_id, branch_id } = subjectResult.rows[0];

      const params = [req.auth.schoolId, session_id, class_id];
      let branchFilter = '';
      const effectiveBranch = req.auth.branchId || branch_id;
      if (effectiveBranch) {
        params.push(effectiveBranch);
        branchFilter = `AND (en.branch_id = $${params.length} OR en.branch_id IS NULL)`;
      }

      const { rows } = await pool.query(
        `SELECT s.id, s.admission_no AS "admissionNo", s.full_name AS "fullName",
                s.roll_no AS "rollNo", en.section_id AS "sectionId", sec.name AS "sectionName"
         FROM enrollments en
         JOIN students s ON s.id = en.student_id AND s.school_id = en.school_id AND s.status = 'active'
         JOIN sections sec ON sec.id = en.section_id AND sec.school_id = en.school_id
         WHERE en.school_id = $1 AND en.session_id = $2 AND en.class_id = $3 AND en.status = 'active'
           ${branchFilter}
         ORDER BY s.full_name ASC`,
        params
      );

      res.json({ students: rows });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { registerExamRoutes };
