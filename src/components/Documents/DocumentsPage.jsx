import { useEffect, useState } from 'react';
import { getInvoices, getInvoice } from '../../api/api';
import { InvoiceTemplate } from './InvoiceTemplate';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDocuments() {
      try {
        setLoading(true);
        setError('');

        const data = await getInvoices();

        const invoices = Array.isArray(data)
          ? data
          : data.data || data.items || [];

        setDocuments(invoices);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, []);

  async function handleSelect(invoice) {
    try {
      setLoadingInvoice(true);
      setError('');

      const data = await getInvoice(invoice.id);

      const invoiceData = data.data || data;

      setSelectedInvoice(invoiceData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingInvoice(false);
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Документы</h2>

      {loading && (
        <p>Загрузка документов...</p>
      )}

      {error && (
        <p style={{ color: 'red' }}>
          Ошибка: {error}
        </p>
      )}

      {!loading && documents.length === 0 && (
        <p>Документы не найдены</p>
      )}

      <div
        style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
        }}
      >
        {/* Список документов */}
        <div
          style={{
            width: '300px',
            flexShrink: 0,
          }}
        >
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => handleSelect(doc)}
              style={{
                cursor: 'pointer',
                padding: '12px',
                border: '1px solid #ccc',
                marginBottom: '8px',
                borderRadius: '5px',
                background:
                  selectedInvoice?.id === doc.id
                    ? '#eaf2ff'
                    : '#fff',
              }}
            >
              <strong>
                {doc.serie || 'INV'}-{doc.number}
              </strong>

              <div>
                ID: {doc.id}
              </div>
            </div>
          ))}
        </div>

        {/* Просмотр счёта */}
        <div style={{ flex: 1 }}>
          {loadingInvoice && (
            <p>Загрузка счёта...</p>
          )}

          {!loadingInvoice && selectedInvoice && (
            <InvoiceTemplate
              invoiceData={selectedInvoice}
              supplierInfo={selectedInvoice.supplier}
            />
          )}

          {!loadingInvoice && !selectedInvoice && (
            <p>
              Выберите документ для просмотра
            </p>
          )}
        </div>
      </div>
    </div>
  );
}