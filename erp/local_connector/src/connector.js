/**
 * Anvi Mitra Local Connector: Main Service Entrypoint
 */

const fs = require('fs');
const path = require('path');
const { startSyncLoop } = require('./sync');
const { initHealthServer } = require('./health');
const { runAutomatedBackup } = require('./backup');

function loadConfig() {
  const configPath = path.resolve(__dirname, '../config/default.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (_) {
    return { storagePath: path.resolve(__dirname, '../../data') };
  }
}

async function start() {
  const config = loadConfig();
  console.log('Starting Anvi Mitra Local Connector on', config.storagePath);

  if (!fs.existsSync(config.storagePath)) {
    fs.mkdirSync(config.storagePath, { recursive: true });
  }

  initHealthServer(4899);
  startSyncLoop(config);
}

if (require.main === module) {
  start().catch(console.error);
}

module.exports = { start };
