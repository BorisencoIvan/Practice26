const XLSX = require('xlsx');
const { moduleBoundaries } = require('../module-boundaries');
const { getAgingReport } = require('../reports');

function csvEscape(value) {
  const stringValue = String(value ?? '');
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

async function buildReportCsv({ from, to } = {}) {
  const data = await getAgingReport();
  const rows = [
    ['label', 'total', 'from', 'to'],
    ...data.buckets.map((bucket) => [bucket.label, bucket.total, from || '', to || ''])
  ];

  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

async function buildReportXlsx({ from, to } = {}) {
  const data = await getAgingReport();
  const rows = [
    ['label', 'total', 'from', 'to'],
    ...data.buckets.map((bucket) => [bucket.label, bucket.total, from || '', to || ''])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'aging');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function getExportsModuleInfo() {
  return moduleBoundaries.exports;
}

module.exports = {
  buildReportCsv,
  buildReportXlsx,
  getExportsModuleInfo
};
