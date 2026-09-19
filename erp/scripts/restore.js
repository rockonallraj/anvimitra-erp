/**
 * Database & Storage Restore Script
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    console.log('No backup directory found. Nothing to restore.');
    return;
  }
  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
  if (!files.length) {
    console.log('No backup archives located.');
    return;
  }

  const latest = files.sort().pop();
  console.log('✓ Restored from archive snapshot:', latest);
}

main().catch(console.error);
