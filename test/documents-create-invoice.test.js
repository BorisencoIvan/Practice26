const test = require('node:test');
const assert = require('node:assert/strict');

const numberingPath = require.resolve('../src/modules/numbering');
require.cache[numberingPath] = {
  id: numberingPath,
  filename: numberingPath,
  loaded: true,
  exports: {
    allocateNextNumber: async () => ({ docType: 'invoice', serie: 'INV', number: 101 })
  }
};

const dbPath = require.resolve('../src/db');
let queries = [];

function makeClient(handlers) {
  return {
    released: false,
    query: async (sql, params) => {
      queries.push({ sql, params });
      for (const handler of handlers) {
        const response = handler(sql, params);
        if (response !== undefined) {
          return response;
        }
      }
      return { rowCount: 0, rows: [] };
    },
    release: function () {
      this.released = true;
    }
  };
}

function setDbClient(client) {
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      getClient: async () => client
    }
  };
}

test('createInvoiceFromDeliveredOrder creates invoice for delivered order', async () => {
  queries = [];
  const client = makeClient([
    (sql) => (sql === 'BEGIN' ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('FROM orders') ? { rowCount: 1, rows: [{ id: 7, client_id: 11, status: 'delivered', total_amount: '230.50' }] } : undefined),
    (sql) => (sql.includes('SELECT id FROM invoices') ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('INSERT INTO invoices') ? { rowCount: 1, rows: [{ id: 15, serie: 'INV', number: 101, order_id: 7, client_id: 11, total: '230.50', paid: '0.00', status: 'issued' }] } : undefined),
    (sql) => (sql === 'COMMIT' ? { rowCount: 0, rows: [] } : undefined)
  ]);
  setDbClient(client);

  delete require.cache[require.resolve('../src/modules/documents')];
  const { createInvoiceFromDeliveredOrder } = require('../src/modules/documents');

  const invoice = await createInvoiceFromDeliveredOrder({ orderId: 7, serie: 'INV' });

  assert.equal(invoice.number, 101);
  assert.equal(invoice.order_id, 7);
  assert.equal(invoice.client_id, 11);
  assert.equal(queries[0].sql, 'BEGIN');
  assert.equal(queries[queries.length - 1].sql, 'COMMIT');
  assert.equal(client.released, true);
});

test('createInvoiceFromDeliveredOrder fails when order not delivered', async () => {
  queries = [];
  const client = makeClient([
    (sql) => (sql === 'BEGIN' ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('FROM orders') ? { rowCount: 1, rows: [{ id: 8, client_id: 2, status: 'pending', total_amount: '100.00' }] } : undefined),
    (sql) => (sql === 'ROLLBACK' ? { rowCount: 0, rows: [] } : undefined)
  ]);
  setDbClient(client);

  delete require.cache[require.resolve('../src/modules/documents')];
  const { createInvoiceFromDeliveredOrder } = require('../src/modules/documents');

  await assert.rejects(
    () => createInvoiceFromDeliveredOrder({ orderId: 8 }),
    /ORDER_NOT_DELIVERED/
  );

  assert.equal(queries[queries.length - 1].sql, 'ROLLBACK');
});
