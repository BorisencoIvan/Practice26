// src/App.jsx
import React from 'react';
import { InvoiceTemplate } from './components/Documents/InvoiceTemplate';

const mockSupplier = {
  name: 'SRL "Distribuție Rapidă"',
  fiscalCode: '1003600012345',
  address: 'г. Кишинёв, ул. Штефан чел Маре 130',
  bankName: 'MAIB S.A.',
  bankAccount: 'MD24AG00000002251111111'
};

const mockInvoiceData = {
  id: 15,
  serie: 'INV',
  number: 101,
  order_id: 7,
  client_id: 11,
  issued_at: '2026-09-21T18:00:00.000Z',
  due_at: '2026-10-21T18:00:00.000Z',
  total: '230.50',
  client: {
    name: 'ИП Иванов В.М.',
    fiscalCode: '1008600098765',
    deliveryAddress: 'г. Кишинёв, ул. Алба-Юлия 10/2'
  },
  items: [
    { name: 'Питьевая вода 5L', unit: 'шт', qty: 10, priceWithoutVat: 15.00, vatRate: 20 },
    { name: 'Сок яблочный 1L', unit: 'шт', qty: 5, priceWithoutVat: 10.10, vatRate: 20 }
  ]
};

export default function App() {
  return (
    <div>
      <InvoiceTemplate 
        invoiceData={mockInvoiceData} 
        supplierInfo={mockSupplier} 
      />
    </div>
  );
}