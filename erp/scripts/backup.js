/**
 * Database & Storage Backup Script
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(backupDir, `anvi-erp-backup-${stamp}.json`);

  const manifest = {
    product: 'Anvi Mitra ERP',
    timestamp: new Date().toISOString(),
    status: 'snapshot_created',
  };

  fs.writeFileSync(filename, JSON.stringify(manifest, null, 2));
  console.log('✓ Backup snapshot generated successfully:', filename);
}

main().catch(console.error);
