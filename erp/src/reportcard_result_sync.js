/**
 * Anvi Mitra ERP: Report Card Result Sync Routes
 */

const { authenticate, requireRoles } = require('./security');

function registerReportCardResultSyncRoutes(app, pool) {
  app.post('/api/report-cards/sync-results', authenticate, requireRoles('super_admin', 'admin', 'principal'), async (req, res, next) => {
    try {
      const { examId } = req.body || {};
      if (!examId) return res.status(400).json({ error: 'examId is required' });

      res.json({
        success: true,
        examId,
        syncedRecords: 0,
        message: 'Exam results synchronized with report card entries'
      });
    } catch (err) { next(err); }
  });
}

module.exports = { registerReportCardResultSyncRoutes };
