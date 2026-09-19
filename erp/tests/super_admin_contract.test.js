const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { verifyPassword } = require('../src/security');

(async () => {
  const root = path.join(__dirname, '..');
  const projectRoot = path.join(root, '..');

  // 1. Verify SQL Seed Migration
  const sql = fs.readFileSync(path.join(root, 'sql', '102_default_super_admin_seed.sql'), 'utf8');
  assert(sql.includes('superadmin@anvimitra.com'), 'Seed migration missing superadmin email');
  assert(sql.includes("'super_admin'"), 'Seed migration missing super_admin role');

  // 2. Extract and verify password hash against default password
  const match = sql.match(/(scrypt\$16384\$8\$1\$[a-f0-9]+\$[a-f0-9]+)/);
  assert(match, 'Seed migration missing scrypt hash');
  const hash = match[1];
  const isValid = await verifyPassword('SuperAdmin@123', hash);
  assert(isValid, 'Default hash does not match SuperAdmin@123');

  // 3. Verify auth.js handles super_admin without schoolCode
  const auth = fs.readFileSync(path.join(root, 'src', 'auth.js'), 'utf8');
  assert(auth.includes("u.role='super_admin'"), 'auth.js must allow super_admin without schoolCode check');

  // 4. Verify login.html pages
  const rootLogin = fs.readFileSync(path.join(projectRoot, 'login.html'), 'utf8');
  assert(rootLogin.includes('super_admin'), 'Root login.html missing super_admin');
  assert(rootLogin.includes('/erp/web/super-admin-schools.html'), 'Root login.html missing super-admin redirect');

  const webLogin = fs.readFileSync(path.join(root, 'web', 'login.html'), 'utf8');
  assert(webLogin.includes('super_admin'), 'Web login.html missing super_admin');
  assert(webLogin.includes('/erp/web/super-admin-schools.html'), 'Web login.html missing super-admin redirect');

  // 5. Verify worker.js proxy
  const worker = fs.readFileSync(path.join(projectRoot, 'worker.js'), 'utf8');
  assert(worker.includes('API_BACKEND_URL'), 'worker.js missing API_BACKEND_URL proxy support');
  assert(worker.includes('env.ASSETS.fetch'), 'worker.js missing ASSETS fallback');

  console.log('Super Admin contract checks: PASS');
})().catch((err) => {
  console.error('Super Admin contract check failed:', err);
  process.exit(1);
});
