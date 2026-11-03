import { Link, Outlet } from 'react-router-dom';
import { Marca } from '../components/ui.jsx';

export default function TiendaLayout() {
  return (
    <div className="tienda">
      <header className="tienda-header">
        <div className="wrap tienda-header-in">
          <Link to="/" className="brand"><Marca /><span>Nova Salud</span></Link>
        </div>
      </header>
      <main className="tienda-main wrap">
        <Outlet />
      </main>
      <footer className="tienda-footer">
        <div className="wrap tienda-footer-in">
          <div>
            <strong>Botica Nova Salud</strong>
            <p className="muted small">Atención de lunes a domingo, de 8:00 a 22:00.</p>
          </div>
          <Link to="/login" className="link small">Acceso del personal</Link>
        </div>
      </footer>
    </div>
  );
}
