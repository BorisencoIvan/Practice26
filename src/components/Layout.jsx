import { NavLink, Outlet } from 'react-router-dom';
import { Boxes, FileText, LayoutGrid, Users } from 'lucide-react';
import { T } from '../dashboard/constants';

export default function Layout() {
  const navigation = [
    { to: '/', label: 'Общая панель', icon: LayoutGrid, end: true },
    { to: '/clients', label: 'Клиенты', icon: Users },
    { to: '/documents', label: 'Документы', icon: FileText },
    { to: '/export', label: 'Экспорт', icon: Boxes },
  ];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div>
          <div className="sidebar-brand">Поставщик</div>
          <nav className="sidebar-nav" aria-label="Основная навигация">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer" style={{ color: T.textMuted }}>W4 Back-Office</div>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}