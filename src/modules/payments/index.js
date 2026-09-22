const db = require('../../db');
const { moduleBoundaries } = require('../module-boundaries');

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('PAYMENT_INVALID_AMOUNT');
  }
  return amount;
}

async function registerPayment({ invoiceId, clientId, amount, paymentMethod = 'bank', reference = '' }) {
  const normalizedInvoiceId = Number(invoiceId);
  const normalizedClientId = Number(clientId);
  const normalizedAmount = normalizeAmount(amount);

  if (!Number.isInteger(normalizedInvoiceId) || normalizedInvoiceId <= 0) {
    throw new Error('PAYMENT_INVALID_INVOICE');
  }

  if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0) {
    throw new Error('PAYMENT_INVALID_CLIENT');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      'SELECT id, total, paid, status FROM invoices WHERE id = $1 FOR UPDATE',
      [normalizedInvoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      throw new Error('INVOICE_NOT_FOUND');
    }

    const invoice = invoiceResult.rows[0];
    const currentPaid = Number(invoice.paid || 0);
    const total = Number(invoice.total || 0);
    const nextPaid = currentPaid + normalizedAmount;
    const nextStatus = nextPaid >= total ? 'paid' : 'partially_paid';

    const paymentResult = await client.query(
      `INSERT INTO payments (invoice_id, client_id, amount, payment_method, reference, paid_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, invoice_id, client_id, amount, payment_method, reference, paid_at`,
      [normalizedInvoiceId, normalizedClientId, normalizedAmount, paymentMethod, reference]
    );

    await client.query(
      'UPDATE invoices SET paid = $1, status = $2 WHERE id = $3',
      [nextPaid, nextStatus, normalizedInvoiceId]
    );

    await client.query('COMMIT');

    return {
      payment: paymentResult.rows[0],
      invoice: {
        id: invoice.id,
        total: total.toFixed(2),
        paid: nextPaid.toFixed(2),
        status: nextStatus
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function getPaymentsModuleInfo() {
  return moduleBoundaries.payments;
}

module.exports = {
  registerPayment,
  getPaymentsModuleInfo
};
