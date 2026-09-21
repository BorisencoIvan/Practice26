const test = require('node:test');
const assert = require('node:assert/strict');

const clients = [];
const queries = [];

const dbPath = require.resolve('../src/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getClient: async () => {
      const client = {
        released: false,
        query: async (sql, params) => {
          queries.push({ sql, params });
          if (sql.includes('SELECT current_number')) {
            return { rowCount: 1, rows: [{ current_number: '7' }] };
          }
          if (sql.includes('UPDATE document_counters')) {
            return { rowCount: 1 };
          }
          return { rowCount: 0, rows: [] };
        },
        release: () => {
          client.released = true;
        }
      };
      clients.push(client);
      return client;
    }
  }
};

const { allocateNextNumber } = require('../src/modules/numbering');

test('allocateNextNumber increments counter atomically with lock', async () => {
  const result = await allocateNextNumber({ docType: 'invoice', serie: 'INV' });

  assert.deepEqual(result, { docType: 'invoice', serie: 'INV', number: 8 });

  assert.equal(queries[0].sql, 'BEGIN');
  assert.match(queries[1].sql, /SELECT current_number FROM document_counters[\s\S]*FOR UPDATE/);
  assert.match(queries[2].sql, /UPDATE document_counters SET current_number = \$3 WHERE doc_type = \$1 AND serie = \$2/);
  assert.equal(queries[3].sql, 'COMMIT');

  assert.deepEqual(queries[1].params, ['invoice', 'INV']);
  assert.deepEqual(queries[2].params, ['invoice', 'INV', 8]);
  assert.equal(clients[0].released, true);
});

test('allocateNextNumber creates a new counter row when missing', async () => {
  queries.length = 0;
  let selectCount = 0;

  require.cache[dbPath].exports.getClient = async () => {
    const client = {
      released: false,
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('SELECT current_number')) {
          selectCount += 1;
          if (selectCount === 1) {
            return { rowCount: 0, rows: [] };
          }
          return { rowCount: 1, rows: [{ current_number: '0' }] };
        }
        if (sql.includes('INSERT INTO document_counters')) {
          return { rowCount: 1 };
        }
        if (sql.includes('UPDATE document_counters')) {
          return { rowCount: 1 };
        }
        return { rowCount: 0, rows: [] };
      },
      release: () => {
        client.released = true;
      }
    };
    return client;
  };

  const res = await allocateNextNumber({ docType: 'delivery_note', serie: 'BL' });
  assert.equal(res.number, 1);
  assert.match(queries[2].sql, /INSERT INTO document_counters \(doc_type, serie, current_number\) VALUES \(\$1, \$2, 0\)/);
  assert.match(queries[3].sql, /SELECT current_number FROM document_counters[\s\S]*FOR UPDATE/);
});

