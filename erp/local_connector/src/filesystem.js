/**
 * Anvi Mitra Local Connector: Safe Local Filesystem Access
 */

const fs = require('fs');
const path = require('path');

function getSafeFilePath(basePath, relativePath) {
  const safeBase = path.resolve(basePath);
  const target = path.resolve(safeBase, relativePath);
  if (!target.startsWith(safeBase)) {
    throw new Error('Directory traversal attempt rejected');
  }
  return target;
}

module.exports = { getSafeFilePath };
