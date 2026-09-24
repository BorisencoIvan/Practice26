import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '250px', backgroundColor: '#2c3e50', color: 'white', padding: '20px' }}>
        <h2>W4 Back-Office</h2>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '30px' }}>
              <li style={{ marginBottom: '15px' }}><Link to="/" style={{ color: 'white', textDecoration: 'none' }}>📊 Дашборд</Link></li>
              <li style={{ marginBottom: '15px' }}><Link to="/clients" style={{ color: 'white', textDecoration: 'none' }}>👥 Клиенты и Сальдо</Link></li>
              <li style={{ marginBottom: '15px' }}><Link to="/documents" style={{ color: 'white', textDecoration: 'none' }}>📄 Документы</Link></li>
              <li style={{ marginBottom: '15px' }}><Link to="/export" style={{ color: 'white', textDecoration: 'none' }}>💾 Экспорт</Link></li>
          </ul>
      </nav>
      <main style={{ flex: 1, padding: '20px', backgroundColor: '#f5f6fa', overflowY: 'auto' }}>
        {/* Сюда будут подгружаться ваши компоненты */}
        <Outlet />
      </main>
    </div>
  );
}