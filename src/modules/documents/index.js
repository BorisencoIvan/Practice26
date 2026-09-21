const db = require('../../db');
const { moduleBoundaries } = require('../module-boundaries');
const { allocateNextNumber } = require('../numbering');

async function createInvoiceFromDeliveredOrder({ orderId, serie = 'INV' }) {
  if (!orderId) {
    throw new Error('orderId is required');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT id, client_id, status, delivered_at, total_amount
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rowCount === 0) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const order = orderRes.rows[0];

    if (order.status !== 'delivered') {
      throw new Error('ORDER_NOT_DELIVERED');
    }

    const existingInvoiceRes = await client.query(
      'SELECT id FROM invoices WHERE order_id = $1',
      [orderId]
    );

    if (existingInvoiceRes.rowCount > 0) {
      throw new Error('INVOICE_ALREADY_EXISTS_FOR_ORDER');
    }

    const numberAllocation = await allocateNextNumber({ docType: 'invoice', serie });

    const invoiceRes = await client.query(
      `INSERT INTO invoices (serie, number, order_id, client_id, issued_at, due_at, total, paid, status)
       VALUES ($1, $2, $3, $4, now(), now() + interval '30 days', $5, 0, 'issued')
       RETURNING id, serie, number, order_id, client_id, issued_at, due_at, total, paid, status`,
      [numberAllocation.serie, numberAllocation.number, order.id, order.client_id, order.total_amount]
    );

    await client.query('COMMIT');

    return invoiceRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function getDocumentModuleInfo() {
  return moduleBoundaries.documents;
}

module.exports = {
  createInvoiceFromDeliveredOrder,
  getDocumentModuleInfo
};
