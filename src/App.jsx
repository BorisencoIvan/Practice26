import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Модуль Алексея
import SupplierDashboard from './SupplierDashboard'; 

// Твой модуль
import ClientsPage from './components/ClientsPage';

// Модуль Яны
import DocumentsPage from './components/Documents/DocumentsPage';
import ExportPage from './pages/ExportPage';
import InvoicePage from './pages/InvoicePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Дашборд Алексея */}
          <Route index element={<SupplierDashboard />} />
          
          {/* Твоя страница */}
          <Route path="clients" element={<ClientsPage />} />
          
          {/* Страницы Яны */}
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="invoice/:id" element={<InvoicePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}