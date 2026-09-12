const { moduleBoundaries } = require('../module-boundaries');

function getExportsModuleInfo() {
  return moduleBoundaries.exports;
}

module.exports = {
  getExportsModuleInfo
};
