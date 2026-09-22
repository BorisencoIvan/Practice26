const express = require('express');
const { createInvoiceFromDeliveredOrder } = require('./modules/documents');
const {
  getDashboardSummary,
  listClients,
  getClientById,
  listInvoices,
  getInvoiceById,
  getAgingReport
} = require('./modules/reports');
const { registerPayment } = require('./modules/payments');
const { generateInvoicePdf } = require('./modules/pdf');
const { buildReportCsv, buildReportXlsx } = require('./modules/exports');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

apiRouter.get('/dashboard/summary', async (_req, res) => {
  res.json(await getDashboardSummary());
});

apiRouter.get('/clients', async (_req, res) => {
  res.json(await listClients());
});

apiRouter.get('/clients/:id', async (req, res) => {
  const client = await getClientById(req.params.id);

  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  return res.json(client);
});

apiRouter.get('/invoices', async (_req, res) => {
  res.json(await listInvoices());
});

apiRouter.get('/invoices/:id', async (req, res) => {
  const invoice = await getInvoiceById(req.params.id);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  return res.json(invoice);
});

apiRouter.get('/reports/aging', async (_req, res) => {
  res.json(await getAgingReport());
});

apiRouter.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const buffer = await generateInvoicePdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    if (error.message === 'INVOICE_NOT_FOUND') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

apiRouter.get('/exports/report.csv', async (req, res) => {
  const csv = await buildReportCsv({
    from: req.query.from,
    to: req.query.to
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aging-report.csv"');
  return res.send(csv);
});

apiRouter.get('/exports/report.xlsx', async (req, res) => {
  const workbookBuffer = await buildReportXlsx({
    from: req.query.from,
    to: req.query.to
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="aging-report.xlsx"');
  return res.send(workbookBuffer);
});

apiRouter.post('/payments', async (req, res) => {
  const { invoiceId, clientId, amount, paymentMethod, reference } = req.body || {};

  if (!Number.isInteger(Number(invoiceId)) || Number(invoiceId) <= 0) {
    return res.status(422).json({ error: 'Invalid invoiceId' });
  }

  if (!Number.isInteger(Number(clientId)) || Number(clientId) <= 0) {
    return res.status(422).json({ error: 'Invalid clientId' });
  }

  if (Number(amount) <= 0 || !Number.isFinite(Number(amount))) {
    return res.status(422).json({ error: 'Invalid amount' });
  }

  try {
    const payment = await registerPayment({
      invoiceId,
      clientId,
      amount,
      paymentMethod: paymentMethod || 'bank',
      reference: reference || ''
    });

    return res.status(201).json(payment);
  } catch (error) {
    if (error.message === 'INVOICE_NOT_FOUND') {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/v1', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function handleCreateInvoice(req, res) {
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
}

app.post('/api/v1/invoices/from-order/:orderId', handleCreateInvoice);
app.post('/invoices/from-order/:orderId', handleCreateInvoice);

module.exports = { app };
