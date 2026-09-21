const express = require('express');
const { createInvoiceFromDeliveredOrder } = require('./modules/documents');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/invoices/from-order/:orderId', async (req, res) => {
  const orderId = Number(req.params.orderId);
  const { serie } = req.body || {};

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(422).json({ error: 'Invalid orderId' });
  }

  try {
    const invoice = await createInvoiceFromDeliveredOrder({ orderId, serie: serie || 'INV' });
    return res.status(201).json({ invoice });
  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (error.message === 'ORDER_NOT_DELIVERED') {
      return res.status(409).json({ error: 'Order is not delivered' });
    }

    if (error.message === 'INVOICE_ALREADY_EXISTS_FOR_ORDER') {
      return res.status(409).json({ error: 'Invoice already exists for this order' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { app };
