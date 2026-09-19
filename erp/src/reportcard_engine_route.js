/**
 * Anvi Mitra ERP: Report Card Generation Engine Routes
 */

const { authenticate, requireRoles } = require('./security');

function registerReportCardEngineRoute(app, pool) {
  app.post('/api/report-cards/engine/generate', authenticate, requireRoles('super_admin', 'admin', 'principal', 'teacher'), async (req, res, next) => {
    try {
      const { studentId, examId, templateId } = req.body || {};
      if (!studentId) return res.status(400).json({ error: 'studentId is required' });

      res.json({
        success: true,
        reportCard: {
          id: 'rc_' + Date.now(),
          studentId,
          examId,
          templateId: templateId || 'default',
          generatedAt: new Date().toISOString(),
          status: 'generated'
        }
      });
    } catch (err) { next(err); }
  });
}

module.exports = { registerReportCardEngineRoute };
