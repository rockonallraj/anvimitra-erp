/**
 * Anvi Mitra ERP: Report Card Context & Academic Metadata Routes
 */

const { authenticate } = require('./security');

function registerReportCardContextRoutes(app, pool) {
  app.get('/api/report-cards/context', authenticate, async (req, res, next) => {
    try {
      const schoolId = req.auth.schoolId;
      res.json({
        schoolId,
        availableTemplates: ['cbse_standard', 'icse_tabular', 'state_board_marksheet'],
        supportedGradingSystems: ['cce_9_point', 'percentage_grade', 'letter_grade'],
        timestamp: new Date().toISOString()
      });
    } catch (err) { next(err); }
  });
}

module.exports = { registerReportCardContextRoutes };
