import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, errMsg, soles } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Empty } from '../components/ui.jsx';

const METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', yape_plin: 'Yape / Plin' };
const dia = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });

export default function Dashboard() {
  const { stockVersion } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then((r) => setD(r.data)).catch((e) => setError(errMsg(e)));
  }, [stockVersion]);

  if (error) return <Alert>{error}</Alert>;
  if (!d) return <div className="empty">Cargando…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Resumen de la botica</h1>
          <p className="muted">Se actualiza solo con cada venta.</p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><small>Ventas de hoy</small><strong>{soles(d.hoy.ingresos)}</strong><span className="muted">{d.hoy.ventas} transacciones</span></div>
        <div className="kpi"><small>Ticket promedio hoy</small><strong>{soles(d.hoy.ticket_promedio)}</strong><span className="muted">por venta</span></div>
        <div className="kpi"><small>Ventas del mes</small><strong>{soles(d.mes.ingresos)}</strong><span className="muted">{d.mes.ventas} transacciones</span></div>
        <Link to="/admin/alertas" className={`kpi ${d.alertas.total ? 'kpi-warn' : ''}`}>
          <small>Alertas de inventario</small><strong>{d.alertas.total}</strong>
          <span className="muted">{d.alertas.agotados} agotados, {d.alertas.stockBajo} con stock bajo y {d.alertas.porVencer + d.alertas.vencidos} por vencimiento</span>
        </Link>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Ingresos últimos 7 días</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={d.ultimos7} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-rule)" />
                <XAxis dataKey="fecha" tickFormatter={dia} tick={{ fontSize: 12, fill: 'var(--color-muted)', fontFamily: 'var(--font-body)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)', fontFamily: 'var(--font-body)' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip formatter={(v) => soles(v)} labelFormatter={dia} />
                <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>Más vendidos (30 días)</h3>
          {d.topProductos.length ? (
            <table className="table">
              <thead><tr><th>Producto</th><th className="right">Unid.</th><th className="right">Ingresos</th></tr></thead>
              <tbody>
                {d.topProductos.map((p) => (
                  <tr key={p.nombre}><td>{p.nombre}</td><td className="right">{p.unidades}</td><td className="right">{soles(p.ingresos)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>Aún no hay ventas</Empty>}
          <h3 style={{ marginTop: 20 }}>Por método de pago (30 días)</h3>
          {d.porMetodo.length ? (
            <div className="tags">
              {d.porMetodo.map((m) => <span key={m.metodo_pago} className="tag">{METODO[m.metodo_pago]}: {soles(m.ingresos)} ({m.ventas})</span>)}
            </div>
          ) : <Empty>—</Empty>}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><small>Productos activos</small><strong>{d.inventario.productos}</strong></div>
        <div className="kpi"><small>Unidades en stock</small><strong>{Number(d.inventario.unidades).toLocaleString('es-PE')}</strong></div>
        <div className="kpi"><small>Inventario valorizado (costo)</small><strong>{soles(d.inventario.valorizado)}</strong></div>
      </div>
    </>
  );
}
