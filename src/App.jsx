import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SupplierDashboard from './SupplierDashboard';

// Импортируем новую страницу вместо просто таблицы
import ClientsPage from './components/ClientsPage'; 

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<SupplierDashboard />} />
          
          {/* Меняем элемент на ClientsPage */}
          <Route path="clients" element={<ClientsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}