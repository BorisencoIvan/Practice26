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
  client_snapshot: {
    name: 'Test SRL',
    companyName: 'Test SRL SA',
    fiscalCode: '1008600098765',
    address: 'Billing address',
    deliveryAddress: 'Delivery address'
  },
  client_name: 'Test SRL',
  company_name: 'Test SRL SA',
  tax_id: '1008600098765'
};

let salesQueryParams;
let agingQueryParams;

const mockClient = {
  query: async (sql, params) => {
    if (sql.includes('FROM invoices i') && sql.includes('payments p') && sql.includes('total_debt')) {
      agingQueryParams = params;
      return {
        rowCount: 1,
        rows: [{ invoice_id: 7, client_name: 'Test SRL', total_debt: '120.50', due_date: '2026-09-30', days_overdue: 0, aging_bucket: 'Не просрочен', last_payment_date: '2026-09-10', status: 'partially_paid' }]
      };
    }
    if (sql.includes('FROM invoices i') && sql.includes('JOIN invoice_items')) {
      salesQueryParams = params;
      return {
        rowCount: 2,
        rows: [
          { invoice_id: 7, client_name: 'Test SRL', issued_at: '2026-09-01', status: 'issued', net_amount: '100.00', vat_rate: '20', vat_amount: '20.00', total_amount: '120.00' },
          { invoice_id: 7, client_name: 'Test SRL', issued_at: '2026-09-01', status: 'issued', net_amount: '50.00', vat_rate: '10', vat_amount: '5.00', total_amount: '55.00' }
        ]
      };
    }
    if (sql.includes('AS bucket')) {
      return { rowCount: 1, rows: [{ bucket: '0-30 дней', total: '100.00' }] };
    }
    if (sql.includes('AS agingDays')) {
      return { rowCount: 1, rows: [{ id: 5, client: 'Test SRL', value: '50.00', agingdays: '10' }] };
    }
    if (sql.includes('WHERE i.id = $1')) {
      return { rowCount: 1, rows: [{ ...invoiceRow, delivery_address: 'Order delivery address' }] };
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
          total_amount: '1260.00'
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
const { buildReportCsv, buildReportXlsx, buildSalesCsv, buildSalesXlsx, buildAgingCsv, buildAgingXlsx } = require('../src/modules/exports');

test('generateInvoicePdf returns a valid PDF buffer', async () => {
  const pdf = await generateInvoicePdf(7);
  assert.ok(Buffer.isBuffer(pdf));
  assert.ok(pdf.length > 0);
});

test('invoice items expose both canonical and document frontend field names', async () => {
  const { getInvoiceById } = require('../src/modules/reports');
  const invoice = await getInvoiceById(7);

  assert.equal(invoice.client.deliveryAddress, 'Delivery address');
  assert.equal(invoice.client.delivery_address, 'Delivery address');
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

test('invoice client falls back to the order delivery address when snapshot lacks it', async () => {
  const { getInvoiceById } = require('../src/modules/reports');
  const snapshot = invoiceRow.client_snapshot;
  invoiceRow.client_snapshot = {
    name: snapshot.name,
    companyName: snapshot.companyName,
    fiscalCode: snapshot.fiscalCode,
    address: snapshot.address
  };

  try {
    const invoice = await getInvoiceById(7);
    assert.equal(invoice.client.deliveryAddress, 'Order delivery address');
    assert.equal(invoice.client.delivery_address, 'Order delivery address');
  } finally {
    invoiceRow.client_snapshot = snapshot;
  }
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

test('sales export includes selected sales and VAT columns per invoice item', async () => {
  const csv = await buildSalesCsv({
    from: '2026-09-01',
    to: '2026-09-30',
    columns: ['id', 'client', 'date', 'amount', 'vat', 'status', 'manager']
  });
  const [header, firstRow] = csv.split('\n');

  assert.equal(header, 'ID,Клиент,Дата,Сумма без НДС,Сумма с НДС,"Ставка НДС, %",НДС,Статус,Менеджер');
  assert.equal(firstRow, '7,Test SRL,2026-09-01,100,120,20,20,issued,');
  assert.deepEqual(salesQueryParams, ['2026-09-01', '2026-09-30']);

  const xlsx = await buildSalesXlsx({ columns: ['vat'] });
  assert.ok(Buffer.isBuffer(xlsx));
  assert.ok(xlsx.length > 0);
  assert.equal(
    (await buildSalesCsv({ columns: 'ID,Клиент,Дата,Сумма без НДС,Ставка НДС,Статус,Менеджер' })).split('\n')[0],
    'ID,Клиент,Дата,Сумма без НДС,"Ставка НДС, %",Статус,Менеджер'
  );
  assert.equal((await buildSalesCsv({ columns: '["invoice_id","client_name","issued_at","net_amount","vat_rate"]' })).split('\n')[0], 'ID,Клиент,Дата,Сумма без НДС,"Ставка НДС, %"');
  await assert.rejects(() => buildSalesCsv({ columns: ['notAColumn'] }), /INVALID_EXPORT_COLUMNS/);
});

test('debt report export accepts selected debt columns', async () => {
  const columns = 'id,client,total_debt,due_date,days_overdue,aging_bucket,last_payment_date,manager,status';
  const csv = await buildAgingCsv({ from: '2026-05-11', to: '2026-10-10', columns });
  const [header, firstRow] = csv.split('\n');
  assert.equal(header, 'ID счёта,Клиент,Общий долг,Срок оплаты,Дней просрочки,Период задолженности,Дата последней оплаты,Менеджер,Статус счёта');
  assert.equal(firstRow, '7,Test SRL,120.5,2026-09-30,0,Не просрочен,2026-09-10,,partially_paid');
  assert.deepEqual(agingQueryParams, ['2026-05-11', '2026-10-10']);
  assert.ok(Buffer.isBuffer(await buildAgingXlsx({ columns: ['total_debt', 'due_date'] })));
  await assert.rejects(() => buildAgingCsv({ columns: ['unknown_column'] }), /INVALID_EXPORT_COLUMNS/);
});

test('buildReportCsv and buildReportXlsx return export payloads', async () => {
  const csv = await buildReportCsv({ from: '2026-01-01', to: '2026-01-31' });
  const xlsx = await buildReportXlsx({ from: '2026-01-01', to: '2026-01-31' });

  assert.ok(typeof csv === 'string');
  assert.ok(csv.includes('label,total'));
  assert.ok(Buffer.isBuffer(xlsx));
  assert.ok(xlsx.length > 0);
});
