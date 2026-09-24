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
      SELECT r.id, r.name, r.route_code, r.driver_name, r.status AS route_status,
             r.origin_name, r.origin_address, r.destination_name, r.destination_address,
             r.planned_start_at, r.estimated_arrival_at,
             r.created_at, r.started_at, r.completed_at, r.updated_at,
             r.stop_count, r.total_amount, r.delivered_stop_count,
             r.pending_stop_count,
             COALESCE(
               jsonb_agg(jsonb_build_object(
                 'id', rs.order_id,
                 'orderId', rs.order_number,
                 'clientName', rs.recipient_name,
                 'recipientName', rs.recipient_name,
                 'recipientAddress', rs.recipient_address,
                 'deliveryAddress', rs.recipient_address,
                 'supplierName', rs.sender_name,
                 'supplierAddress', rs.sender_address,
                 'goods', COALESCE((
                   SELECT jsonb_agg(jsonb_build_object(
                     'productId', oi.product_id,
                     'name', oi.product_name,
                     'variant', oi.product_variant,
                     'unit', oi.unit,
                     'quantity', oi.quantity,
                     'unitPrice', oi.unit_price,
                     'vatRate', oi.vat_rate,
                     'amount', oi.total_amount
                   ) ORDER BY oi.id)
                   FROM order_items oi WHERE oi.order_id = rs.order_id
                 ), '[]'::jsonb),
                 'status', rs.order_status,
                 'amount', rs.order_amount,
                 'createdAt', rs.order_created_at,
                 'deliveredAt', rs.delivered_at,
                 'stopOrder', rs.stop_order
               ) ORDER BY rs.stop_order NULLS LAST, rs.order_created_at, rs.order_id)
               FILTER (WHERE rs.id IS NOT NULL),
               '[]'::jsonb
             ) AS stops_data
      FROM routes r
      LEFT JOIN route_stops rs ON rs.route_id = r.id
      WHERE ($1::text IS NULL)
         OR ($1 = 'active' AND r.status <> 'completed')
         OR ($1 = 'inactive' AND r.status = 'completed')
      GROUP BY r.id, r.name, r.driver_name, r.status
      ORDER BY
        CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END ASC,
        CASE r.status
          WHEN 'in_progress' THEN 1
          WHEN 'planned' THEN 2
          WHEN 'completed' THEN 3
          ELSE 4
        END ASC,
        r.name ASC,
        r.id ASC
    `, [status || null]);

    return result.rows.map((row) => {
      const stops = Array.isArray(row.stops_data) ? row.stops_data : [];
      const labels = { planned: 'Запланирован', in_progress: 'В пути', completed: 'Завершён' };
      return {
        id: `R-${String(row.id).padStart(2, '0')}`,
        name: row.name,
        ...(row.route_code !== undefined ? {
          routeCode: row.route_code,
          origin: {
            name: row.origin_name,
            address: row.origin_address
          },
          destination: {
            name: row.destination_name,
            address: row.destination_address
          },
          plannedStartAt: row.planned_start_at,
          estimatedArrivalAt: row.estimated_arrival_at
        } : {}),
        driver: row.driver_name,
        ...(row.created_at !== undefined ? {
          createdAt: row.created_at,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          updatedAt: row.updated_at
        } : {}),
        orderCount: Number(row.stop_count ?? row.order_count ?? 0),
        ...(row.total_amount !== undefined ? {
          totalAmount: row.total_amount,
          deliveredStopCount: Number(row.delivered_stop_count || 0),
          pendingStopCount: Number(row.pending_stop_count || 0)
        } : {}),
        stops: stops.map((stop) => ({
          ...stop,
          statusLabel: stop.status === 'delivered' ? 'Доставлен' : 'Ожидает доставки'
        })),
        routeStatus: row.route_status,
        status: labels[row.route_status] || row.route_status
      };
    });
  } finally {
    client.release();
  }
}

async function listRouteStops({ routeId, status, limit = 50, offset = 0 }) {
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT
        rs.id,
        rs.route_id,
        rs.order_id,
        rs.stop_order,
        rs.order_number,
        rs.order_status,
        rs.order_amount,
        rs.order_created_at,
        rs.delivered_at,
        rs.recipient_id,
        rs.recipient_name,
        rs.recipient_address,
        rs.supplier_id,
        rs.sender_name,
        rs.sender_address,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'productId', oi.product_id,
            'name', oi.product_name,
            'variant', oi.product_variant,
            'unit', oi.unit,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'vatRate', oi.vat_rate,
            'amount', oi.total_amount
          ) ORDER BY oi.id)
          FROM order_items oi
          WHERE oi.order_id = rs.order_id
        ), '[]'::jsonb) AS goods,
        COUNT(*) OVER ()::int AS total_count
      FROM route_stops rs
      WHERE rs.route_id = $1
        AND ($2::text IS NULL OR rs.order_status = $2)
      ORDER BY rs.stop_order NULLS LAST, rs.order_created_at, rs.order_id
      LIMIT $3 OFFSET $4
    `, [routeId, status || null, limit, offset]);

    return {
      total: result.rows[0] ? result.rows[0].total_count : 0,
      items: result.rows.map((row) => ({
        id: row.id,
        routeId: row.route_id,
        orderId: row.order_id,
        orderNumber: row.order_number,
        stopOrder: row.stop_order,
        status: row.order_status,
        amount: row.order_amount,
        createdAt: row.order_created_at,
        deliveredAt: row.delivered_at,
        recipient: {
          id: row.recipient_id,
          name: row.recipient_name,
          address: row.recipient_address
        },
        sender: {
          id: row.supplier_id,
          name: row.sender_name,
          address: row.sender_address
        },
        goods: row.goods
      }))
    };
  } finally {
    client.release();
  }
}

async function updateRoute({ routeId, driverName, status, orderedOrderIds }) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    const routeResult = await client.query(
      `UPDATE routes
       SET driver_name = CASE WHEN $2::boolean THEN $3::text ELSE driver_name END,
           status = CASE WHEN $4::boolean THEN $5::text ELSE status END
       WHERE id = $1
       RETURNING id`,
      [routeId, driverName !== undefined, driverName === undefined ? null : driverName, status !== undefined, status || null]
    );
    if (!routeResult.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }

    if (orderedOrderIds !== undefined) {
      const ordersResult = await client.query(
        'SELECT id FROM orders WHERE route_id = $1 FOR UPDATE',
        [routeId]
      );
      const routeOrderIds = new Set(ordersResult.rows.map((order) => Number(order.id)));
      if (orderedOrderIds.length !== routeOrderIds.size
          || new Set(orderedOrderIds).size !== orderedOrderIds.length
          || orderedOrderIds.some((id) => !routeOrderIds.has(id))) {
        await client.query('ROLLBACK');
        return { invalidStops: true };
      }
      for (let index = 0; index < orderedOrderIds.length; index += 1) {
        await client.query('UPDATE orders SET stop_order = $2 WHERE id = $1 AND route_id = $3', [orderedOrderIds[index], index + 1, routeId]);
      }
    }

    await client.query('COMMIT');
    return { id: routeId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
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
              c.name AS client_name, c.company_name, c.tax_id, c.address AS client_address,
              o.delivery_address
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
              net_amount, vat_amount, total_amount
      FROM invoice_items
      WHERE invoice_id = $1
      ORDER BY id
    `, [Number(invoiceId)]);

    const clientSnapshot = invoice.client_snapshot || {};
    const clientData = Object.keys(clientSnapshot).length > 0
      ? clientSnapshot
      : {
          name: invoice.client_name,
          companyName: invoice.company_name,
          fiscalCode: invoice.tax_id,
          address: invoice.client_address
        };
    const deliveryAddress = clientData.deliveryAddress || clientData.delivery_address || invoice.delivery_address || null;

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
      client: {
        ...clientData,
        deliveryAddress,
        delivery_address: deliveryAddress
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
  listRouteStops,
  updateRoute,
  listProducts,
  getInvoiceById,
  getAgingReport,
  getReportsModuleInfo
};
