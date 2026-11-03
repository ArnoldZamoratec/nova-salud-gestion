import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PuntoVenta from './pages/PuntoVenta.jsx';
import Productos from './pages/Productos.jsx';
import Movimientos from './pages/Movimientos.jsx';
import Lotes from './pages/Lotes.jsx';
import Clientes from './pages/Clientes.jsx';
import Ventas from './pages/Ventas.jsx';
import Alertas from './pages/Alertas.jsx';
import Usuarios from './pages/Usuarios.jsx';
import TiendaLayout from './tienda/TiendaLayout.jsx';
import Catalogo from './tienda/Catalogo.jsx';

function Privada({ children, soloAdmin }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (soloAdmin && !isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* ---------- Catálogo público ---------- */}
      <Route element={<TiendaLayout />}>
        <Route index element={<Catalogo />} />
      </Route>

      {/* ---------- Panel interno de la botica (requiere iniciar sesión) ---------- */}
      <Route path="/login" element={user ? <Navigate to="/admin" replace /> : <Login />} />
      <Route path="/admin" element={<Privada><Layout /></Privada>}>
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<PuntoVenta />} />
        <Route path="productos" element={<Productos />} />
        <Route path="lotes" element={<Lotes />} />
        <Route path="movimientos" element={<Movimientos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="usuarios" element={<Privada soloAdmin><Usuarios /></Privada>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
