const test = require('node:test');
const assert = require('node:assert/strict');

const { generateInvoicePdf } = require('../src/modules/pdf');
const { buildReportCsv, buildReportXlsx } = require('../src/modules/exports');

test('generateInvoicePdf returns a valid PDF buffer', async () => {
  const pdf = await generateInvoicePdf(7);
  assert.ok(Buffer.isBuffer(pdf));
  assert.ok(pdf.length > 0);
});

test('buildReportCsv and buildReportXlsx return export payloads', async () => {
  const csv = await buildReportCsv({ from: '2026-01-01', to: '2026-01-31' });
  const xlsx = await buildReportXlsx({ from: '2026-01-01', to: '2026-01-31' });

  assert.ok(typeof csv === 'string');
  assert.ok(csv.includes('label,total'));
  assert.ok(Buffer.isBuffer(xlsx));
  assert.ok(xlsx.length > 0);
});
