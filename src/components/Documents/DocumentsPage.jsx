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
    <div className="page-shell">
      <header className="page-header"><h1>Документы</h1><span className="page-date">Счета-фактуры</span></header>

      {loading && (
        <p>Загрузка документов...</p>
      )}

      {error && (
        <p className="form-error">
          Ошибка: {error}
        </p>
      )}

      {!loading && documents.length === 0 && (
        <p>Документы не найдены</p>
      )}

      <div className="documents-layout">
        {/* Список документов */}
        <div className="documents-list surface">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => handleSelect(doc)}
              className={`document-item${selectedInvoice?.id === doc.id ? ' is-selected' : ''}`}
            >
              <strong>
                {doc.serie || 'INV'}-{doc.number}
              </strong>

              <div className="muted-text">ID: {doc.id}</div>
            </div>
          ))}
        </div>

        {/* Просмотр счёта */}
        <div className="document-preview">
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