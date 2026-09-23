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
    (sql) => (sql.includes('FROM orders') ? { rowCount: 1, rows: [{ id: 7, client_id: 11, supplier_id: 2, status: 'delivered', total_amount: '230.50' }] } : undefined),
    (sql) => (sql.includes('FROM suppliers') ? { rowCount: 1, rows: [{ id: 2, legal_name: 'Supplier SRL', tax_id: '123', address: 'Street 1', bank_name: 'Bank', iban: 'MD00TEST' }] } : undefined),
    (sql) => (sql.includes('FROM clients') ? { rowCount: 1, rows: [{ id: 11, name: 'Buyer SRL', company_name: 'Buyer SRL', tax_id: '456', address: 'Street 2' }] } : undefined),
    (sql) => (sql.includes('SELECT id FROM invoices') ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('FROM order_items') ? { rowCount: 1, rows: [{ product_id: 4, product_name: 'Cement', unit: 'bag', quantity: '2', unit_price: '100.00', vat_rate: '15', net_amount: '200.00', vat_amount: '30.00', total_amount: '230.00' }] } : undefined),
    (sql) => (sql.includes('INSERT INTO invoices') ? { rowCount: 1, rows: [{ id: 15, serie: 'INV', number: 101, order_id: 7, client_id: 11, total: '230.00', paid: '0.00', status: 'issued' }] } : undefined),
    (sql) => (sql === 'COMMIT' ? { rowCount: 0, rows: [] } : undefined)
  ]);
  setDbClient(client);

  delete require.cache[require.resolve('../src/modules/documents')];
  const { createInvoiceFromDeliveredOrder } = require('../src/modules/documents');

  const invoice = await createInvoiceFromDeliveredOrder({ orderId: 7, serie: 'INV' });

  assert.equal(invoice.number, 101);
  assert.equal(invoice.order_id, 7);
  assert.equal(invoice.client_id, 11);
  assert.ok(queries.some((query) => query.sql.includes('INSERT INTO invoice_items')));
  const invoiceInsert = queries.find((query) => query.sql.includes('INSERT INTO invoices'));
  assert.deepEqual(JSON.parse(invoiceInsert.params[5]), {
    id: 2,
    legalName: 'Supplier SRL',
    taxId: '123',
    address: 'Street 1',
    bankName: 'Bank',
    iban: 'MD00TEST'
  });
  assert.deepEqual(JSON.parse(invoiceInsert.params[6]), {
    id: 11,
    name: 'Buyer SRL',
    companyName: 'Buyer SRL',
    fiscalCode: '456',
    address: 'Street 2'
  });
  assert.equal(queries[0].sql, 'BEGIN');
  assert.equal(queries[queries.length - 1].sql, 'COMMIT');
  assert.equal(client.released, true);
});

test('createInvoiceFromDeliveredOrder rejects same seller and buyer tax ID', async () => {
  queries = [];
  const client = makeClient([
    (sql) => (sql === 'BEGIN' ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('FROM orders') ? { rowCount: 1, rows: [{ id: 7, client_id: 11, supplier_id: 2, status: 'delivered', total_amount: '230.50' }] } : undefined),
    (sql) => (sql.includes('FROM suppliers') ? { rowCount: 1, rows: [{ id: 2, legal_name: 'Supplier SRL', tax_id: 'same- tax', address: 'Street 1', bank_name: 'Bank', iban: 'MD00TEST' }] } : undefined),
    (sql) => (sql.includes('FROM clients') ? { rowCount: 1, rows: [{ id: 11, name: 'Buyer SRL', company_name: 'Buyer SRL', tax_id: 'SAME-TAX', address: 'Street 2' }] } : undefined),
    (sql) => (sql === 'ROLLBACK' ? { rowCount: 0, rows: [] } : undefined)
  ]);
  setDbClient(client);

  delete require.cache[require.resolve('../src/modules/documents')];
  const { createInvoiceFromDeliveredOrder } = require('../src/modules/documents');

  await assert.rejects(
    () => createInvoiceFromDeliveredOrder({ orderId: 7 }),
    (error) => error.message === 'SUPPLIER_EQUALS_BUYER'
  );
  assert.equal(queries.at(-1).sql, 'ROLLBACK');
  assert.equal(client.released, true);
});

test('createOrder calculates VAT and persists selected product rows', async () => {
  queries = [];
  const client = makeClient([
    (sql) => (sql === 'BEGIN' ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('FROM suppliers') ? { rowCount: 1, rows: [{ id: 2, tax_id: 'SUPPLIER-TAX' }] } : undefined),
    (sql) => (sql.includes('FROM clients') ? { rowCount: 1, rows: [{ id: 11, tax_id: 'BUYER-TAX' }] } : undefined),
    (sql) => (sql.includes('FROM products') ? { rowCount: 1, rows: [{ id: 4, name: 'Cement', unit: 'bag', price: '100.00' }] } : undefined),
    (sql) => (sql.includes('INSERT INTO orders') ? { rowCount: 1, rows: [{ id: 9, external_id: 'ORD-9', client_id: 11, supplier_id: 2, total_amount: '0.00', status: 'pending', created_at: new Date('2026-09-23T00:00:00Z') }] } : undefined),
    (sql) => (sql.includes('INSERT INTO order_items') ? { rowCount: 1, rows: [] } : undefined),
    (sql) => (sql.includes('UPDATE orders SET total_amount') ? { rowCount: 1, rows: [] } : undefined),
    (sql) => (sql === 'COMMIT' ? { rowCount: 0, rows: [] } : undefined)
  ]);
  setDbClient(client);

  delete require.cache[require.resolve('../src/modules/documents')];
  const { createOrder } = require('../src/modules/documents');
  const order = await createOrder({
    clientId: 11,
    supplierId: 2,
    items: [{ productId: 4, quantity: 2 }]
  });

  assert.equal(order.subtotal, '200.00');
  assert.equal(order.vat_total, '40.00');
  assert.equal(order.total_amount, '240.00');
  assert.equal(order.items[0].vatRate, 20);
  assert.ok(queries.some((query) => query.sql.includes('INSERT INTO order_items')));
  assert.equal(client.released, true);
});

test('createOrder rejects when supplier and buyer have the same tax ID', async () => {
  const client = makeClient([
    (sql) => (sql === 'BEGIN' ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('FROM suppliers') ? { rowCount: 1, rows: [{ id: 2, tax_id: 'SAME-TAX' }] } : undefined),
    (sql) => (sql.includes('FROM clients') ? { rowCount: 1, rows: [{ id: 11, tax_id: 'SAME-TAX' }] } : undefined),
    (sql) => (sql === 'ROLLBACK' ? { rowCount: 0, rows: [] } : undefined)
  ]);
  setDbClient(client);

  delete require.cache[require.resolve('../src/modules/documents')];
  const { createOrder } = require('../src/modules/documents');

  await assert.rejects(
    () => createOrder({ clientId: 11, supplierId: 2, items: [{ productId: 4, quantity: 1 }] }),
    (error) => error.message === 'SUPPLIER_EQUALS_BUYER'
  );
  assert.equal(client.released, true);
});

test('createInvoiceFromDeliveredOrder fails when order not delivered', async () => {
  queries = [];
  const client = makeClient([
    (sql) => (sql === 'BEGIN' ? { rowCount: 0, rows: [] } : undefined),
    (sql) => (sql.includes('FROM orders') ? { rowCount: 1, rows: [{ id: 8, client_id: 2, supplier_id: null, status: 'pending', total_amount: '100.00' }] } : undefined),
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
