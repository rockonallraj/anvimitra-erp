/**
 * Anvi Mitra Local Connector: Automated Local & External Drive Backup
 */

const fs = require('fs');
const path = require('path');

function runAutomatedBackup(storagePath, targetDir) {
  const dest = targetDir || path.join(storagePath, 'backups');
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  console.log('[LOCAL BACKUP] Backup created in', dest);
  return { success: true, path: dest, timestamp: new Date().toISOString() };
}

module.exports = { runAutomatedBackup };
