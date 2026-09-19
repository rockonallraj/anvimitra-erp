/**
 * Anvi Mitra ERP: Mobile Role-Specific Dashboards Data Routes
 */

const { authenticate } = require('./security');

function registerMobileDashboardRoutes(app, pool) {
  app.get('/api/mobile/dashboard', authenticate, async (req, res, next) => {
    try {
      const role = String(req.auth.role || '').toLowerCase();
      const schoolId = req.auth.schoolId;

      const dashboard = {
        role,
        cards: [],
        quickActions: [],
        timestamp: new Date().toISOString()
      };

      if (role === 'parent') {
        dashboard.cards = [
          { label: 'My Children', value: '1 Active', icon: 'child' },
          { label: 'Today Attendance', value: 'Present', icon: 'check-circle' },
          { label: 'Pending Fees', value: '₹0', icon: 'credit-card' }
        ];
        dashboard.quickActions = [
          { title: 'Pay Fees', route: '/fees' },
          { title: 'Homework', route: '/homework' },
          { title: 'Report Card', route: '/results' }
        ];
      } else if (role === 'teacher') {
        dashboard.cards = [
          { label: 'Assigned Classes', value: '4', icon: 'chalkboard-teacher' },
          { label: 'Today Attendance', value: 'Marked', icon: 'calendar-check' },
          { label: 'Upcoming Exams', value: '2', icon: 'file-signature' }
        ];
        dashboard.quickActions = [
          { title: 'Mark Attendance', route: '/attendance' },
          { title: 'Assign Homework', route: '/homework' },
          { title: 'Enter Marks', route: '/marks' }
        ];
      } else {
        dashboard.cards = [
          { label: 'Students', value: '1,250', icon: 'user-graduate' },
          { label: 'Staff', value: '64', icon: 'users' },
          { label: 'Collection (Month)', value: '₹8,45,000', icon: 'rupee-sign' }
        ];
        dashboard.quickActions = [
          { title: 'School Console', route: '/schools' },
          { title: 'Fee Collection', route: '/fees' },
          { title: 'Attendance Matrix', route: '/attendance-report' }
        ];
      }

      res.json(dashboard);
    } catch (err) { next(err); }
  });
}

module.exports = { registerMobileDashboardRoutes };
