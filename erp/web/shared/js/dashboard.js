/**
 * Anvi Mitra ERP: Shared Dashboard Client Logic
 */

window.AnviDashboard = (() => {
  function checkAuth(requiredRoles = []) {
    const token = sessionStorage.getItem('lsk_access_token');
    if (!token) {
      location.replace('/erp/web/login.html');
      return null;
    }
    let user = {};
    try {
      user = JSON.parse(sessionStorage.getItem('lsk_user') || '{}');
    } catch (_) {}

    const role = String(user.role || '').toLowerCase();
    if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
      alert('Access restricted to ' + requiredRoles.join(', '));
      location.replace('/erp/web/login.html');
      return null;
    }
    return user;
  }

  function setupHeader(user) {
    const roleEl = document.getElementById('userRole');
    if (roleEl && user) roleEl.textContent = user.role || 'User';

    const schoolEl = document.getElementById('userSchool');
    if (schoolEl && user) schoolEl.textContent = user.schoolName || 'Platform';

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        sessionStorage.clear();
        location.replace('/erp/web/login.html');
      });
    }
  }

  return { checkAuth, setupHeader };
})();
