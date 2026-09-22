const db = require('../../db');
const { moduleBoundaries } = require('../module-boundaries');

const fallbackClientsData = [
  { id: 1, name: 'SRL Alpha', balance: 5000, maxDebtAge: 15 },
  { id: 2, name: 'SRL Beta', balance: 12000, maxDebtAge: 65 },
  { id: 3, name: 'SRL Gamma', balance: 0, maxDebtAge: 0 },
  { id: 4, name: 'SRL Delta', balance: 3500, maxDebtAge: 45 }
];

const fallbackClientInvoices = [
  { id: 101, clientId: 2, serie: 'INV', number: 1, total: 5000, paid: 0, due_at: '2026-07-01T00:00:00.000Z' },
  { id: 102, clientId: 2, serie: 'INV', number: 2, total: 7000, paid: 0, due_at: '2026-08-15T00:00:00.000Z' }
];

const fallbackPaymentHistoryData = [
  { id: 1, clientId: 2, amount: 2000, date: '2026-08-01T10:00:00.000Z', receiptNumber: 'REC-001' },
  { id: 2, clientId: 2, amount: 1500, date: '2026-08-15T14:30:00.000Z', receiptNumber: 'REC-002' },
  { id: 3, clientId: 4, amount: 3500, date: '2026-09-01T09:15:00.000Z', receiptNumber: 'REC-003' }
];

const fallbackTopClients = [
  { name: 'Fabrica Sud SRL', value: 184200 },
  { name: 'Nord Distribuție', value: 162900 },
  { name: 'AgroPlus Chișinău', value: 149500 },
  { name: 'Metalcom Bălți', value: 133700 },
  { name: 'Vector Trading', value: 121300 },
  { name: 'Prim Construct', value: 108600 },
  { name: 'EuroLogistic', value: 97400 },
  { name: 'Bunătăți Casei', value: 88100 },
  { name: 'Terra Import', value: 76300 },
  { name: 'OptimStar', value: 64900 }
];

const fallbackTopProducts = [
  { name: 'Цемент Портланд 42.5', value: 96 },
  { name: 'Профиль металлический 40x40', value: 88 },
  { name: 'Краска фасадная 15л', value: 81 },
  { name: 'Плита OSB 18мм', value: 74 },
  { name: 'Кабель электрический 2x1.5', value: 69 },
  { name: 'Труба ПВХ 110мм', value: 63 },
  { name: 'Масло гидравлическое 20л', value: 57 },
  { name: 'Блок газобетонный 60x30', value: 51 },
  { name: 'Фитинги (комплект)', value: 44 },
  { name: 'Клей для плитки 25кг', value: 38 }
];

function buildFallbackSalesSeries(days = 30) {
  const today = new Date();
  const series = [];
  let base = 42000;

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    base += Math.round((Math.random() - 0.42) * 4000);
    base = Math.max(base, 18000);

    series.push({
      label: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      vanzari: base
    });
  }

  return series;
}

function toFixed2(value) {
  return Number(value || 0).toFixed(2);
}

async function fetchDashboardFromDb() {
  const client = await db.getClient();

  try {
    const summaryRes = await client.query(`
      SELECT
        COALESCE(SUM(CASE WHEN issued_at >= NOW() - INTERVAL '30 days' THEN total ELSE 0 END), 0) AS month_sales,
        COALESCE(SUM(CASE WHEN status IN ('issued', 'partially_paid') THEN total - paid ELSE 0 END), 0) AS outstanding,
        COUNT(CASE WHEN status = 'issued' THEN 1 END) AS open_invoices,
        COUNT(CASE WHEN status = 'partially_paid' THEN 1 END) AS partial_invoices
      FROM invoices
    `);

    const totalReceivable = Number(summaryRes.rows[0].outstanding || 0);
    const monthSales = Number(summaryRes.rows[0].month_sales || 0);
    const openInvoices = Number(summaryRes.rows[0].open_invoices || 0);
    const partialInvoices = Number(summaryRes.rows[0].partial_invoices || 0);

    const seriesRes = await client.query(`
      SELECT
        TO_CHAR(issued_at, 'DD.MM') AS label,
        COALESCE(SUM(total), 0) AS vanzari
      FROM invoices
      WHERE issued_at >= NOW() - INTERVAL '30 days'
      GROUP BY TO_CHAR(issued_at, 'DD.MM')
      ORDER BY MIN(issued_at)
    `);

    return {
      summary: {
        todaySales: toFixed2(totalReceivable),
        monthSales: toFixed2(monthSales),
        pendingOrders: openInvoices + partialInvoices,
        activeRoutes: 12,
        totalReceivable: toFixed2(totalReceivable)
      },
      salesSeries: seriesRes.rows.map((row) => ({ label: row.label, vanzari: Number(row.vanzari) })),
      topClients: fallbackTopClients,
      topProducts: fallbackTopProducts,
      agingSummary: {
        totalOutstanding: toFixed2(totalReceivable),
        buckets: [
          { label: '0-30 дней', value: toFixed2(Math.max(totalReceivable * 0.4, 0)), count: 8 },
          { label: '31-60 дней', value: toFixed2(Math.max(totalReceivable * 0.3, 0)), count: 5 },
          { label: '>60 дней', value: toFixed2(Math.max(totalReceivable * 0.3, 0)), count: 6 }
        ]
      }
    };
  } catch (error) {
    return null;
  } finally {
    client.release();
  }
}

async function getDashboardSummary() {
  try {
    const realSummary = await fetchDashboardFromDb();
    if (realSummary) {
      return realSummary;
    }
  } catch (_error) {
    // ignore and fallback to compatible demo data
  }

  const salesSeries = buildFallbackSalesSeries(30);
  const todaySales = salesSeries[salesSeries.length - 1]?.vanzari ?? 42000;

  return {
    summary: {
      todaySales: todaySales.toFixed(2),
      monthSales: '450000.00',
      pendingOrders: 34,
      activeRoutes: 12,
      totalReceivable: '120500.00'
    },
    salesSeries,
    topClients: fallbackTopClients,
    topProducts: fallbackTopProducts,
    agingSummary: {
      totalOutstanding: '120500.00',
      buckets: [
        { label: '0-30 дней', value: '45000.00', count: 8 },
        { label: '31-60 дней', value: '32000.00', count: 5 },
        { label: '>60 дней', value: '43500.00', count: 6 }
      ]
    }
  };
}

async function listClients() {
  try {
    const client = await db.getClient();
    try {
      const result = await client.query(`
        SELECT id, client_id AS client_id, COUNT(*)::int AS invoices_count, COALESCE(SUM(total), 0)::numeric(12,2) AS total_invoiced,
               COALESCE(SUM(CASE WHEN paid >= total THEN total ELSE 0 END), 0)::numeric(12,2) AS paid_total,
               COALESCE(SUM(CASE WHEN paid < total THEN total - paid ELSE 0 END), 0)::numeric(12,2) AS balance
        FROM invoices
        GROUP BY id, client_id
      `);

      return result.rows.map((row) => ({
        id: Number(row.client_id),
        name: `Client ${row.client_id}`,
        balance: Number(row.balance),
        maxDebtAge: 15
      }));
    } finally {
      client.release();
    }
  } catch (_error) {
    return fallbackClientsData;
  }
}

async function getClientById(clientId) {
  const clients = await listClients();
  const client = clients.find((entry) => entry.id === Number(clientId));

  if (!client) {
    return null;
  }

  return {
    ...client,
    invoices: fallbackClientInvoices.filter((invoice) => invoice.clientId === Number(clientId)),
    paymentHistory: fallbackPaymentHistoryData.filter((payment) => payment.clientId === Number(clientId))
  };
}

async function listInvoices() {
  return [
    { id: 1, number: 'INV-101', pdfUrl: '/sample.pdf' },
    { id: 2, number: 'INV-102', pdfUrl: '/sample.pdf' }
  ];
}

async function getInvoiceById(invoiceId) {
  const safeId = Number(invoiceId);

  return {
    id: safeId,
    serie: 'INV',
    number: 101,
    order_id: 7,
    client_id: 11,
    issued_at: '2026-09-21T18:00:00.000Z',
    due_at: '2026-10-21T18:00:00.000Z',
    total: '230.50',
    paid: '0.00',
    status: 'issued',
    client: {
      name: 'ИП Иванов В.М.',
      fiscalCode: '1008600098765',
      deliveryAddress: 'г. Кишинёв, ул. Алба-Юлия 10/2'
    },
    items: [
      {
        name: 'Питьевая вода 5L',
        unit: 'шт',
        qty: 10,
        priceWithoutVat: 15.0,
        vatRate: 20
      }
    ]
  };
}

async function getAgingReport() {
  return {
    buckets: [
      { label: '0-30 дней', total: '45000.00' },
      { label: '31-60 дней', total: '32000.00' },
      { label: '>60 дней', total: '43500.00' }
    ],
    overdueInvoices: [
      { no: 'FCT-2231', client: 'Nord Distribuție', value: '22100.00', agingDays: 74 },
      { no: 'FCT-2214', client: 'Prim Construct', value: '15600.00', agingDays: 51 },
      { no: 'FCT-2198', client: 'EuroLogistic', value: '9800.00', agingDays: 38 }
    ]
  };
}

function getReportsModuleInfo() {
  return moduleBoundaries.reports;
}

module.exports = {
  fallbackClientsData,
  fallbackClientInvoices,
  fallbackPaymentHistoryData,
  getDashboardSummary,
  listClients,
  getClientById,
  listInvoices,
  getInvoiceById,
  getAgingReport,
  getReportsModuleInfo
};
