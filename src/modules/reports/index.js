const { moduleBoundaries } = require('../module-boundaries');

function getReportsModuleInfo() {
  return moduleBoundaries.reports;
}

module.exports = {
  getReportsModuleInfo
};
