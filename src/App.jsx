import { useState } from 'react';

import DocumentsPage from './components/Documents/DocumentsPage';
import ExportPage from './pages/ExportPage';
import InvoicePage from './pages/InvoicePage';

export default function App() {
  const [page, setPage] = useState('home');

  if (page === 'documents') {
    return (
      <div>
        <button onClick={() => setPage('home')}>
          ← Главная
        </button>

        <DocumentsPage />
      </div>
    );
  }

  if (page === 'export') {
    return (
      <div>
        <button onClick={() => setPage('home')}>
          ← Главная
        </button>

        <ExportPage />
      </div>
    );
  }

  if (page === 'invoice') {
    return (
      <div>
        <button onClick={() => setPage('home')}>
          ← Главная
        </button>

        <InvoicePage invoiceId={1} />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px' }}>
      <h1>Back Office Dashboard</h1>

      <button onClick={() => setPage('documents')}>
        Документы
      </button>

      <button onClick={() => setPage('export')}>
        Экспорт
      </button>

      <button onClick={() => setPage('invoice')}>
        Счёт-фактура
      </button>
    </div>
  );
}