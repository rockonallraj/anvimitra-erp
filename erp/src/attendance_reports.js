const { authenticate, requireRoles } = require('./auth');

function registerAttendanceReportRoutes(app, pool) {
  const roles = ['super_admin', 'principal', 'admin', 'office_staff', 'teacher'];

  // Student-wise aggregated attendance report for selected date range and section/session
  app.get('/api/attendance/student-report', authenticate, requireRoles(...roles), async (req, res, next) => {
    try {
      const from = String(req.query.from || '').trim();
      const to = String(req.query.to || from).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json({ error: 'Valid from and to dates are required' });
      }

      const schoolId = req.auth.schoolId;
      const branchId = req.auth.branchId || null;
      const sessionId = req.query.sessionId || null;
      const sectionId = req.query.sectionId || null;

      const params = [schoolId, from, to];
      let branchFilter = '';
      if (branchId) {
        params.push(branchId);
        branchFilter = `AND (en.branch_id = $${params.length} OR en.branch_id IS NULL)`;
      }
      let sessionFilter = '';
      if (sessionId) {
        params.push(sessionId);
        sessionFilter = `AND en.session_id = $${params.length}`;
      }
      let sectionFilter = '';
      if (sectionId) {
        params.push(sectionId);
        sectionFilter = `AND en.section_id = $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT s.id AS "studentId", s.admission_no AS "admissionNo", s.full_name AS "fullName",
                c.name AS "className", sec.name AS "sectionName",
                COUNT(a.id)::int AS "recordedDays",
                COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present,
                COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent,
                COUNT(a.id) FILTER (WHERE a.status = 'late')::int AS late,
                COUNT(a.id) FILTER (WHERE a.status = 'half_day')::int AS "halfDay",
                COUNT(a.id) FILTER (WHERE a.status = 'leave')::int AS leave,
                CASE WHEN COUNT(a.id) > 0 THEN
                  ROUND(
                    (COUNT(a.id) FILTER (WHERE a.status = 'present') * 100.0 +
                     COUNT(a.id) FILTER (WHERE a.status = 'late') * 75.0 +
                     COUNT(a.id) FILTER (WHERE a.status = 'half_day') * 50.0) / COUNT(a.id), 2
                  )
                ELSE 0 END AS "attendancePercent"
         FROM enrollments en
         JOIN students s ON s.id = en.student_id AND s.school_id = en.school_id AND s.status = 'active'
         JOIN sections sec ON sec.id = en.section_id AND sec.school_id = en.school_id
         JOIN classes c ON c.id = sec.class_id AND c.school_id = en.school_id
         LEFT JOIN student_attendance a ON a.student_id = s.id
           AND a.school_id = en.school_id
           AND a.attendance_date BETWEEN $2::date AND $3::date
         WHERE en.school_id = $1 AND en.status = 'active'
           ${branchFilter} ${sessionFilter} ${sectionFilter}
         GROUP BY s.id, s.admission_no, s.full_name, c.name, sec.name
         ORDER BY c.name, sec.name, s.full_name`,
        params
      );

      res.json({ from, to, report: rows });
    } catch (err) {
      next(err);
    }
  });

  // Dual-mode handler for /api/attendance/report:
  // If sectionId or sessionId is passed, or if client asks for detailed student list, return student report!
  app.get('/api/attendance/report', authenticate, requireRoles(...roles), async (req, res, next) => {
    try {
      const from = String(req.query.from || req.query.date || '').trim();
      const to = String(req.query.to || req.query.date || from).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json({ error: 'Valid from and to dates are required' });
      }

      const schoolId = req.auth.schoolId;
      const branchId = req.auth.branchId || null;
      const sessionId = req.query.sessionId || null;
      const sectionId = req.query.sectionId || null;

      // When requested from attendance-report.html (which passes from, to, and optional session/section),
      // provide the student-wise breakdown so the report table populates.
      const params = [schoolId, from, to];
      let branchFilter = '';
      if (branchId) {
        params.push(branchId);
        branchFilter = `AND (en.branch_id = $${params.length} OR en.branch_id IS NULL)`;
      }
      let sessionFilter = '';
      if (sessionId) {
        params.push(sessionId);
        sessionFilter = `AND en.session_id = $${params.length}`;
      }
      let sectionFilter = '';
      if (sectionId) {
        params.push(sectionId);
        sectionFilter = `AND en.section_id = $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT s.id AS "studentId", s.admission_no AS "admissionNo", s.full_name AS "fullName",
                c.name AS "className", sec.name AS "sectionName",
                COUNT(a.id)::int AS "recordedDays",
                COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present,
                COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent,
                COUNT(a.id) FILTER (WHERE a.status = 'late')::int AS late,
                COUNT(a.id) FILTER (WHERE a.status = 'half_day')::int AS "halfDay",
                COUNT(a.id) FILTER (WHERE a.status = 'leave')::int AS leave,
                CASE WHEN COUNT(a.id) > 0 THEN
                  ROUND(
                    (COUNT(a.id) FILTER (WHERE a.status = 'present') * 100.0 +
                     COUNT(a.id) FILTER (WHERE a.status = 'late') * 75.0 +
                     COUNT(a.id) FILTER (WHERE a.status = 'half_day') * 50.0) / COUNT(a.id), 2
                  )
                ELSE 0 END AS "attendancePercent"
         FROM enrollments en
         JOIN students s ON s.id = en.student_id AND s.school_id = en.school_id AND s.status = 'active'
         JOIN sections sec ON sec.id = en.section_id AND sec.school_id = en.school_id
         JOIN classes c ON c.id = sec.class_id AND c.school_id = en.school_id
         LEFT JOIN student_attendance a ON a.student_id = s.id
           AND a.school_id = en.school_id
           AND a.attendance_date BETWEEN $2::date AND $3::date
         WHERE en.school_id = $1 AND en.status = 'active'
           ${branchFilter} ${sessionFilter} ${sectionFilter}
         GROUP BY s.id, s.admission_no, s.full_name, c.name, sec.name
         ORDER BY c.name, sec.name, s.full_name`,
        params
      );

      res.json({ from, to, report: rows });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { registerAttendanceReportRoutes };
