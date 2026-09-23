const test = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/db');

const invoiceRow = {
  id: 7,
  serie: 'INV',
  number: 101,
  order_id: 7,
  client_id: 11,
  issued_at: new Date('2026-09-21T18:00:00Z'),
  due_at: new Date('2026-10-21T18:00:00Z'),
  total: '230.50',
  paid: '0.00',
  status: 'issued',
  supplier_snapshot: {
    id: 2,
    legalName: 'Supplier SRL',
    taxId: '1024600001001',
    address: 'Street 1',
    bankName: 'Bank',
    iban: 'MD00MERI00000000000001'
  },
  client_name: 'Test SRL',
  company_name: 'Test SRL SA',
  tax_id: '1008600098765'
};

const mockClient = {
  query: async (sql) => {
    if (sql.includes('AS bucket')) {
      return { rowCount: 1, rows: [{ bucket: '0-30 дней', total: '100.00' }] };
    }
    if (sql.includes('AS agingDays')) {
      return { rowCount: 1, rows: [{ id: 5, client: 'Test SRL', value: '50.00', agingdays: '10' }] };
    }
    if (sql.includes('WHERE i.id = $1')) {
      return { rowCount: 1, rows: [invoiceRow] };
    }
    if (sql.includes('FROM invoice_items')) {
      return {
        rowCount: 1,
        rows: [{
          line_number: 1,
          product_id: 3,
          product_name: 'Sand',
          product_variant: 'bulk',
          unit: 'm3',
          quantity: '2.500',
          unit_price: '420.00',
          vat_rate: '20',
          net_amount: '1050.00',
          vat_amount: '210.00',
          total_amount: '1260.00',
          is_demo: true
        }]
      };
    }
    return { rowCount: 0, rows: [] };
  },
  release: () => {}
};

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getClient: async () => mockClient,
    query: async () => { throw new Error('DATABASE_UNAVAILABLE'); }
  }
};

const { generateInvoicePdf } = require('../src/modules/pdf');
const { buildReportCsv, buildReportXlsx } = require('../src/modules/exports');

test('generateInvoicePdf returns a valid PDF buffer', async () => {
  const pdf = await generateInvoicePdf(7);
  assert.ok(Buffer.isBuffer(pdf));
  assert.ok(pdf.length > 0);
});

test('invoice items expose both canonical and document frontend field names', async () => {
  const { getInvoiceById } = require('../src/modules/reports');
  const invoice = await getInvoiceById(7);

  assert.equal(invoice.items[0].quantity, 2.5);
  assert.equal(invoice.items[0].qty, 2.5);
  assert.equal(invoice.items[0].lineNumber, 1);
  assert.equal(invoice.items[0].name, 'Sand');
  assert.equal(invoice.items[0].variant, 'bulk');
  assert.equal(invoice.items[0].productName, 'Sand');
  assert.equal(invoice.items[0].productVariant, 'bulk');
  assert.equal(invoice.items[0].unit, 'm3');
  assert.equal(invoice.items[0].unitPrice, '420.00');
  assert.equal(invoice.items[0].priceWithoutVat, '420.00');
  assert.equal(invoice.items[0].netAmount, '1050.00');
  assert.equal(invoice.items[0].amountWithoutVat, '1050.00');
  assert.equal(invoice.items[0].lineTotalWithoutVat, '1050.00');
});

test('invoice supplier exposes fiscal code and settlement account aliases', async () => {
  const { getInvoiceById } = require('../src/modules/reports');
  const invoice = await getInvoiceById(7);

  assert.equal(invoice.supplier.taxId, '1024600001001');
  assert.equal(invoice.supplier.fiscalCode, '1024600001001');
  assert.equal(invoice.supplier.iban, 'MD00MERI00000000000001');
  assert.equal(invoice.supplier.accountNumber, 'MD00MERI00000000000001');
  assert.equal(invoice.supplier.currentAccount, 'MD00MERI00000000000001');
});

test('buildReportCsv and buildReportXlsx return export payloads', async () => {
  const csv = await buildReportCsv({ from: '2026-01-01', to: '2026-01-31' });
  const xlsx = await buildReportXlsx({ from: '2026-01-01', to: '2026-01-31' });

  assert.ok(typeof csv === 'string');
  assert.ok(csv.includes('label,total'));
  assert.ok(Buffer.isBuffer(xlsx));
  assert.ok(xlsx.length > 0);
});
