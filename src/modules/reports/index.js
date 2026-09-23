const db = require('../../db');
const { moduleBoundaries } = require('../module-boundaries');

function toFixed2(value) {
  return Number(value || 0).toFixed(2);
}

async function getDashboardSummary() {
  const client = await db.getClient();

  try {
    const summaryRes = await client.query(`
      SELECT
        COALESCE(SUM(CASE WHEN issued_at >= NOW() - INTERVAL '30 days' THEN total ELSE 0 END), 0) AS month_sales,
        COALESCE(SUM(CASE WHEN status IN ('issued', 'partially_paid') THEN GREATEST(total - paid, 0) ELSE 0 END), 0) AS outstanding,
        COUNT(*) FILTER (WHERE status = 'issued') AS open_invoices,
        COUNT(*) FILTER (WHERE status = 'partially_paid') AS partial_invoices,
        COALESCE(SUM(CASE WHEN issued_at >= NOW() - INTERVAL '1 day' THEN total ELSE 0 END), 0) AS today_sales
      FROM invoices
    `);

    const summaryRow = summaryRes.rows[0] || {};
    const totalReceivable = Number(summaryRow.outstanding || 0);

    const seriesRes = await client.query(`
      SELECT
        TO_CHAR(issued_at, 'DD.MM') AS label,
        COALESCE(SUM(total), 0) AS vanzari
      FROM invoices
      WHERE issued_at >= NOW() - INTERVAL '30 days'
      GROUP BY TO_CHAR(issued_at, 'DD.MM')
      ORDER BY MIN(issued_at)
    `);

    const topClientsRes = await client.query(`
      SELECT c.name, COALESCE(SUM(i.total), 0)::numeric(12,2) AS value
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      GROUP BY c.name
      ORDER BY SUM(i.total) DESC
      LIMIT 10
    `);

    const pendingOrdersRes = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status <> 'delivered') AS pending_orders,
        (SELECT COUNT(*) FROM routes) AS active_routes
      FROM orders
    `);
    const ordersRow = pendingOrdersRes.rows[0] || {};

    const agingRes = await client.query(`
      SELECT
        CASE
          WHEN NOW() - due_at <= INTERVAL '30 days' THEN '0-30 дней'
          WHEN NOW() - due_at <= INTERVAL '60 days' THEN '31-60 дней'
          ELSE '>60 дней'
        END AS label,
        COALESCE(SUM(GREATEST(total - paid, 0)), 0)::numeric(12,2) AS value,
        COUNT(*)::int AS count
      FROM invoices
      WHERE status IN ('issued', 'partially_paid') AND due_at IS NOT NULL AND due_at < NOW()
      GROUP BY 1
    `);

    const bucketOrder = ['0-30 дней', '31-60 дней', '>60 дней'];
    const agingByLabel = Object.fromEntries(agingRes.rows.map((row) => [row.label, row]));

    return {
      summary: {
        todaySales: toFixed2(summaryRow.today_sales),
        monthSales: toFixed2(summaryRow.month_sales),
        pendingOrders: Number(ordersRow.pending_orders || 0),
        activeRoutes: Number(ordersRow.active_routes || 0),
        totalReceivable: toFixed2(totalReceivable)
      },
      salesSeries: seriesRes.rows.map((row) => ({ label: row.label, vanzari: Number(row.vanzari) })),
      topClients: topClientsRes.rows.map((row) => ({ name: row.name, value: Number(row.value) })),
      topProducts: [],
      agingSummary: {
        totalOutstanding: toFixed2(totalReceivable),
        buckets: bucketOrder.map((label) => ({
          label,
          value: toFixed2(agingByLabel[label]?.value),
          count: Number(agingByLabel[label]?.count || 0)
        }))
      }
    };
  } finally {
    client.release();
  }
}

async function listClients() {
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT
        c.id,
        c.name,
        COALESCE(SUM(i.total - i.paid), 0)::numeric(12,2) AS balance,
        COALESCE(MAX(CASE
          WHEN i.due_at IS NOT NULL AND i.status IN ('issued', 'partially_paid')
          THEN GREATEST(DATE_PART('day', NOW() - i.due_at), 0)
          ELSE 0
        END), 0)::int AS maxDebtAge
      FROM clients c
      LEFT JOIN invoices i ON i.client_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
    `);

    return result.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      balance: Number(row.balance),
      maxDebtAge: Number(row.maxdebtage || 0)
    }));
  } finally {
    client.release();
  }
}

async function getClientById(clientId) {
  const client = await db.getClient();

  try {
    const clientResult = await client.query(`
      SELECT c.id, c.name, c.company_name, c.email, c.phone, c.tax_id, c.address,
             COALESCE(SUM(i.total - i.paid), 0)::numeric(12,2) AS balance,
             COALESCE(MAX(CASE WHEN i.due_at IS NOT NULL AND i.status IN ('issued', 'partially_paid') THEN GREATEST(DATE_PART('day', NOW() - i.due_at), 0) ELSE 0 END), 0)::int AS maxDebtAge
      FROM clients c
      LEFT JOIN invoices i ON i.client_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.company_name, c.email, c.phone, c.tax_id, c.address
    `, [Number(clientId)]);

    if (clientResult.rowCount === 0) {
      return null;
    }

    const clientRow = clientResult.rows[0];
    const invoiceResult = await client.query(`
      SELECT id, serie, number, total, paid, status, due_at
      FROM invoices
      WHERE client_id = $1
      ORDER BY due_at DESC NULLS LAST
    `, [Number(clientId)]);

    const paymentResult = await client.query(`
      SELECT id, amount, paid_at AS date, reference AS receiptNumber
      FROM payments
      WHERE client_id = $1
      ORDER BY paid_at DESC
    `, [Number(clientId)]);

    return {
      id: Number(clientRow.id),
      name: clientRow.name,
      company_name: clientRow.company_name,
      email: clientRow.email,
      phone: clientRow.phone,
      tax_id: clientRow.tax_id,
      address: clientRow.address,
      balance: Number(clientRow.balance || 0),
      maxDebtAge: Number(clientRow.maxdebtage || 0),
      invoices: invoiceResult.rows.map((row) => ({
        id: Number(row.id),
        clientId: Number(clientId),
        serie: row.serie,
        number: Number(row.number),
        total: Number(row.total),
        paid: Number(row.paid),
        due_at: row.due_at ? new Date(row.due_at).toISOString() : null,
        status: row.status
      })),
      paymentHistory: paymentResult.rows.map((row) => ({
        id: Number(row.id),
        clientId: Number(clientId),
        amount: Number(row.amount),
        date: row.date ? new Date(row.date).toISOString() : null,
        receiptNumber: row.receiptnumber
      }))
    };
  } finally {
    client.release();
  }
}

async function listInvoices() {
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT id, serie, number, client_id, total, paid, status, due_at
      FROM invoices
      ORDER BY issued_at DESC
    `);

    return result.rows.map((row) => ({
      id: Number(row.id),
      invoiceId: Number(row.id),
      clientId: Number(row.client_id),
      number: `${row.serie}-${row.number}`,
      pdfUrl: `/api/v1/invoices/${row.id}/pdf`,
      status: row.status,
      total: Number(row.total),
      paid: Number(row.paid),
      remaining: Number(row.total) - Number(row.paid)
    }));
  } finally {
    client.release();
  }
}

async function listOrders({ status, limit } = {}) {
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT o.id, o.external_id, o.client_id, c.name AS client_name,
             o.total_amount, o.status, o.created_at
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      WHERE ($1::text IS NULL OR o.status = $1)
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT $2
    `, [status || null, limit]);

    return result.rows.map((row) => ({
      id: row.external_id || `ORD-${row.id}`,
      client: row.client_name,
      value: toFixed2(row.total_amount),
      days: row.created_at
        ? Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000))
        : 0
    }));
  } finally {
    client.release();
  }
}

async function listRoutes({ status } = {}) {
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT r.id, r.name, COUNT(o.id)::int AS order_count,
             COUNT(o.id) FILTER (WHERE o.status <> 'delivered')::int AS active_order_count
      FROM routes r
      LEFT JOIN orders o ON o.route_id = r.id
      GROUP BY r.id, r.name
      HAVING ($1::text IS NULL)
          OR ($1 = 'active' AND COUNT(o.id) FILTER (WHERE o.status <> 'delivered') > 0)
          OR ($1 = 'inactive' AND COUNT(o.id) FILTER (WHERE o.status <> 'delivered') = 0)
      ORDER BY r.name ASC, r.id ASC
    `, [status || null]);

    return result.rows.map((row) => ({
      id: `R-${String(row.id).padStart(2, '0')}`,
      driver: null,
      stops: Number(row.order_count || 0),
      status: Number(row.active_order_count || 0) > 0 ? 'В пути' : 'Свободен'
    }));
  } finally {
    client.release();
  }
}

async function listProducts({ limit = 10 } = {}) {
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT id, sku, name, variant, category, description, unit, price, stock, created_at
      FROM products
      WHERE is_active = TRUE
      ORDER BY name ASC, id ASC
      LIMIT $1
    `, [limit]);

    return result.rows.map((row) => ({
      id: Number(row.id),
      sku: row.sku,
      name: row.name,
      variant: row.variant,
      category: row.category,
      description: row.description,
      unit: row.unit,
      price: toFixed2(row.price),
      stock: Number(row.stock),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
    }));
  } finally {
    client.release();
  }
}

async function getInvoiceById(invoiceId) {
  const client = await db.getClient();

  try {
    const result = await client.query(`
                  SELECT i.id, i.serie, i.number, i.order_id, o.external_id AS order_external_id,
                    i.client_id, i.issued_at, i.due_at, i.subtotal, i.vat_total, i.total,
                    i.paid, i.status, i.supplier_snapshot, i.client_snapshot,
              c.name AS client_name, c.company_name, c.tax_id, c.address AS client_address
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
                  LEFT JOIN orders o ON o.id = i.order_id
      WHERE i.id = $1
    `, [Number(invoiceId)]);

    if (result.rowCount === 0) {
      return null;
    }

    const invoice = result.rows[0];
    const itemsResult = await client.query(`
            SELECT line_number, product_id, product_name, product_variant, unit, quantity, unit_price, vat_rate,
              net_amount, vat_amount, total_amount, is_demo
      FROM invoice_items
      WHERE invoice_id = $1
      ORDER BY id
    `, [Number(invoiceId)]);

    return {
      id: Number(invoice.id),
      serie: invoice.serie,
      number: Number(invoice.number),
      order_id: Number(invoice.order_id),
      orderNumber: invoice.order_external_id,
      client_id: Number(invoice.client_id),
      issued_at: invoice.issued_at ? new Date(invoice.issued_at).toISOString() : null,
      due_at: invoice.due_at ? new Date(invoice.due_at).toISOString() : null,
      total: toFixed2(invoice.total),
      subtotal: toFixed2(invoice.subtotal),
      vatTotal: toFixed2(invoice.vat_total),
      paid: toFixed2(invoice.paid),
      status: invoice.status,
      supplier: {
        ...(invoice.supplier_snapshot || {}),
        fiscalCode: invoice.supplier_snapshot?.taxId || '',
        accountNumber: invoice.supplier_snapshot?.iban || '',
        currentAccount: invoice.supplier_snapshot?.iban || ''
      },
      client: invoice.client_snapshot && Object.keys(invoice.client_snapshot).length > 0
        ? invoice.client_snapshot
        : {
        name: invoice.client_name,
        companyName: invoice.company_name,
        fiscalCode: invoice.tax_id,
        address: invoice.client_address
      },
      items: itemsResult.rows.map((item) => ({
        lineNumber: Number(item.line_number),
        productId: item.product_id === null ? null : Number(item.product_id),
        name: item.product_name,
        productName: item.product_name,
        variant: item.product_variant,
        productVariant: item.product_variant,
        unit: item.unit,
        quantity: Number(item.quantity),
        qty: Number(item.quantity),
        unitPrice: toFixed2(item.unit_price),
        priceWithoutVat: toFixed2(item.unit_price),
        vatRate: Number(item.vat_rate),
        netAmount: toFixed2(item.net_amount),
        amountWithoutVat: toFixed2(item.net_amount),
        lineTotalWithoutVat: toFixed2(item.net_amount),
        vatAmount: toFixed2(item.vat_amount),
        totalAmount: toFixed2(item.total_amount)
      }))
    };
  } finally {
    client.release();
  }
}

async function getAgingReport() {
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT
        CASE
          WHEN NOW() - due_at <= INTERVAL '30 days' THEN '0-30 дней'
          WHEN NOW() - due_at <= INTERVAL '60 days' THEN '31-60 дней'
          ELSE '>60 дней'
        END AS bucket,
        COALESCE(SUM(GREATEST(total - paid, 0)), 0)::numeric(12,2) AS total
      FROM invoices
      WHERE status IN ('issued', 'partially_paid') AND due_at IS NOT NULL AND due_at < NOW()
      GROUP BY CASE
        WHEN NOW() - due_at <= INTERVAL '30 days' THEN '0-30 дней'
        WHEN NOW() - due_at <= INTERVAL '60 days' THEN '31-60 дней'
        ELSE '>60 дней'
      END
    `);

    const buckets = (result.rows || []).map((row) => ({
      label: row.bucket,
      total: toFixed2(row.total)
    }));

    const overdueInvoices = await client.query(`
      SELECT i.id, c.name AS client, i.total - i.paid AS value, i.due_at,
             DATE_PART('day', NOW() - i.due_at) AS agingDays
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE i.status IN ('issued', 'partially_paid') AND i.due_at < NOW()
      ORDER BY i.due_at ASC
      LIMIT 10
    `);

    return {
      buckets: buckets.length ? buckets : [
        { label: '0-30 дней', total: '0.00' },
        { label: '31-60 дней', total: '0.00' },
        { label: '>60 дней', total: '0.00' }
      ],
      overdueInvoices: overdueInvoices.rows.map((row) => ({
        no: `INV-${row.id}`,
        client: row.client,
        value: toFixed2(row.value),
        agingDays: Number(row.agingdays || 0)
      }))
    };
  } finally {
    client.release();
  }
}

function getReportsModuleInfo() {
  return moduleBoundaries.reports;
}

module.exports = {
  getDashboardSummary,
  listClients,
  getClientById,
  listInvoices,
  listOrders,
  listRoutes,
  listProducts,
  getInvoiceById,
  getAgingReport,
  getReportsModuleInfo
};
