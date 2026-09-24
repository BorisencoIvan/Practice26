const XLSX = require('xlsx');
const { moduleBoundaries } = require('../module-boundaries');
const { getAgingReport } = require('../reports');
const db = require('../../db');

const salesColumns = {
  id: [{ label: 'ID', value: (row) => Number(row.invoice_id) }],
  client: [{ label: 'Клиент', value: (row) => row.client_name }],
  date: [{ label: 'Дата', value: (row) => row.issued_at }],
  amount: [
    { label: 'Сумма без НДС', value: (row) => Number(row.net_amount) },
    { label: 'Сумма с НДС', value: (row) => Number(row.total_amount) }
  ],
  amountWithoutVat: [{ label: 'Сумма без НДС', value: (row) => Number(row.net_amount) }],
  amountWithVat: [{ label: 'Сумма с НДС', value: (row) => Number(row.total_amount) }],
  vat: [
    { label: 'Ставка НДС, %', value: (row) => Number(row.vat_rate) },
    { label: 'НДС', value: (row) => Number(row.vat_amount) }
  ],
  vatRate: [{ label: 'Ставка НДС, %', value: (row) => Number(row.vat_rate) }],
  vatAmount: [{ label: 'НДС', value: (row) => Number(row.vat_amount) }],
  status: [{ label: 'Статус', value: (row) => row.status }],
  manager: [{ label: 'Менеджер', value: () => '' }]
};

async function getSalesRows({ from, to } = {}) {
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT i.id AS invoice_id,
             COALESCE(NULLIF(i.client_snapshot->>'companyName', ''),
                      NULLIF(i.client_snapshot->>'name', ''),
                      c.company_name, c.name) AS client_name,
             i.issued_at::date::text AS issued_at,
             i.status,
             ii.net_amount,
             ii.vat_rate,
             ii.vat_amount,
             ii.total_amount
      FROM invoices i
      JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE ($1::date IS NULL OR i.issued_at >= $1::date)
        AND ($2::date IS NULL OR i.issued_at < $2::date + INTERVAL '1 day')
      ORDER BY i.issued_at, i.id, ii.line_number
    `, [from || null, to || null]);

    return result.rows;
  } finally {
    client.release();
  }
}

const salesColumnAliases = {
  invoice: 'id',
  invoiceid: 'id',
  invoice_id: 'id',
  invoicenumber: 'id',
  invoice_number: 'id',
  number: 'id',
  client_name: 'client',
  clientname: 'client',
  customer: 'client',
  customername: 'client',
  issuedat: 'date',
  issued_at: 'date',
  issuedate: 'date',
  issue_date: 'date',
  invoicedate: 'date',
  total: 'amount',
  totalamount: 'amount',
  netamount: 'amountWithoutVat',
  net_amount: 'amountWithoutVat',
  amountwithoutvat: 'amountWithoutVat',
  netamount: 'amountWithoutVat',
  amountwithvat: 'amountWithVat',
  totalwithvat: 'amountWithVat',
  vat_rate: 'vatRate',
  vatrate: 'vatRate',
  vatamount: 'vatAmount',
  paymentstatus: 'status',
  managername: 'manager'
};

const agingColumns = {
  id: [{ label: 'ID счёта', value: (row) => Number(row.invoice_id) }],
  client: [{ label: 'Клиент', value: (row) => row.client_name }],
  total_debt: [{ label: 'Общий долг', value: (row) => Number(row.total_debt) }],
  due_date: [{ label: 'Срок оплаты', value: (row) => row.due_date }],
  days_overdue: [{ label: 'Дней просрочки', value: (row) => Number(row.days_overdue) }],
  aging_bucket: [{ label: 'Период задолженности', value: (row) => row.aging_bucket }],
  last_payment_date: [{ label: 'Дата последней оплаты', value: (row) => row.last_payment_date }],
  manager: [{ label: 'Менеджер', value: () => '' }],
  status: [{ label: 'Статус счёта', value: (row) => row.status }]
};

const agingColumnLabels = {
  id: 'id', 'номер': 'id', 'номер счета': 'id', 'номер счёта': 'id', 'счет': 'id', 'счёт': 'id',
  client: 'client', 'клиент': 'client', 'наименование клиента': 'client',
  totaldebt: 'total_debt', 'общий долг': 'total_debt', 'сумма долга': 'total_debt', 'задолженность': 'total_debt',
  duedate: 'due_date', 'due date': 'due_date', 'срок оплаты': 'due_date', 'дата оплаты': 'due_date',
  daysoverdue: 'days_overdue', 'days overdue': 'days_overdue', 'дней просрочки': 'days_overdue', 'дни просрочки': 'days_overdue',
  agingbucket: 'aging_bucket', 'aging bucket': 'aging_bucket', 'период задолженности': 'aging_bucket', 'срок просрочки': 'aging_bucket',
  lastpaymentdate: 'last_payment_date', 'last payment date': 'last_payment_date', 'дата последней оплаты': 'last_payment_date', 'последняя оплата': 'last_payment_date', 'дата последнего платежа': 'last_payment_date',
  manager: 'manager', 'менеджер': 'manager', status: 'status', 'статус': 'status'
};

const salesColumnLabels = {
  'id': 'id', 'номер': 'id', 'номер счета': 'id', 'счет': 'id', 'счёт': 'id',
  'client': 'client', 'клиент': 'client', 'наименование клиента': 'client',
  'date': 'date', 'дата': 'date', 'дата счета': 'date', 'дата счёта': 'date',
  'amount': 'amount', 'сумма': 'amount', 'сумма продажи': 'amount',
  'сумма без ндс': 'amountWithoutVat', 'без ндс': 'amountWithoutVat',
  'сумма с ндс': 'amountWithVat', 'с ндс': 'amountWithVat',
  'vat': 'vat', 'ндс': 'vat', 'ставка ндс': 'vatRate', 'ставка ндс, %': 'vatRate',
  'vatrate': 'vatRate', 'vatamount': 'vatAmount',
  'status': 'status', 'статус': 'status',
  'manager': 'manager', 'менеджер': 'manager'
};

function normalizeSalesColumns(columns) {
  if (columns === undefined) {
    return ['id', 'client', 'date', 'amount', 'vat', 'status', 'manager'];
  }

  let provided = Array.isArray(columns) ? columns : [columns];
  provided = provided.flatMap((value) => {
    if (typeof value !== 'string') return [value];
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return trimmed.split(',');
  });

  const selected = provided.map((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().replace(/^['\"]|['\"]$/g, '');
    if (Object.hasOwn(salesColumns, trimmed)) return trimmed;
    const normalized = trimmed.toLocaleLowerCase().replace(/[\u00a0_]+/g, ' ').replace(/\s+/g, ' ').trim();
    return salesColumnLabels[normalized] || salesColumnAliases[normalized.replace(/\s/g, '')] || trimmed;
  });

  if (selected.length === 0 || selected.some((column) => typeof column !== 'string' || !Object.hasOwn(salesColumns, column))) {
    throw new Error('INVALID_EXPORT_COLUMNS');
  }
  return [...new Set(selected)];
}

function normalizeExportColumns(columns, definitions, labels, aliases = {}) {
  if (columns === undefined) return Object.keys(definitions);
  let provided = Array.isArray(columns) ? columns : [columns];
  provided = provided.flatMap((value) => {
    if (typeof value !== 'string') return [value];
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return trimmed.split(',');
  });
  const normalized = provided.map((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().replace(/^['\"]|['\"]$/g, '');
    if (Object.hasOwn(definitions, trimmed)) return trimmed;
    const key = trimmed.toLocaleLowerCase().replace(/[\u00a0_]+/g, ' ').replace(/\s+/g, ' ').trim();
    return labels[key] || aliases[key.replace(/\s/g, '')] || trimmed;
  });
  if (normalized.length === 0 || normalized.some((column) => typeof column !== 'string' || !Object.hasOwn(definitions, column))) {
    throw new Error('INVALID_EXPORT_COLUMNS');
  }
  return [...new Set(normalized)];
}

function normalizeAgingColumns(columns) {
  const aliases = {
    totaldebt: 'total_debt', debt: 'total_debt', amount: 'total_debt',
    duedate: 'due_date', due: 'due_date',
    daysoverdue: 'days_overdue', overdue: 'days_overdue',
    agingbucket: 'aging_bucket', bucket: 'aging_bucket',
    lastpaymentdate: 'last_payment_date', lastpayment: 'last_payment_date',
    invoiceid: 'id', invoice_id: 'id', invoice: 'id', customer: 'client', clientname: 'client',
    managername: 'manager', paymentstatus: 'status'
  };
  return normalizeExportColumns(columns, agingColumns, agingColumnLabels, aliases);
}

async function getAgingExportRows({ from, to } = {}) {
  const client = await db.getClient();
  try {
    const result = await client.query(`
      SELECT i.id AS invoice_id,
             COALESCE(NULLIF(i.client_snapshot->>'companyName', ''), NULLIF(i.client_snapshot->>'name', ''), c.company_name, c.name) AS client_name,
             GREATEST(i.total - i.paid, 0)::numeric(12,2) AS total_debt,
             i.due_at::date::text AS due_date,
             GREATEST(CURRENT_DATE - i.due_at::date, 0)::int AS days_overdue,
             CASE
               WHEN i.due_at IS NULL OR i.due_at >= CURRENT_DATE THEN 'Не просрочен'
               WHEN CURRENT_DATE - i.due_at::date <= 30 THEN '1-30 дней'
               WHEN CURRENT_DATE - i.due_at::date <= 60 THEN '31-60 дней'
               ELSE '>60 дней'
             END AS aging_bucket,
             (SELECT MAX(p.paid_at)::date::text FROM payments p WHERE p.invoice_id = i.id) AS last_payment_date,
             i.status
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.status IN ('issued', 'partially_paid')
        AND GREATEST(i.total - i.paid, 0) > 0
        AND ($1::date IS NULL OR i.due_at::date >= $1::date)
        AND ($2::date IS NULL OR i.due_at::date <= $2::date)
      ORDER BY i.due_at NULLS LAST, i.id
    `, [from || null, to || null]);
    return result.rows;
  } finally {
    client.release();
  }
}

async function buildAgingExportRows({ from, to, columns } = {}) {
  const selected = normalizeAgingColumns(columns);
  const data = await getAgingExportRows({ from, to });
  const columnsToExport = selected.flatMap((column) => agingColumns[column]);
  return [
    columnsToExport.map((column) => column.label),
    ...data.map((row) => columnsToExport.map((column) => column.value(row)))
  ];
}

async function buildAgingCsv(options = {}) {
  const rows = await buildAgingExportRows(options);
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

async function buildAgingXlsx(options = {}) {
  const rows = await buildAgingExportRows(options);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'debts');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function buildSalesExportRows({ from, to, columns } = {}) {
  const selected = normalizeSalesColumns(columns);
  const data = await getSalesRows({ from, to });
  const columnsToExport = selected.flatMap((column) => salesColumns[column]);
  return [
    columnsToExport.map((column) => column.label),
    ...data.map((row) => columnsToExport.map((column) => column.value(row)))
  ];
}

function csvEscape(value) {
  const stringValue = String(value ?? '');
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

async function buildSalesCsv(options = {}) {
  const rows = await buildSalesExportRows(options);
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

async function buildSalesXlsx(options = {}) {
  const rows = await buildSalesExportRows(options);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'sales');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
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
  buildSalesCsv,
  buildSalesXlsx,
  buildAgingCsv,
  buildAgingXlsx,
  getExportsModuleInfo
};
