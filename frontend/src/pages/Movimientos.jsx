import { useEffect, useState } from 'react';
import { api, errMsg, fecha } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Empty } from '../components/ui.jsx';

const TIPO = {
  entrada: ['Entrada', 'tag-green'],
  salida: ['Venta', 'tag-blue'],
  ajuste: ['Ajuste', 'tag-amber'],
  anulacion: ['Anulación', 'tag-red'],
};

export default function Movimientos() {
  const { stockVersion } = useAuth();
  const [rows, setRows] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productoId, setProductoId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.get('/productos').then((r) => setProductos(r.data)); }, []);
  useEffect(() => {
    api.get('/movimientos', { params: { producto_id: productoId || undefined } })
      .then((r) => setRows(r.data))
      .catch((e) => setError(errMsg(e)));
  }, [productoId, stockVersion]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Kardex de inventario</h1>
          <p className="muted">Trazabilidad de cada entrada, venta, ajuste y anulación</p>
        </div>
      </div>
      <div className="filters card">
        <select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
          <option value="">Todos los productos</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <Alert>{error}</Alert>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th className="right">Cant.</th><th className="right">Stock ant.</th><th className="right">Stock nuevo</th><th>Motivo</th><th>Usuario</th></tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="nowrap">{fecha(m.creado_en)}</td>
                <td>{m.producto}</td>
                <td><span className={`tag ${TIPO[m.tipo][1]}`}>{TIPO[m.tipo][0]}</span></td>
                <td className="right">{m.tipo === 'salida' ? '−' : m.tipo === 'ajuste' ? '±' : '+'}{m.cantidad}</td>
                <td className="right">{m.stock_anterior}</td>
                <td className="right"><strong>{m.stock_nuevo}</strong></td>
                <td>{m.motivo}</td>
                <td>{m.usuario || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>Sin movimientos</Empty>}
      </div>
    </>
  );
}
