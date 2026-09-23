const express = require('express');
const {
  createSupplier,
  listSuppliers,
  createOrder,
  updateOrderStatus,
  updateClientAddress,
  createInvoiceFromDeliveredOrder
} = require('./modules/documents');
const {
  getDashboardSummary,
  listClients,
  getClientById,
  listOrders,
  listRoutes,
  listProducts,
  listInvoices,
  getInvoiceById,
  getAgingReport
} = require('./modules/reports');
const { registerPayment } = require('./modules/payments');
const { generateInvoicePdf } = require('./modules/pdf');
const { buildReportCsv, buildReportXlsx } = require('./modules/exports');
const telemetry = require('./shared/telemetry');
const monitorPage = require('./shared/monitor-page');
const db = require('./db');

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

// Some frontends set API base to ".../api/v1" and still append "/api/v1/..." — collapse the doubled prefix.
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/v1/api/v1/')) {
    req.url = req.url.slice('/api/v1'.length);
  }
  next();
});

app.use(telemetry.middleware);

async function checkDb() {
  try {
    const started = Date.now();
    await db.query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return { ok: false, error: error.message, code: error.code || null };
  }
}

app.get('/monitor', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(monitorPage.html);
});

app.get('/monitor/stats', async (_req, res) => {
  const stats = telemetry.snapshot();
  stats.db = await checkDb();
  res.json(stats);
});

app.get('/monitor/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  const unsubscribe = telemetry.subscribe(res);

  const sendStats = async () => {
    const stats = telemetry.snapshot();
    stats.db = await checkDb();
    res.write(`event: stats\ndata: ${JSON.stringify(stats)}\n\n`);
  };

  await sendStats();
  const timer = setInterval(sendStats, 2000);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000);

  req.on('close', () => {
    clearInterval(timer);
    clearInterval(heartbeat);
    unsubscribe();
  });
});

const apiRouter = express.Router();

apiRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

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
    return res.status(404).json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
  }

  return res.json(client);
});

apiRouter.get('/orders', async (req, res) => {
  const limit = req.query.limit === undefined ? 100 : Number.parseInt(req.query.limit, 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    return res.status(422).json({ error: 'limit must be a positive integer', code: 'INVALID_LIMIT' });
  }
  return res.json(await listOrders({ status: req.query.status, limit: Math.min(limit, 500) }));
});

apiRouter.post('/suppliers', async (req, res) => {
  const body = req.body || {};
  const fields = ['legalName', 'taxId', 'address', 'bankName', 'iban'];
  if (fields.some((field) => typeof body[field] !== 'string' || !body[field].trim())) {
    return res.status(422).json({ error: 'All supplier details are required', code: 'INVALID_SUPPLIER' });
  }

  const supplier = await createSupplier(body);
  return res.status(201).json(supplier);
});

apiRouter.get('/suppliers', async (_req, res) => {
  return res.json(await listSuppliers());
});

apiRouter.patch('/clients/:id/address', async (req, res) => {
  const clientId = Number(req.params.id);
  const address = req.body?.address;
  if (!Number.isInteger(clientId) || clientId <= 0 || typeof address !== 'string' || !address.trim()) {
    return res.status(422).json({ error: 'A valid client id and address are required', code: 'INVALID_CLIENT_ADDRESS' });
  }

  const updated = await updateClientAddress({ clientId, address });
  if (!updated) {
    return res.status(404).json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
  }
  return res.json({ id: Number(updated.id), address: updated.address });
});

apiRouter.post('/orders', async (req, res) => {
  const body = req.body || {};
  const clientId = Number(body.clientId);
  const supplierId = Number(body.supplierId);
  const routeId = body.routeId == null ? null : Number(body.routeId);
  const items = body.items;

  if (!Number.isInteger(clientId) || clientId <= 0 || !Number.isInteger(supplierId) || supplierId <= 0) {
    return res.status(422).json({ error: 'Valid clientId and supplierId are required', code: 'INVALID_ORDER_PARTIES' });
  }
  if (routeId !== null && (!Number.isInteger(routeId) || routeId <= 0)) {
    return res.status(422).json({ error: 'routeId must be a positive integer', code: 'INVALID_ROUTE_ID' });
  }
  if (!Array.isArray(items) || items.length === 0 || items.some((item) =>
    !Number.isInteger(Number(item.productId)) || Number(item.productId) <= 0 ||
    !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 ||
    (item.vatRate !== undefined && (!Number.isFinite(Number(item.vatRate)) || Number(item.vatRate) < 0 || Number(item.vatRate) > 100))
  )) {
    return res.status(422).json({ error: 'Order must contain valid productId, quantity, and optional vatRate rows', code: 'INVALID_ORDER_ITEMS' });
  }

  try {
    const order = await createOrder({
      externalId: body.externalId || null,
      clientId,
      routeId,
      supplierId,
      items
    });
    return res.status(201).json(order);
  } catch (error) {
    if (error.message === 'SUPPLIER_NOT_FOUND') {
      return res.status(404).json({ error: 'Supplier not found', code: 'SUPPLIER_NOT_FOUND' });
    }
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
    }
    if (error.message === 'SUPPLIER_EQUALS_BUYER') {
      return res.status(422).json({ error: 'Supplier and buyer must be different companies', code: 'SUPPLIER_EQUALS_BUYER' });
    }
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(422).json({ error: 'One or more products are unavailable', code: 'PRODUCT_NOT_FOUND' });
    }
    throw error;
  }
});

apiRouter.patch('/orders/:id/status', async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body || {};
  if (!Number.isInteger(orderId) || orderId <= 0 || !['pending', 'delivered'].includes(status)) {
    return res.status(422).json({ error: 'Valid order id and status (pending or delivered) are required', code: 'INVALID_ORDER_STATUS' });
  }

  const order = await updateOrderStatus({ orderId, status });
  if (!order) {
    return res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
  }
  return res.json(order);
});

apiRouter.get('/routes', async (req, res) => {
  if (req.query.status && !['active', 'inactive'].includes(req.query.status)) {
    return res.status(422).json({ error: 'status must be active or inactive', code: 'INVALID_ROUTE_STATUS' });
  }
  return res.json(await listRoutes({ status: req.query.status }));
});

apiRouter.get('/products', async (req, res) => {
  const limit = req.query.limit === undefined ? 10 : Number.parseInt(req.query.limit, 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    return res.status(422).json({ error: 'limit must be a positive integer', code: 'INVALID_LIMIT' });
  }
  return res.json(await listProducts({ limit: Math.min(limit, 500) }));
});

apiRouter.get('/invoices', async (_req, res) => {
  res.json(await listInvoices());
});

apiRouter.get('/invoices/:id', async (req, res) => {
  const invoice = await getInvoiceById(req.params.id);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' });
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
      return res.status(404).json({ error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' });
    }
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
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
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { clientId, amount, paymentMethod, reference } = body;
  const invoiceId = body.invoiceId ?? body.invoice_id ?? body.id ?? body.invoice?.id;

  if (!Number.isInteger(Number(invoiceId)) || Number(invoiceId) <= 0) {
    return res.status(422).json({
      error: 'A positive numeric invoiceId, invoice_id, id, or invoice.id is required',
      code: 'INVALID_INVOICE_ID',
      receivedFields: Object.keys(body)
    });
  }

  if (Number(amount) <= 0 || !Number.isFinite(Number(amount))) {
    return res.status(422).json({ error: 'Invalid amount', code: 'INVALID_AMOUNT' });
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
      return res.status(404).json({ error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' });
    }

    if (error.message === 'PAYMENT_EXCEEDS_INVOICE_TOTAL') {
      return res.status(422).json({ error: 'Payment exceeds remaining invoice total', code: 'PAYMENT_EXCEEDS_INVOICE_TOTAL' });
    }

    if (error.message === 'PAYMENT_CLIENT_MISMATCH') {
      return res.status(422).json({ error: 'clientId does not match the invoice', code: 'PAYMENT_CLIENT_MISMATCH' });
    }

    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
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
    return res.status(422).json({ error: 'Invalid orderId', code: 'INVALID_ORDER_ID' });
  }

  try {
    const invoice = await createInvoiceFromDeliveredOrder({ orderId, serie: serie || 'INV' });
    return res.status(201).json({ invoice });
  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
    }

    if (error.message === 'ORDER_NOT_DELIVERED') {
      return res.status(409).json({ error: 'Order is not delivered', code: 'ORDER_NOT_DELIVERED' });
    }

    if (error.message === 'INVOICE_ALREADY_EXISTS_FOR_ORDER') {
      return res.status(409).json({ error: 'Invoice already exists for this order', code: 'INVOICE_ALREADY_EXISTS_FOR_ORDER' });
    }

    if (error.message === 'ORDER_MISSING_SUPPLIER') {
      return res.status(409).json({ error: 'Order has no supplier details', code: 'ORDER_MISSING_SUPPLIER' });
    }

    if (error.message === 'ORDER_MISSING_ITEMS') {
      return res.status(409).json({ error: 'Order has no item rows', code: 'ORDER_MISSING_ITEMS' });
    }

    if (error.message === 'SUPPLIER_NOT_FOUND') {
      return res.status(409).json({ error: 'Order supplier no longer exists', code: 'SUPPLIER_NOT_FOUND' });
    }

    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(409).json({ error: 'Order buyer no longer exists', code: 'CLIENT_NOT_FOUND' });
    }

    if (error.message === 'SUPPLIER_EQUALS_BUYER') {
      return res.status(409).json({ error: 'Invoice seller and buyer must be different companies', code: 'SUPPLIER_EQUALS_BUYER' });
    }

    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
  }
}

app.post('/api/v1/invoices/from-order/:orderId', handleCreateInvoice);
app.post('/invoices/from-order/:orderId', handleCreateInvoice);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Такой эндпоинт не существует', code: 'ENDPOINT_NOT_FOUND' });
});

app.use('/invoices', (_req, res) => {
  res.status(404).json({ error: 'Такой эндпоинт не существует', code: 'ENDPOINT_NOT_FOUND' });
});

const DB_ERROR_LABELS = {
  DATABASE_UNAVAILABLE: 'Нет подключения к БД (DATABASE_URL не задан)',
  ECONNREFUSED: 'Postgres не отвечает (сервер БД выключен?)',
  '28000': 'Отказано в доступе к БД (неверный пользователь/пароль)',
  '3D000': 'База данных не найдена',
  '42P01': 'Таблица не найдена в БД (не применена миграция?)',
  '42703': 'Колонка не найдена в БД (схема устарела?)'
};

app.use((error, _req, res, _next) => {
  console.error('[api]', error.code || '', error.message);

  const pgCode = error.code && ['28000', '3D000', '42P01', '42703'].includes(String(error.code))
    ? String(error.code)
    : null;
  const key = error.message === 'DATABASE_UNAVAILABLE' ? 'DATABASE_UNAVAILABLE' : (error.code === 'ECONNREFUSED' ? 'ECONNREFUSED' : pgCode);

  if (key) {
    return res.status(503).json({ error: DB_ERROR_LABELS[key], code: key });
  }

  return res.status(500).json({ error: 'Внутренняя ошибка сервера', code: error.code || 'INTERNAL' });
});

module.exports = { app };
