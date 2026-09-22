const test = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/db');

function makeClient(handlers) {
  return {
    released: false,
    query: async (sql, params) => {
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

test('registerPayment updates invoice paid amount and status', async () => {
  const client = makeClient([
    (sql) => (sql === 'BEGIN' ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('FROM invoices') ? { rowCount: 1, rows: [{ id: 15, total: '230.50', paid: '120.00', status: 'partially_paid' }] } : undefined),
    (sql) => (sql.includes('INSERT INTO payments') ? { rowCount: 1, rows: [{ id: 7, invoice_id: 15, client_id: 11, amount: 110.5, payment_method: 'bank', reference: 'REF-1', paid_at: '2026-09-22T00:00:00.000Z' }] } : undefined),
    (sql) => (sql.includes('UPDATE invoices SET paid') ? { rowCount: 1, rows: [] } : undefined),
    (sql) => (sql === 'COMMIT' ? { rowCount: 0, rows: [] } : undefined)
  ]);

  setDbClient(client);
  delete require.cache[require.resolve('../src/modules/payments')];

  const { registerPayment } = require('../src/modules/payments');
  const result = await registerPayment({ invoiceId: 15, clientId: 11, amount: 110.5, paymentMethod: 'bank', reference: 'REF-1' });

  assert.equal(result.invoice.paid, '230.50');
  assert.equal(result.invoice.status, 'paid');
  assert.equal(client.released, true);
});

test('registerPayment rejects payment exceeding remaining invoice total', async () => {
  const client = makeClient([
    (sql) => (sql === 'BEGIN' ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('FROM invoices') ? { rowCount: 1, rows: [{ id: 15, total: '230.50', paid: '200.00', status: 'partially_paid' }] } : undefined),
    (sql) => (sql === 'ROLLBACK' ? { rowCount: 0, rows: [] } : undefined)
  ]);

  setDbClient(client);
  delete require.cache[require.resolve('../src/modules/payments')];

  const { registerPayment } = require('../src/modules/payments');

  await assert.rejects(
    () => registerPayment({ invoiceId: 15, clientId: 11, amount: 40, paymentMethod: 'bank', reference: 'REF-2' }),
    (error) => error.message === 'PAYMENT_EXCEEDS_INVOICE_TOTAL'
  );

  assert.equal(client.released, true);
});

test('dashboard summary fallback exposes compatible contract for frontend', async () => {
  delete require.cache[require.resolve('../src/modules/reports')];

  const { getDashboardSummary } = require('../src/modules/reports');
  const summary = await getDashboardSummary();

  assert.ok(summary.summary);
  assert.ok(summary.summary.todaySales);
  assert.ok(summary.salesSeries.length > 0);
  assert.ok(Array.isArray(summary.topClients));
  assert.ok(Array.isArray(summary.topProducts));
});
