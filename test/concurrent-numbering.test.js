const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const numberingSourcePath = require.resolve('../src/modules/numbering');

test('numbering implementation uses transactional row locking for concurrent safety', () => {
  const source = fs.readFileSync(numberingSourcePath, 'utf8');

  assert.match(source, /BEGIN/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /UPDATE document_counters/);
  assert.match(source, /ROLLBACK/);
});
