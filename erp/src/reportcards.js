const { authenticate, requireRoles } = require('./auth');

function registerReportCardRoutes(app, pool) {
  const staffRoles = ['super_admin', 'principal', 'admin', 'teacher'];
  const adminRoles = ['super_admin', 'principal', 'admin'];

  // 1. Templates
  app.get('/api/report-card/templates', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, template_key AS "templateKey", layout,
                is_default AS "isDefault", status, created_at AS "createdAt"
         FROM report_card_templates
         WHERE school_id = $1 AND status = 'active'
         ORDER BY is_default DESC, name ASC`,
        [req.auth.schoolId]
      );
      res.json({ templates: rows });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/report-card/templates', authenticate, requireRoles(...adminRoles), async (req, res, next) => {
    try {
      const b = req.body || {};
      const name = String(b.name || '').trim();
      const templateKey = String(b.templateKey || 'standard').trim();
      if (!name) return res.status(400).json({ error: 'name is required' });

      if (b.isDefault) {
        await pool.query(`UPDATE report_card_templates SET is_default = false WHERE school_id = $1`, [req.auth.schoolId]);
      }

      const { rows } = await pool.query(
        `INSERT INTO report_card_templates (school_id, branch_id, name, template_key, layout, is_default)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, template_key AS "templateKey", layout, is_default AS "isDefault", status`,
        [req.auth.schoolId, req.auth.branchId || null, name, templateKey, JSON.stringify(b.layout || {}), Boolean(b.isDefault)]
      );
      res.status(201).json({ template: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/report-card/templates/:id', authenticate, requireRoles(...adminRoles), async (req, res, next) => {
    try {
      const b = req.body || {};
      if (b.isDefault) {
        await pool.query(`UPDATE report_card_templates SET is_default = false WHERE school_id = $1 AND id <> $2`, [req.auth.schoolId, req.params.id]);
      }

      const sets = [];
      const vals = [];
      if (b.name !== undefined) { vals.push(b.name); sets.push(`name = $${vals.length}`); }
      if (b.templateKey !== undefined) { vals.push(b.templateKey); sets.push(`template_key = $${vals.length}`); }
      if (b.layout !== undefined) { vals.push(JSON.stringify(b.layout)); sets.push(`layout = $${vals.length}`); }
      if (b.isDefault !== undefined) { vals.push(Boolean(b.isDefault)); sets.push(`is_default = $${vals.length}`); }
      if (b.status !== undefined) { vals.push(b.status); sets.push(`status = $${vals.length}`); }

      if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

      vals.push(req.params.id, req.auth.schoolId);
      const { rows } = await pool.query(
        `UPDATE report_card_templates SET ${sets.join(', ')}, updated_at = now()
         WHERE id = $${vals.length - 1} AND school_id = $${vals.length}
         RETURNING id, name, template_key AS "templateKey", layout, is_default AS "isDefault", status`,
        vals
      );
      if (!rows.length) return res.status(404).json({ error: 'Template not found' });
      res.json({ template: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  // 2. Configs
  app.get('/api/report-card/configs', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT rc.id, rc.name, rc.template_id AS "templateId", t.name AS "templateName",
                rc.session_id AS "sessionId", sess.name AS "sessionName", rc.settings, rc.status
         FROM report_card_configs rc
         LEFT JOIN report_card_templates t ON t.id = rc.template_id
         LEFT JOIN academic_sessions sess ON sess.id = rc.session_id
         WHERE rc.school_id = $1 AND rc.status = 'active'
         ORDER BY rc.name ASC`,
        [req.auth.schoolId]
      );
      res.json({ configs: rows });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/report-card/configs', authenticate, requireRoles(...adminRoles), async (req, res, next) => {
    try {
      const b = req.body || {};
      const name = String(b.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name is required' });

      const { rows } = await pool.query(
        `INSERT INTO report_card_configs (school_id, branch_id, name, template_id, session_id, settings)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, template_id AS "templateId", session_id AS "sessionId", status`,
        [req.auth.schoolId, req.auth.branchId || null, name, b.templateId || null, b.sessionId || null, JSON.stringify(b.settings || {})]
      );
      res.status(201).json({ config: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  // 3. List report cards
  app.get('/api/report-cards', authenticate, requireRoles(...staffRoles), async (req, res, next) => {
    try {
      const schoolId = req.auth.schoolId;
      const branchId = req.auth.branchId || null;
      const { sessionId, configId, classId, sectionId, status } = req.query || {};

      const params = [schoolId];
      const conditions = ['rc.school_id = $1'];

      if (branchId) {
        params.push(branchId);
        conditions.push(`(rc.branch_id = $${params.length} OR rc.branch_id IS NULL)`);
      }
      if (sessionId) {
        params.push(sessionId);
        conditions.push(`rc.session_id = $${params.length}`);
      }
      if (configId) {
        params.push(configId);
        conditions.push(`rc.config_id = $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`rc.status = $${params.length}`);
      }
      if (classId) {
        params.push(classId);
        conditions.push(`en.class_id = $${params.length}`);
      }
      if (sectionId) {
        params.push(sectionId);
        conditions.push(`en.section_id = $${params.length}`);
      }

      const { rows } = await pool.query(
        `SELECT rc.id, rc.student_id AS "studentId", s.full_name AS "studentName",
                s.admission_no AS "admissionNo", c.name AS "className", sec.name AS "sectionName",
                sess.name AS "sessionName", rcc.name AS "configName",
                rc.percentage, rc.overall_grade AS "overallGrade", rc.status,
                rc.total_marks AS "totalMarks", rc.remarks
         FROM report_cards rc
         JOIN students s ON s.id = rc.student_id AND s.school_id = rc.school_id
         LEFT JOIN enrollments en ON en.student_id = rc.student_id AND en.session_id = rc.session_id AND en.status = 'active'
         LEFT JOIN classes c ON c.id = en.class_id
         LEFT JOIN sections sec ON sec.id = en.section_id
         LEFT JOIN academic_sessions sess ON sess.id = rc.session_id
         LEFT JOIN report_card_configs rcc ON rcc.id = rc.config_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY s.full_name ASC`,
        params
      );

      res.json({ reportCards: rows });
    } catch (err) {
      next(err);
    }
  });

  // 4. Single report card
  app.get('/api/report-card/:id', authenticate, async (req, res, next) => {
    try {
      const cardRes = await pool.query(
        `SELECT rc.*, s.full_name AS "studentName", s.admission_no AS "admissionNo",
                b.name AS "branchName", sess.name AS "sessionName"
         FROM report_cards rc
         JOIN students s ON s.id = rc.student_id AND s.school_id = rc.school_id
         LEFT JOIN branches b ON b.id = rc.branch_id
         LEFT JOIN academic_sessions sess ON sess.id = rc.session_id
         WHERE rc.id = $1 AND rc.school_id = $2`,
        [req.params.id, req.auth.schoolId]
      );
      if (!cardRes.rows.length) return res.status(404).json({ error: 'Report card not found' });
      const reportCard = cardRes.rows[0];

      const [schoolRes, templateRes, subjectsRes] = await Promise.all([
        pool.query(
          `SELECT s.name, ss.display_name AS "displayName", ss.logo_url AS "logoUrl",
                  ss.address, ss.phone, ss.email
           FROM schools s
           LEFT JOIN school_settings ss ON ss.school_id = s.id
           WHERE s.id = $1`,
          [req.auth.schoolId]
        ),
        pool.query(
          `SELECT t.name, t.template_key AS "templateKey", t.layout
           FROM report_card_templates t
           JOIN report_card_configs c ON c.template_id = t.id
           WHERE c.id = $1 AND t.school_id = $2`,
          [reportCard.config_id, req.auth.schoolId]
        ),
        pool.query(
          `SELECT rcs.*, sub.name AS "subjectName", sub.code AS "subjectCode"
           FROM report_card_subjects rcs
           JOIN subjects sub ON sub.id = rcs.subject_id AND sub.school_id = rcs.school_id
           WHERE rcs.report_card_id = $1
           ORDER BY sub.name ASC`,
          [req.params.id]
        )
      ]);

      const template = templateRes.rows[0] || { layout: {} };

      res.json({
        reportCard,
        school: schoolRes.rows[0] || {},
        template,
        subjects: subjectsRes.rows
      });
    } catch (err) {
      next(err);
    }
  });

  // 5. Report card context (student, parents, attendance)
  app.get('/api/report-card/:id/context', authenticate, async (req, res, next) => {
    try {
      const card = await pool.query(
        `SELECT student_id, session_id FROM report_cards WHERE id = $1 AND school_id = $2`,
        [req.params.id, req.auth.schoolId]
      );
      if (!card.rows.length) return res.status(404).json({ error: 'Report card not found' });
      const { student_id, session_id } = card.rows[0];

      const [studentRes, parentsRes, attendanceRes] = await Promise.all([
        pool.query(
          `SELECT s.id, s.full_name AS "fullName", s.admission_no AS "admissionNo",
                  s.photo_url AS "photoUrl", c.name AS "className", sec.name AS "sectionName",
                  sess.name AS "sessionName"
           FROM students s
           LEFT JOIN enrollments en ON en.student_id = s.id AND en.session_id = $2 AND en.status = 'active'
           LEFT JOIN classes c ON c.id = en.class_id
           LEFT JOIN sections sec ON sec.id = en.section_id
           LEFT JOIN academic_sessions sess ON sess.id = $2
           WHERE s.id = $1 AND s.school_id = $3`,
          [student_id, session_id, req.auth.schoolId]
        ),
        pool.query(
          `SELECT p.full_name AS "fullName", p.phone, sp.relation, sp.is_primary AS "isPrimary"
           FROM student_portal_profiles sp
           JOIN parents p ON p.user_id = sp.user_id AND p.school_id = sp.school_id
           WHERE sp.student_id = $1 AND sp.school_id = $2 AND sp.status = 'active'`,
          [student_id, req.auth.schoolId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'present')::int AS present,
                  COUNT(*) FILTER (WHERE status = 'absent')::int AS absent,
                  COUNT(*) FILTER (WHERE status = 'late')::int AS late,
                  COUNT(*) FILTER (WHERE status = 'half_day')::int AS "halfDay",
                  COUNT(*) FILTER (WHERE status = 'leave')::int AS leave,
                  CASE WHEN COUNT(*) > 0 THEN
                    ROUND((COUNT(*) FILTER (WHERE status = 'present') * 100.0) / COUNT(*), 2)
                  ELSE 0 END AS "attendancePercent"
           FROM student_attendance
           WHERE student_id = $1 AND school_id = $2 AND session_id = $3`,
          [student_id, req.auth.schoolId, session_id]
        )
      ]);

      res.json({
        student: studentRes.rows[0] || {},
        parents: parentsRes.rows,
        attendance: attendanceRes.rows[0] || { total: 0 }
      });
    } catch (err) {
      next(err);
    }
  });

  // 6. Publish single report card
  app.post('/api/report-card/:id/publish', authenticate, requireRoles(...adminRoles), async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `UPDATE report_cards SET status = 'published', updated_at = now()
         WHERE id = $1 AND school_id = $2
         RETURNING id, status`,
        [req.params.id, req.auth.schoolId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Report card not found' });
      res.json({ message: 'Report card published', reportCard: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  // 7. Publish bulk report cards
  app.post('/api/report-card/publish-bulk', authenticate, requireRoles(...adminRoles), async (req, res, next) => {
    try {
      const { ids = [] } = req.body || {};
      if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      const { rowCount } = await pool.query(
        `UPDATE report_cards SET status = 'published', updated_at = now()
         WHERE id = ANY($1::uuid[]) AND school_id = $2 AND status = 'draft'`,
        [ids, req.auth.schoolId]
      );

      res.json({ publishedCount: rowCount, skippedCount: ids.length - rowCount });
    } catch (err) {
      next(err);
    }
  });

  // 8. Generate bulk report cards from exam marks
  app.post('/api/report-card/generate-bulk', authenticate, requireRoles(...adminRoles), async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { sessionId, configId, classId, sectionId } = req.body || {};
      if (!sessionId || !configId) {
        return res.status(400).json({ error: 'sessionId and configId are required' });
      }

      await client.query('BEGIN');

      const params = [req.auth.schoolId, sessionId];
      let classFilter = '';
      if (classId) {
        params.push(classId);
        classFilter += ` AND en.class_id = $${params.length}`;
      }
      if (sectionId) {
        params.push(sectionId);
        classFilter += ` AND en.section_id = $${params.length}`;
      }

      const students = await client.query(
        `SELECT DISTINCT en.student_id, en.branch_id
         FROM enrollments en
         WHERE en.school_id = $1 AND en.session_id = $2 AND en.status = 'active'
           ${classFilter}`,
        params
      );

      let generatedCount = 0;
      let skippedCount = 0;

      for (const st of students.rows) {
        // Check if published card already exists
        const existing = await client.query(
          `SELECT id, status FROM report_cards
           WHERE school_id = $1 AND student_id = $2 AND session_id = $3 AND config_id = $4`,
          [req.auth.schoolId, st.student_id, sessionId, configId]
        );

        if (existing.rows.length && existing.rows[0].status === 'published') {
          skippedCount++;
          continue;
        }

        // Calculate marks from exam_marks
        const marksQuery = await client.query(
          `SELECT es.subject_id,
                  COALESCE(SUM(m.marks), 0) AS marks_obtained,
                  COALESCE(SUM(es.max_marks), 100) AS max_marks
           FROM exam_subjects es
           JOIN exams e ON e.id = es.exam_id AND e.school_id = es.school_id
           LEFT JOIN exam_marks m ON m.exam_subject_id = es.id AND m.student_id = $2 AND m.school_id = es.school_id
           WHERE es.school_id = $1 AND e.session_id = $3
           GROUP BY es.subject_id`,
          [req.auth.schoolId, st.student_id, sessionId]
        );

        let totalMarks = 0;
        let totalMax = 0;
        for (const m of marksQuery.rows) {
          totalMarks += Number(m.marks_obtained);
          totalMax += Number(m.max_marks);
        }
        const percentage = totalMax > 0 ? Number(((totalMarks * 100.0) / totalMax).toFixed(2)) : 0;
        const overallGrade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'E';

        let cardId;
        if (existing.rows.length) {
          cardId = existing.rows[0].id;
          await client.query(
            `UPDATE report_cards SET total_marks = $1, percentage = $2, overall_grade = $3, updated_at = now()
             WHERE id = $4`,
            [totalMarks, percentage, overallGrade, cardId]
          );
          await client.query(`DELETE FROM report_card_subjects WHERE report_card_id = $1`, [cardId]);
        } else {
          const ins = await client.query(
            `INSERT INTO report_cards (school_id, branch_id, student_id, session_id, config_id, total_marks, percentage, overall_grade, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
             RETURNING id`,
            [req.auth.schoolId, st.branch_id, st.student_id, sessionId, configId, totalMarks, percentage, overallGrade]
          );
          cardId = ins.rows[0].id;
        }

        for (const m of marksQuery.rows) {
          const subPct = Number(m.max_marks) > 0 ? Number(((Number(m.marks_obtained) * 100.0) / Number(m.max_marks)).toFixed(2)) : 0;
          const subGrade = subPct >= 90 ? 'A+' : subPct >= 80 ? 'A' : subPct >= 70 ? 'B' : subPct >= 60 ? 'C' : subPct >= 50 ? 'D' : 'E';
          await client.query(
            `INSERT INTO report_card_subjects (school_id, report_card_id, subject_id, marks_obtained, max_marks, percentage, grade)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [req.auth.schoolId, cardId, m.subject_id, m.marks_obtained, m.max_marks, subPct, subGrade]
          );
        }

        generatedCount++;
      }

      await client.query('COMMIT');
      res.json({ generatedCount, skippedCount });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  });
}

module.exports = { registerReportCardRoutes };
