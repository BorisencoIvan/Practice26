const test = require('node:test');
const assert = require('node:assert/strict');

const { moduleBoundaries } = require('../src/modules/module-boundaries');

test('module boundaries include required domains', () => {
  assert.ok(moduleBoundaries.documents);
  assert.ok(moduleBoundaries.numbering);
  assert.ok(moduleBoundaries.payments);
  assert.ok(moduleBoundaries.reports);
  assert.ok(moduleBoundaries.exports);
  assert.ok(moduleBoundaries.pdf);
});
