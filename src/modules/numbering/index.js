const { moduleBoundaries } = require('../module-boundaries');

function getNumberingModuleInfo() {
  return moduleBoundaries.numbering;
}

module.exports = {
  getNumberingModuleInfo
};
