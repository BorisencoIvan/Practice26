import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Модуль Алексея
import SupplierDashboard from './SupplierDashboard'; 

// Твои компоненты (если путь отличается, скорректируй его)
import ClientsTable from './components/ClientsTable';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Главная страница — Дашборд Алексея */}
          <Route index element={<SupplierDashboard />} />
          
          {/* Страница клиентов — Твоя таблица */}
          <Route path="clients" element={<ClientsTable />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}