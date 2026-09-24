const db = require('../../db');
const { moduleBoundaries } = require('../module-boundaries');
const { allocateNextNumber } = require('../numbering');

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeTaxId(value) {
  return String(value || '').replace(/[\s-]/g, '').toUpperCase();
}

async function createSupplier({ legalName, taxId, address, bankName, iban }) {
  const client = await db.getClient();

  try {
    const result = await client.query(
      `INSERT INTO suppliers (legal_name, tax_id, address, bank_name, iban)
       VALUES ($1, $2, $3, $4, $5)
      RETURNING id, legal_name, tax_id, address, bank_name, iban`,
      [legalName.trim(), taxId.trim(), address.trim(), bankName.trim(), iban.trim()]
    );
    const row = result.rows[0];
    return {
      id: Number(row.id),
      legalName: row.legal_name,
      taxId: row.tax_id,
      fiscalCode: row.tax_id,
      address: row.address,
      bankName: row.bank_name,
      iban: row.iban,
      accountNumber: row.iban,
      currentAccount: row.iban
    };
  } finally {
    client.release();
  }
}

async function listSuppliers() {
  const client = await db.getClient();

  try {
    const result = await client.query(`
      SELECT id, legal_name, tax_id, address, bank_name, iban
      FROM suppliers
      ORDER BY legal_name, id
    `);
    return result.rows.map((row) => ({
      id: Number(row.id),
      legalName: row.legal_name,
      taxId: row.tax_id,
      fiscalCode: row.tax_id,
      address: row.address,
      bankName: row.bank_name,
      iban: row.iban,
      accountNumber: row.iban,
      currentAccount: row.iban
    }));
  } finally {
    client.release();
  }
}

async function createOrder({ externalId = null, clientId, routeId = null, supplierId, deliveryAddress, items }) {
  if (typeof deliveryAddress !== 'string' || !deliveryAddress.trim()) {
    throw new Error('DELIVERY_ADDRESS_REQUIRED');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const supplierResult = await client.query(
      'SELECT id, tax_id FROM suppliers WHERE id = $1',
      [supplierId]
    );
    if (supplierResult.rowCount === 0) {
      throw new Error('SUPPLIER_NOT_FOUND');
    }

    const buyerResult = await client.query(
      'SELECT id, tax_id FROM clients WHERE id = $1',
      [clientId]
    );
    if (buyerResult.rowCount === 0) {
      throw new Error('CLIENT_NOT_FOUND');
    }
    if (normalizeTaxId(supplierResult.rows[0].tax_id) === normalizeTaxId(buyerResult.rows[0].tax_id)) {
      throw new Error('SUPPLIER_EQUALS_BUYER');
    }

    const productIds = [...new Set(items.map((item) => Number(item.productId)))];
    const productResult = await client.query(
      `SELECT id, name, variant, unit, price
       FROM products
       WHERE id = ANY($1::int[]) AND is_active = TRUE`,
      [productIds]
    );
    const products = new Map(productResult.rows.map((product) => [Number(product.id), product]));

    if (productIds.some((productId) => !products.has(productId))) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const orderResult = await client.query(
      `INSERT INTO orders (external_id, client_id, route_id, supplier_id, delivery_address, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, 0, 'pending')
       RETURNING id, external_id, client_id, route_id, supplier_id, delivery_address, total_amount, status, created_at`,
      [externalId, clientId, routeId, supplierId, deliveryAddress.trim()]
    );
    const order = orderResult.rows[0];
    const orderItems = [];
    let subtotal = 0;
    let vatTotal = 0;

    for (const item of items) {
      const product = products.get(Number(item.productId));
      const quantity = Number(item.quantity);
      const unitPrice = Number(product.price);
      const vatRate = item.vatRate === undefined ? 20 : Number(item.vatRate);
      const netAmount = roundMoney(quantity * unitPrice);
      const vatAmount = roundMoney(netAmount * vatRate / 100);
      const totalAmount = roundMoney(netAmount + vatAmount);

      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name, product_variant, unit, quantity, unit_price, vat_rate, net_amount, vat_amount, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [order.id, product.id, product.name, product.variant, product.unit, quantity, unitPrice, vatRate, netAmount, vatAmount, totalAmount]
      );

      orderItems.push({
        productId: Number(product.id),
        name: product.name,
        variant: product.variant,
        unit: product.unit,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        vatRate,
        netAmount: netAmount.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2)
      });
      subtotal = roundMoney(subtotal + netAmount);
      vatTotal = roundMoney(vatTotal + vatAmount);
    }

    const total = roundMoney(subtotal + vatTotal);
    await client.query('UPDATE orders SET total_amount = $1 WHERE id = $2', [total, order.id]);
    await client.query('COMMIT');

    return {
      ...order,
      total_amount: total.toFixed(2),
      subtotal: subtotal.toFixed(2),
      vat_total: vatTotal.toFixed(2),
      items: orderItems
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateOrderStatus({ orderId, status }) {
  const client = await db.getClient();

  try {
    const result = await client.query(
      `UPDATE orders
       SET status = $1,
           delivered_at = CASE WHEN $1 = 'delivered' THEN COALESCE(delivered_at, now()) ELSE NULL END
       WHERE id = $2
       RETURNING id, external_id, status, delivered_at`,
      [status, orderId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function updateClientAddress({ clientId, address }) {
  const client = await db.getClient();

  try {
    const result = await client.query(
      'UPDATE clients SET address = $1 WHERE id = $2 RETURNING id, address',
      [address.trim(), clientId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function createInvoiceFromDeliveredOrder({ orderId, serie = 'INV' }) {
  if (!orderId) {
    throw new Error('orderId is required');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT id, client_id, supplier_id, status, delivered_at, total_amount
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

    if (!order.supplier_id) {
      throw new Error('ORDER_MISSING_SUPPLIER');
    }

    const supplierResult = await client.query(
      `SELECT id, legal_name, tax_id, address, bank_name, iban
       FROM suppliers
       WHERE id = $1`,
      [order.supplier_id]
    );
    if (supplierResult.rowCount === 0) {
      throw new Error('SUPPLIER_NOT_FOUND');
    }

    const buyerResult = await client.query(
      `SELECT c.id, c.name, c.company_name, c.tax_id, c.address,
              o.delivery_address
       FROM clients c
       JOIN orders o ON o.client_id = c.id
       WHERE c.id = $1 AND o.id = $2`,
      [order.client_id, order.id]
    );
    if (buyerResult.rowCount === 0) {
      throw new Error('CLIENT_NOT_FOUND');
    }
    if (normalizeTaxId(supplierResult.rows[0].tax_id) === normalizeTaxId(buyerResult.rows[0].tax_id)) {
      throw new Error('SUPPLIER_EQUALS_BUYER');
    }

    const itemsResult = await client.query(
      `SELECT product_id, product_name, product_variant, unit, quantity, unit_price, vat_rate,
              net_amount, vat_amount, total_amount
       FROM order_items
       WHERE order_id = $1
       ORDER BY id`,
      [orderId]
    );
    if (itemsResult.rowCount === 0) {
      throw new Error('ORDER_MISSING_ITEMS');
    }

    const existingInvoiceRes = await client.query(
      'SELECT id FROM invoices WHERE order_id = $1',
      [orderId]
    );

    if (existingInvoiceRes.rowCount > 0) {
      throw new Error('INVOICE_ALREADY_EXISTS_FOR_ORDER');
    }

    const numberAllocation = await allocateNextNumber({ docType: 'invoice', serie });
    const subtotal = roundMoney(itemsResult.rows.reduce((sum, item) => sum + Number(item.net_amount), 0));
    const vatTotal = roundMoney(itemsResult.rows.reduce((sum, item) => sum + Number(item.vat_amount), 0));
    const total = roundMoney(subtotal + vatTotal);
    const supplier = supplierResult.rows[0];
    const buyer = buyerResult.rows[0];

    const invoiceRes = await client.query(
      `INSERT INTO invoices
        (serie, number, order_id, client_id, supplier_id, supplier_snapshot, client_snapshot,
         issued_at, due_at, subtotal, vat_total, total, paid, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, now(), now() + interval '30 days', $8, $9, $10, 0, 'issued')
       RETURNING id, serie, number, order_id, client_id, issued_at, due_at, total, paid, status`,
      [
        numberAllocation.serie,
        numberAllocation.number,
        order.id,
        order.client_id,
        supplier.id,
        JSON.stringify({
          id: Number(supplier.id),
          legalName: supplier.legal_name,
          taxId: supplier.tax_id,
          address: supplier.address,
          bankName: supplier.bank_name,
          iban: supplier.iban
        }),
        JSON.stringify({
          id: Number(buyer.id),
          name: buyer.name,
          companyName: buyer.company_name,
          fiscalCode: buyer.tax_id,
          address: buyer.address,
          deliveryAddress: buyer.delivery_address
        }),
        subtotal,
        vatTotal,
        total
      ]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        `INSERT INTO invoice_items
           (invoice_id, product_id, product_name, product_variant, unit, quantity, unit_price, vat_rate, net_amount, vat_amount, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [invoiceRes.rows[0].id, item.product_id, item.product_name, item.product_variant, item.unit, item.quantity,
          item.unit_price, item.vat_rate, item.net_amount, item.vat_amount, item.total_amount]
      );
    }

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
  createSupplier,
  listSuppliers,
  createOrder,
  updateOrderStatus,
  updateClientAddress,
  createInvoiceFromDeliveredOrder,
  getDocumentModuleInfo
};
