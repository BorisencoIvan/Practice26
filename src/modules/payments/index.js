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

  if (clientId !== undefined && (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0)) {
    throw new Error('PAYMENT_INVALID_CLIENT');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      'SELECT id, client_id, total, paid, status FROM invoices WHERE id = $1 FOR UPDATE',
      [normalizedInvoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      throw new Error('INVOICE_NOT_FOUND');
    }

    const invoice = invoiceResult.rows[0];
    if (clientId !== undefined && normalizedClientId !== Number(invoice.client_id)) {
      throw new Error('PAYMENT_CLIENT_MISMATCH');
    }

    const currentPaid = Number(invoice.paid || 0);
    const total = Number(invoice.total || 0);
    const remaining = total - currentPaid;

    if (normalizedAmount > remaining) {
      throw new Error('PAYMENT_EXCEEDS_INVOICE_TOTAL');
    }

    const paymentResult = await client.query(
      `INSERT INTO payments (invoice_id, client_id, amount, payment_method, reference, paid_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, invoice_id, client_id, amount, payment_method, reference, paid_at`,
      [normalizedInvoiceId, Number(invoice.client_id), normalizedAmount, paymentMethod, reference]
    );

    // paid/status пересчитывает DB-триггер payments_recalc_invoice — читаем итог
    const updatedInvoice = await client.query(
      'SELECT id, total, paid, status FROM invoices WHERE id = $1',
      [normalizedInvoiceId]
    );

    await client.query('COMMIT');

    const final = updatedInvoice.rows[0];

    return {
      payment: paymentResult.rows[0],
      invoice: {
        id: final.id,
        total: Number(final.total).toFixed(2),
        paid: Number(final.paid).toFixed(2),
        status: final.status
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
