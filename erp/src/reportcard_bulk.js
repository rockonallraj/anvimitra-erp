/**
 * Anvi Mitra ERP: Report Card Bulk Generation & Publishing Routes
 */

const { authenticate, requireRoles } = require('./security');

function registerReportCardBulkRoutes(app, pool) {
  app.post('/api/report-cards/bulk-generate', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      const { classId, sectionId, examId, templateId } = req.body || {};
      if (!classId || !examId) return res.status(400).json({ error: 'classId and examId are required' });

      const jobId = 'bulk_rc_' + Date.now();
      res.json({
        jobId,
        status: 'queued',
        message: 'Bulk report card generation scheduled for class',
        classId,
        examId
      });
    } catch (err) { next(err); }
  });
}

module.exports = { registerReportCardBulkRoutes };
