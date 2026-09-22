/**
 * Anvi Mitra ERP: Flagship Interactive Dashboard Controller
 * Supports dual-mode: Mobile Native (5-tab bottom bar) and Desktop Executive Workspace
 */

window.AnviDashboard = (() => {
  let currentUser = null;
  let activeTab = 'home';

  function triggerHaptic(duration = 35) {
    try {
      if (window.AnviNativeBridge && typeof window.AnviNativeBridge.vibrate === 'function') {
        window.AnviNativeBridge.vibrate(duration);
      } else if (navigator.vibrate) {
        navigator.vibrate(duration);
      }
    } catch (_) {}
  }

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
    currentUser = user;
    return user;
  }

  function switchTab(tabId) {
    triggerHaptic(25);
    activeTab = tabId;

    // 1. Update Tab Panels
    document.querySelectorAll('.tab-pane').forEach((pane) => {
      pane.classList.remove('active');
    });
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) targetPane.classList.add('active');

    // 2. Update Desktop Sidebar
    document.querySelectorAll('.nav-item').forEach((item) => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 3. Update Mobile Bottom Nav
    document.querySelectorAll('.bnav-tab').forEach((tab) => {
      if (tab.getAttribute('data-tab') === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Scroll to top of main area
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openBottomSheet(sheetId) {
    triggerHaptic(40);
    const backdrop = document.getElementById('sheetBackdrop');
    const sheet = document.getElementById(sheetId);
    if (backdrop && sheet) {
      backdrop.classList.add('active');
      sheet.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeBottomSheet() {
    triggerHaptic(20);
    const backdrop = document.getElementById('sheetBackdrop');
    if (backdrop) backdrop.classList.remove('active');
    document.querySelectorAll('.bottom-sheet').forEach((s) => s.classList.remove('active'));
    document.body.style.overflow = '';
  }

  function setupHeader(user = currentUser) {
    if (!user) return;

    // School name & code
    const schoolName = user.schoolName || 'Anvi Mitra Academy';
    const schoolElements = document.querySelectorAll('.school-name-display');
    schoolElements.forEach((el) => (el.textContent = schoolName));

    const rolePills = document.querySelectorAll('.user-role-display');
    rolePills.forEach((el) => (el.textContent = user.role ? user.role.replace('_', ' ') : 'User'));

    // User initials
    const initials = (user.name || user.email || 'Admin')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    const avatarEls = document.querySelectorAll('.user-avatar-text');
    avatarEls.forEach((el) => (el.textContent = initials));

    // Wire Logout
    const logoutBtns = document.querySelectorAll('.btn-logout');
    logoutBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        triggerHaptic(30);
        sessionStorage.clear();
        location.replace('/erp/web/login.html');
      });
    });

    // Sync monitoring
    updateSyncBadge();
    window.addEventListener('online', updateSyncBadge);
    window.addEventListener('offline', updateSyncBadge);
  }

  function updateSyncBadge() {
    const isOnline = navigator.onLine;
    const badges = document.querySelectorAll('.sync-badge');
    badges.forEach((b) => {
      if (isOnline) {
        b.className = 'sync-badge';
        b.innerHTML = '<span class="sync-dot"></span> Synced';
      } else {
        b.className = 'sync-badge offline';
        b.innerHTML = '<span class="sync-dot"></span> Offline Outbox';
      }
    });
  }

  return {
    checkAuth,
    setupHeader,
    switchTab,
    openBottomSheet,
    closeBottomSheet,
    triggerHaptic,
  };
})();

