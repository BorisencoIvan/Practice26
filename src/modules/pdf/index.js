const { moduleBoundaries } = require('../module-boundaries');

function getPdfModuleInfo() {
  return moduleBoundaries.pdf;
}

module.exports = {
  getPdfModuleInfo
};
