import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../../auth/AuthProvider';
import './PanelLayout.css';

const TABS = [
  { to: '/panel', label: 'Bugün', end: true },
  { to: '/panel/hafta', label: 'Hafta', end: false },
  { to: '/panel/ay', label: 'Ay', end: false },
  { to: '/panel/musteriler', label: 'Müşteriler', end: false },
];

export function PanelLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="panel">
      <header className="panel-header">
        <span className="panel-brand">Ritma</span>
        <span className="panel-user">{user?.displayName}</span>
        <button className="panel-logout" type="button" onClick={() => void logout()}>Çıkış</button>
      </header>
      <nav className="panel-tabs" aria-label="Panel">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className="panel-tab">{tab.label}</NavLink>
        ))}
      </nav>
      <main className="panel-content">
        <Outlet />
      </main>
    </div>
  );
}
