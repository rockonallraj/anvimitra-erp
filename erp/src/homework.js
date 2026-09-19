/**
 * Anvi Mitra ERP: Homework Management Module
 */

const { authenticate, requireRoles } = require('./security');

function registerHomeworkRoutes(app, pool) {
  app.get('/api/homework', authenticate, async (req, res, next) => {
    try {
      if (!pool) return res.json({ homework: [] });
      const { classId, sectionId, subjectId } = req.query;
      const schoolId = req.auth.schoolId;

      let q = `SELECT h.*, c.name as "className", s.name as "subjectName"
               FROM homework h
               LEFT JOIN classes c ON c.id = h.class_id
               LEFT JOIN subjects s ON s.id = h.subject_id
               WHERE ($1::uuid IS NULL OR h.school_id = $1::uuid)`;
      const params = [schoolId];

      if (classId) {
        params.push(classId);
        q += ` AND h.class_id = $${params.length}`;
      }
      if (sectionId) {
        params.push(sectionId);
        q += ` AND (h.section_id = $${params.length} OR h.section_id IS NULL)`;
      }
      if (subjectId) {
        params.push(subjectId);
        q += ` AND h.subject_id = $${params.length}`;
      }
      q += ' ORDER BY h.due_date DESC, h.created_at DESC LIMIT 50';

      const { rows } = await pool.query(q, params);
      res.json({ homework: rows });
    } catch (err) { next(err); }
  });

  app.post('/api/homework', authenticate, requireRoles('super_admin', 'principal', 'admin', 'teacher'), async (req, res, next) => {
    try {
      const { classId, sectionId = null, subjectId, title, description, dueDate } = req.body || {};
      if (!classId || !subjectId || !title || !dueDate) {
        return res.status(400).json({ error: 'classId, subjectId, title, and dueDate are required' });
      }
      if (!pool) return res.status(201).json({ homework: { id: 'mock-hw-id', title, dueDate } });

      const schoolId = req.auth.schoolId;
      const { rows } = await pool.query(
        `INSERT INTO homework (school_id, class_id, section_id, subject_id, teacher_id, title, description, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [schoolId, classId, sectionId, subjectId, req.auth.sub, title.trim(), description, dueDate]
      );
      res.status(201).json({ homework: rows[0] });
    } catch (err) { next(err); }
  });
}

module.exports = { registerHomeworkRoutes };
