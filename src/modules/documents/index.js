const { moduleBoundaries } = require('../module-boundaries');

function getDocumentModuleInfo() {
  return moduleBoundaries.documents;
}

module.exports = {
  getDocumentModuleInfo
};
