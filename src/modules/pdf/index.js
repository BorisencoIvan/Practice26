const PDFDocument = require('pdfkit');
const { moduleBoundaries } = require('../module-boundaries');
const { getInvoiceById } = require('../reports');

function buildPdfBufferFromInvoice(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Serie: ${invoice.serie || 'INV'}`);
    doc.text(`Number: ${invoice.number || ''}`);
    doc.text(`Order ID: ${invoice.order_id || ''}`);
    doc.text(`Order number: ${invoice.orderNumber || ''}`);
    doc.text(`Client ID: ${invoice.client_id || ''}`);
    doc.text(`Issued at: ${invoice.issued_at || ''}`);
    doc.text(`Due at: ${invoice.due_at || ''}`);
    doc.moveDown();

    if (invoice.supplier && Object.keys(invoice.supplier).length > 0) {
      doc.text(`Supplier: ${invoice.supplier.legalName || ''}`);
      doc.text(`Supplier tax ID: ${invoice.supplier.taxId || ''}`);
      doc.text(`Supplier address: ${invoice.supplier.address || ''}`);
      doc.text(`Bank: ${invoice.supplier.bankName || ''}`);
      doc.text(`IBAN: ${invoice.supplier.iban || ''}`);
      doc.moveDown();
    }

    if (invoice.client) {
      doc.text(`Buyer: ${invoice.client.companyName || invoice.client.name || ''}`);
      doc.text(`Buyer tax ID: ${invoice.client.fiscalCode || ''}`);
      doc.text(`Buyer address: ${invoice.client.address || ''}`);
      doc.moveDown();
    }

    doc.text(`Subtotal without VAT: ${invoice.subtotal || '0.00'}`);
    doc.text(`VAT total: ${invoice.vatTotal || '0.00'}`);
    doc.text(`Total: ${invoice.total || '0.00'}`);
    doc.text(`Paid: ${invoice.paid || '0.00'}`);
    doc.text(`Status: ${invoice.status || 'issued'}`);

    if (Array.isArray(invoice.items) && invoice.items.length > 0) {
      doc.moveDown();
      doc.text('Items', { underline: true });
      invoice.items.forEach((item, index) => {
        doc.text(`${item.lineNumber || index + 1}. ${item.name || 'Item'}`);
        doc.text(`   Specification: ${item.variant || ''}`);
        doc.text(`   Quantity: ${item.quantity || 0} ${item.unit || ''}`);
        doc.text(`   Unit price without VAT: ${item.unitPrice || 0}`);
        doc.text(`   VAT ${item.vatRate || 0}%: ${item.vatAmount || '0.00'}`);
        doc.text(`   Line total: ${item.totalAmount || '0.00'}`);
      });
    }

    doc.end();
  });
}

async function generateInvoicePdf(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error('INVOICE_NOT_FOUND');
  }

  return buildPdfBufferFromInvoice(invoice);
}

async function generateDeliveryNotePdf() {
  return buildPdfBufferFromInvoice({
    serie: 'DN',
    number: 1,
    order_id: 0,
    client_id: 0,
    issued_at: new Date().toISOString(),
    due_at: new Date().toISOString(),
    total: '0.00',
    paid: '0.00',
    status: 'issued',
    items: [
      { name: 'Delivery note placeholder', qty: 1, priceWithoutVat: 0 }
    ]
  });
}

function getPdfModuleInfo() {
  return moduleBoundaries.pdf;
}

module.exports = {
  generateInvoicePdf,
  generateDeliveryNotePdf,
  getPdfModuleInfo
};
