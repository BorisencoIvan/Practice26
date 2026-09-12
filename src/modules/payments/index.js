const { moduleBoundaries } = require('../module-boundaries');

function getPaymentsModuleInfo() {
  return moduleBoundaries.payments;
}

module.exports = {
  getPaymentsModuleInfo
};
