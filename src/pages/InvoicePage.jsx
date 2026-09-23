import { useEffect, useState } from 'react';
import { getInvoice } from '../api/api';
import { InvoiceTemplate } from '../components/Documents/InvoiceTemplate';

export default function InvoicePage({ invoiceId }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true);
        setError('');

        const data = await getInvoice(invoiceId);

        const invoiceData = data.data || data;

        setInvoice(invoiceData);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadInvoice();
  }, [invoiceId]);

  if (loading) {
    return <div>Загрузка данных счёта...</div>;
  }

  if (error) {
    return (
      <div style={{ color: 'red' }}>
        Ошибка: {error}
      </div>
    );
  }

  if (!invoice) {
    return <div>Счёт не найден</div>;
  }

  return (
    <InvoiceTemplate
      invoiceData={invoice}
      supplierInfo={invoice.supplier}
    />
  );
}