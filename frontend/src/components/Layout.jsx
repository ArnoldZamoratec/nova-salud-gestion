import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Marca } from './ui.jsx';

const links = [
  { to: '/admin', label: 'Resumen', end: true },
  { to: '/admin/pos', label: 'Punto de venta' },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/lotes', label: 'Lotes' },
  { to: '/admin/movimientos', label: 'Kardex' },
  { to: '/admin/alertas', label: 'Alertas', badge: 'alertas' },
  { to: '/admin/ventas', label: 'Ventas' },
  { to: '/admin/clientes', label: 'Clientes' },
  { to: '/admin/usuarios', label: 'Usuarios', admin: true },
];

export default function Layout() {
  const { user, isAdmin, alertCount, logout } = useAuth();
  const badges = { alertas: alertCount };
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const salir = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><Marca /><span>Nova Salud</span></div>
        <nav aria-label="Panel">
          {links
            .filter((l) => !l.admin || isAdmin)
            .map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>
                <span>{l.label}</span>
                {l.badge && badges[l.badge] > 0 && <span className="badge-count num">{badges[l.badge]}</span>}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-user">
          <div>
            <strong>{user.nombre}</strong>
            <small className="muted">{user.rol === 'admin' ? 'Administrador' : 'Químico Farmacéutico'}</small>
          </div>
        </div>
      </aside>
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="btn btn-sm menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menú">Menú</button>
          <div className="topbar-right">
            <button className="btn btn-sm" onClick={() => navigate('/admin/alertas')}>
              Alertas {alertCount > 0 && <span className="badge-count num">{alertCount}</span>}
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/admin/pos')}>Nueva venta</button>
            <button className="btn btn-sm" onClick={salir}>Salir</button>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
