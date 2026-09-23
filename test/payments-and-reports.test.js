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
    (sql) => (sql.includes('FROM invoices') ? { rowCount: 1, rows: [{ id: 15, client_id: 11, total: '230.50', paid: '120.00', status: 'partially_paid' }] } : undefined),
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
    (sql) => (sql.includes('FROM invoices') ? { rowCount: 1, rows: [{ id: 15, client_id: 11, total: '230.50', paid: '200.00', status: 'partially_paid' }] } : undefined),
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

test('listInvoices includes payment identifiers and remaining balance', async () => {
  const client = makeClient([
    (sql) => (sql.includes('FROM invoices') ? {
      rowCount: 1,
      rows: [{ id: 15, serie: 'INV', number: 101, client_id: 11, total: '230.50', paid: '120.00', status: 'partially_paid' }]
    } : undefined)
  ]);

  setDbClient(client);
  delete require.cache[require.resolve('../src/modules/reports')];

  const { listInvoices } = require('../src/modules/reports');
  const [invoice] = await listInvoices();

  assert.equal(invoice.id, 15);
  assert.equal(invoice.invoiceId, 15);
  assert.equal(invoice.clientId, 11);
  assert.equal(invoice.remaining, 110.5);
  assert.equal(client.released, true);
});

test('listOrders returns the frontend order contract and applies filters', async () => {
  const client = makeClient([
    (sql, params) => (sql.includes('FROM orders o') ? {
      rowCount: 1,
      rows: [{ id: 7, external_id: 'ORD-7', client_id: 11, client_name: 'Alpha', total_amount: '230.50', status: params[0], created_at: new Date(Date.now() - 2 * 86400000).toISOString() }]
    } : undefined)
  ]);

  setDbClient(client);
  delete require.cache[require.resolve('../src/modules/reports')];

  const { listOrders } = require('../src/modules/reports');
  const [order] = await listOrders({ status: 'pending', limit: 10 });

  assert.deepEqual(order, { id: 'ORD-7', client: 'Alpha', value: '230.50', days: 2 });
  assert.equal(client.released, true);
});

test('listRoutes includes routes without orders', async () => {
  const client = makeClient([
    (sql, params) => (sql.includes('FROM routes r') ? {
      rowCount: 1,
      rows: [{ id: 3, name: 'North', order_count: 5, active_order_count: params[0] === 'active' ? 2 : 0 }]
    } : undefined)
  ]);

  setDbClient(client);
  delete require.cache[require.resolve('../src/modules/reports')];

  const { listRoutes } = require('../src/modules/reports');
  const [route] = await listRoutes({ status: 'active' });

  assert.deepEqual(route, { id: 'R-03', driver: null, stops: 5, status: 'В пути' });
  assert.equal(client.released, true);
});

test('listProducts returns active product fields and applies limit', async () => {
  const client = makeClient([
    (sql, params) => (sql.includes('FROM products') ? {
      rowCount: 1,
      rows: [{ id: 4, sku: 'SKU-4', name: 'Cement', variant: '', category: 'Building materials', description: 'For masonry', unit: 'bag', price: '85.50', stock: 12, created_at: '2026-09-20T00:00:00.000Z' }],
      params
    } : undefined)
  ]);

  setDbClient(client);
  delete require.cache[require.resolve('../src/modules/reports')];

  const { listProducts } = require('../src/modules/reports');
  const [product] = await listProducts({ limit: 10 });

  assert.deepEqual(product, {
    id: 4,
    sku: 'SKU-4',
    name: 'Cement',
    variant: '',
    category: 'Building materials',
    description: 'For masonry',
    unit: 'bag',
    price: '85.50',
    stock: 12,
    createdAt: '2026-09-20T00:00:00.000Z'
  });
  assert.equal(client.released, true);
});

test('dashboard summary returns real contract from empty database', async () => {
  const client = makeClient([]);
  setDbClient(client);
  delete require.cache[require.resolve('../src/modules/reports')];

  const { getDashboardSummary } = require('../src/modules/reports');
  const summary = await getDashboardSummary();

  assert.ok(summary.summary);
  assert.equal(summary.summary.todaySales, '0.00');
  assert.equal(summary.summary.totalReceivable, '0.00');
  assert.deepEqual(summary.salesSeries, []);
  assert.deepEqual(summary.topClients, []);
  assert.deepEqual(summary.topProducts, []);
  assert.equal(summary.agingSummary.buckets.length, 3);
  assert.equal(client.released, true);
});

test('listClients rejects when database query fails instead of returning fake data', async () => {
  const client = {
    query: async () => { throw new Error('DATABASE_UNAVAILABLE'); },
    release: function () { this.released = true; }
  };
  setDbClient(client);
  delete require.cache[require.resolve('../src/modules/reports')];

  const { listClients } = require('../src/modules/reports');

  await assert.rejects(() => listClients(), (error) => error.message === 'DATABASE_UNAVAILABLE');
  assert.equal(client.released, true);
});
