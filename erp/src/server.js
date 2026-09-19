require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { registerAuthRoutes } = require('./auth');
const { registerExtendedModuleRoutes } = require('./extended_modules');
const { errorHandler } = require('./error_handler');

const app = express();
const port = Number(process.env.PORT || 4000);
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }) : null;

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

// Static Web Assets Mounting
app.use(express.static(path.join(__dirname, '../web')));
app.use('/erp/web', express.static(path.join(__dirname, '../web')));
app.use(express.static(path.join(__dirname, '../..')));

const superAdminPage = path.join(__dirname, '../web/super-admin/schools.html');
app.get('/', (_req, res) => res.sendFile(superAdminPage));
app.get('/super-admin/schools', (_req, res) => res.sendFile(superAdminPage));
app.get('/super-admin/school-onboarding', (_req, res) => res.sendFile(path.join(__dirname, '../web/super-admin/school-onboarding.html')));
app.get('/super-admin/school', (_req, res) => res.sendFile(path.join(__dirname, '../web/super-admin/school.html')));
app.get('/super-admin/teacher-permissions', (_req, res) => res.sendFile(path.join(__dirname, '../web/super-admin/teacher-assignments.html')));
app.get('/super-admin/sync-conflicts', (_req, res) => res.sendFile(path.join(__dirname, '../web/super-admin/sync-conflicts.html')));
app.get('/super-admin/sync-monitoring', (_req, res) => res.sendFile(path.join(__dirname, '../web/super-admin/sync-monitoring.html')));
app.get('/super-admin/local-storage', (_req, res) => res.sendFile(path.join(__dirname, '../web/super-admin/local-storage.html')));
app.get('/local-storage', (_req, res) => res.sendFile(path.join(__dirname, '../web/local-storage.html')));
app.get('/school/enrollment', (_req, res) => res.sendFile(path.join(__dirname, '../web/school/enrollment.html')));
app.get('/school/staff', (_req, res) => res.sendFile(path.join(__dirname, '../web/school/staff.html')));
app.get('/staff-attendance', (_req, res) => res.sendFile(path.join(__dirname, '../web/staff-attendance.html')));
app.get('/attendance', (_req, res) => res.sendFile(path.join(__dirname, '../../attendance.html')));
app.get('/attendance-report', (_req, res) => res.sendFile(path.join(__dirname, '../../attendance-report.html')));

// API Health Check
app.get('/api/health', async (_req, res) => {
  let database = 'not-configured';
  if (pool) {
    try {
      await pool.query('SELECT 1');
      database = 'ok';
    } catch (_) {
      database = 'unavailable';
    }
  }
  res.json({
    ok: true,
    service: 'anvi-mitra-erp-api',
    product: 'Anvi Mitra ERP',
    database,
    mode: pool ? 'multi-tenant' : 'standalone',
    timestamp: new Date().toISOString(),
  });
});

function registerOptional(moduleName, registerName) {
  let file;
  try {
    file = require.resolve('./' + moduleName);
  } catch (_) {
    console.warn('Optional ERP module not present: ' + moduleName + '.js');
    return false;
  }
  try {
    const mod = require(file);
    if (typeof mod[registerName] !== 'function') {
      console.warn('ERP module ' + moduleName + '.js does not export ' + registerName);
      return false;
    }
    mod[registerName](app, pool);
    return true;
  } catch (error) {
    console.error('Failed to load ERP module ' + moduleName + '.js:', error);
    if (process.env.NODE_ENV === 'production') throw error;
    return false;
  }
}

// Always register auth routes (supports standalone super admin when DB is not yet attached)
registerAuthRoutes(app, pool);
if (pool) {
  registerExtendedModuleRoutes(app, pool);
}

const modules = [
  ['routes','registerRoutes'],
  ['organization','registerOrganizationRoutes'],
  ['schools','registerSchoolRoutes'],
  ['branches','registerBranchRoutes'],
  ['users','registerUserRoutes'],
  ['people','registerPeopleRoutes'],
  ['students','registerStudentRoutes'],
  ['student_crud','registerStudentCrudRoutes'],
  ['student_enrollment','registerStudentEnrollmentRoutes'],
  ['enrollment','registerEnrollmentRoutes'],
  ['teachers','registerTeacherRoutes'],
  ['staff','registerStaffRoutes'],
  ['teacher_assignments','registerTeacherAssignmentRoutes'],
  ['teacher_permissions','registerTeacherPermissionRoutes'],
  ['marks_permissions','registerMarksPermissionRoutes'],
  ['admissions','registerAdmissionRoutes'],
  ['attendance','registerAttendanceRoutes'],
  ['staff_attendance','registerStaffAttendanceRoutes'],
  ['attendance_reports','registerAttendanceReportRoutes'],
  ['academics','registerAcademicRoutes'],
  ['academic_master','registerAcademicMasterRoutes'],
  ['academic_progress','registerAcademicProgressRoutes'],
  ['timetable','registerTimetableRoutes'],
  ['homework','registerHomeworkRoutes'],
  ['exams','registerExamRoutes'],
  ['exam_results','registerExamResultRoutes'],
  ['exam_marks','registerExamMarkRoutes'],
  ['fees','registerFeeRoutes'],
  ['fee_assignments','registerFeeAssignmentRoutes'],
  ['fee_installments','registerFeeInstallmentRoutes'],
  ['fee_ledger','registerFeeLedgerRoutes'],
  ['fee_receipts','registerFeeReceiptRoutes'],
  ['payments','registerPaymentRoutes'],
  ['payment_gateway','registerPaymentGatewayRoutes'],
  ['reportcards','registerReportCardRoutes'],
  ['reportcard_engine_route','registerReportCardEngineRoute'],
  ['reportcard_context','registerReportCardContextRoutes'],
  ['reportcard_list','registerReportCardListRoutes'],
  ['reportcard_bulk','registerReportCardBulkRoutes'],
  ['reportcard_result_sync','registerReportCardResultSyncRoutes'],
  ['notifications','registerNotificationRoutes'],
  ['sms','registerSmsRoutes'],
  ['whatsapp','registerWhatsappRoutes'],
  ['transport','registerTransportRoutes'],
  ['transport_routes','registerTransportRouteRoutes'],
  ['portal','registerPortalRoutes'],
  ['mobile','registerMobileRoutes'],
  ['mobile_dashboards','registerMobileDashboardRoutes'],
  ['platform_school_management','registerPlatformSchoolManagementRoutes'],
  ['school_summary','registerSchoolSummaryRoutes'],
  ['sync_routes','registerSyncRoutes'],
  ['sync_admin','registerSyncAdminRoutes'],
  ['sync_conflict_resolution','registerSyncConflictResolutionRoutes'],
  ['conflicts','registerConflictRoutes'],
  ['local_storage','registerLocalStorageRoutes'],
  ['backup','registerBackupRoutes'],
  ['audit_logs','registerAuditLogRoutes']
];

for (const [m, r] of modules) {
  registerOptional(m, r);
}

if (pool) {
  try { require('./notification_worker').startNotificationWorker(pool); } catch (_) {}
  try { require('./push_worker').startPushWorker(pool); } catch (_) {}
}

// Error handling middleware
app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => console.log('Anvi Mitra ERP API listening on port ' + port));
}

module.exports = { app, pool };
