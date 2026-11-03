import { useEffect, useState } from 'react';
import { api, errMsg, fecha, hoyISO, soles } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Empty, Modal } from '../components/ui.jsx';
import Comprobante from '../components/Comprobante.jsx';
import { MAX } from '../limites.js';

const METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', yape_plin: 'Yape / Plin' };

export default function Ventas() {
  const { isAdmin } = useAuth();
  const [filtros, setFiltros] = useState({ desde: hoyISO(), hasta: hoyISO(), q: '', estado: '' });
  const [ventas, setVentas] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => api.get('/ventas', { params: filtros }).then((r) => setVentas(r.data)).catch((e) => setError(errMsg(e)));

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const ver = async (id) => {
    try {
      setDetalle((await api.get(`/ventas/${id}`)).data);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const anular = async () => {
    const motivo = window.prompt(`Motivo de anulación de ${detalle.numero} (máx. ${MAX.motivo} caracteres):`)?.trim();
    if (!motivo) return;
    if (motivo.length > MAX.motivo) return setError(`El motivo admite como máximo ${MAX.motivo} caracteres`);
    try {
      await api.post(`/ventas/${detalle.id}/anular`, { motivo });
      await ver(detalle.id);
      cargar();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const completadas = ventas.filter((v) => v.estado === 'completada');
  const total = completadas.reduce((s, v) => s + Number(v.total), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Registro de ventas</h1>
          <p className="muted">{completadas.length} ventas por <span className="num">{soles(total)}</span>{isAdmin ? '' : ', solo las suyas'}.</p>
        </div>
      </div>
      <div className="filters card">
        <label className="inline">Desde <input type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} /></label>
        <label className="inline">Hasta <input type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} /></label>
        <input maxLength={MAX.busqueda} placeholder="N° boleta, cliente o DNI" value={filtros.q} onChange={(e) => setFiltros({ ...filtros, q: e.target.value })} />
        <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
          <option value="">Todas</option>
          <option value="completada">Completadas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>
      <Alert>{error}</Alert>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Atendido por</th><th className="right">Unid.</th><th>Pago</th><th className="right">Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id} className={v.estado === 'anulada' ? 'row-muted' : ''}>
                <td className="mono">{v.numero}</td>
                <td className="nowrap">{fecha(v.creado_en)}</td>
                <td>{v.cliente || 'Cliente varios'}</td>
                <td>{v.vendedor}</td>
                <td className="right">{v.unidades}</td>
                <td>{METODO[v.metodo_pago]}</td>
                <td className="right"><strong>{soles(v.total)}</strong></td>
                <td><span className={`tag ${v.estado === 'anulada' ? 'tag-red' : 'tag-green'}`}>{v.estado}</span></td>
                <td><button className="btn btn-sm" onClick={() => ver(v.id)}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ventas.length && <Empty>No hay ventas en el rango seleccionado</Empty>}
      </div>

      {detalle && (
        <Modal title={`Venta ${detalle.numero}`} onClose={() => setDetalle(null)} width={420}>
          <Comprobante venta={detalle} />
          <div className="row-actions no-print">
            {isAdmin && detalle.estado === 'completada' && <button className="btn danger" onClick={anular}>Anular venta</button>}
            <button className="btn" onClick={() => window.print()}>Imprimir</button>
          </div>
        </Modal>
      )}
    </>
  );
}
