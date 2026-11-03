import { useEffect, useState } from 'react';
import { api, errMsg, hoyISO, soloFecha } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Empty, Field, Modal } from '../components/ui.jsx';

const ESTADOS = {
  vigente: ['Vigente', 'tag-green'],
  por_vencer: ['Por vencer', 'tag-amber'],
  vencido: ['Vencido', 'tag-red'],
  agotado: ['Agotado', ''],
};

const NUEVO = { producto_id: '', codigo_lote: '', fecha_fabricacion: '', fecha_caducidad: '', cantidad: '', motivo: '' };

export default function Lotes() {
  const { isAdmin, stockVersion } = useAuth();
  const [lotes, setLotes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({ q: '', producto_id: '', estado: '' });
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState(null);
  const [baja, setBaja] = useState(null);
  const [formError, setFormError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = () =>
    api.get('/lotes', { params: filtros })
      .then((r) => { setLotes(r.data.lotes); setError(''); })
      .catch((e) => setError(errMsg(e)));

  useEffect(() => { api.get('/productos').then((r) => setProductos(r.data)); }, [stockVersion]);
  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, stockVersion]);

  const enviar = (fn) => async (e) => {
    e.preventDefault();
    setFormError('');
    setGuardando(true);
    try {
      await fn();
      setNuevo(null);
      setBaja(null);
      cargar();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setGuardando(false);
    }
  };

  const guardarNuevo = enviar(() =>
    api.post(`/productos/${nuevo.producto_id}/stock`, { ...nuevo, tipo: 'entrada' }));
  const guardarBaja = enviar(() => api.post(`/lotes/${baja.id_lote}/baja`, { motivo: baja.motivo }));

  const setN = (k) => (e) => setNuevo({ ...nuevo, [k]: e.target.value });
  const filtro = (k) => (e) => setFiltros({ ...filtros, [k]: e.target.value });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Lotes</h1>
          <p className="muted">Cada ingreso de mercadería es un lote. Las ventas descuentan primero el lote que vence antes.</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => { setFormError(''); setNuevo({ ...NUEVO, producto_id: filtros.producto_id }); }}>+ Nuevo lote</button>}
      </div>

      <div className="filters card">
        <input placeholder="Buscar por código de lote o producto" value={filtros.q} onChange={filtro('q')} />
        <select value={filtros.producto_id} onChange={filtro('producto_id')}>
          <option value="">Todos los productos</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select value={filtros.estado} onChange={filtro('estado')}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      <Alert>{error}</Alert>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Lote</th><th>Producto</th><th>Fabricación</th><th>Caducidad</th>
              <th className="right">Inicial</th><th className="right">Actual</th><th>Estado</th>{isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {lotes.map((l) => {
              const [label, color] = ESTADOS[l.estado];
              return (
                <tr key={l.id_lote} className={l.estado === 'vencido' ? 'row-red' : l.estado === 'por_vencer' ? 'row-amber' : ''}>
                  <td><strong className="dose">{l.codigo_lote}</strong></td>
                  <td>{l.producto}<div className="muted small">{l.presentacion}</div></td>
                  <td className="nowrap">{soloFecha(l.fecha_fabricacion)}</td>
                  <td className="nowrap">
                    {soloFecha(l.fecha_caducidad)}
                    {l.cantidad_actual > 0 && <div className="muted small">{l.dias_para_vencer < 0 ? `hace ${-l.dias_para_vencer} d` : `en ${l.dias_para_vencer} d`}</div>}
                  </td>
                  <td className="right num">{l.cantidad_inicial}</td>
                  <td className="right num"><strong>{l.cantidad_actual}</strong></td>
                  <td><span className={`tag ${color}`}>{label}</span></td>
                  {isAdmin && (
                    <td className="actions">
                      {l.cantidad_actual > 0 && (
                        <button className="btn btn-sm danger" onClick={() => { setFormError(''); setBaja({ ...l, motivo: l.estado === 'vencido' ? 'Lote vencido' : '' }); }}>
                          Dar de baja
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!lotes.length && <Empty>No hay lotes registrados</Empty>}
      </div>

      {nuevo && (
        <Modal title="Nuevo lote" onClose={() => setNuevo(null)} width={480}>
          <form onSubmit={guardarNuevo} className="form">
            <Alert>{formError}</Alert>
            <Field label="Producto *">
              <select required value={nuevo.producto_id} onChange={setN('producto_id')} autoFocus>
                <option value="">Seleccione…</option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.presentacion && `· ${p.presentacion}`}</option>)}
              </select>
            </Field>
            <Field label="Código de lote *"><input required maxLength={50} value={nuevo.codigo_lote} onChange={setN('codigo_lote')} placeholder="Como figura en la caja" /></Field>
            <div className="grid-2">
              <Field label="Fabricación *"><input type="date" required max={hoyISO()} value={nuevo.fecha_fabricacion} onChange={setN('fecha_fabricacion')} /></Field>
              <Field label="Caducidad *"><input type="date" required min={nuevo.fecha_fabricacion || undefined} value={nuevo.fecha_caducidad} onChange={setN('fecha_caducidad')} /></Field>
            </div>
            <Field label="Cantidad inicial *" hint="Se suma al stock del producto"><input type="number" min="1" required value={nuevo.cantidad} onChange={setN('cantidad')} /></Field>
            <Field label="Referencia (guía / factura)"><input value={nuevo.motivo} onChange={setN('motivo')} /></Field>
            <button className="btn btn-primary btn-block" disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar lote'}</button>
          </form>
        </Modal>
      )}

      {baja && (
        <Modal title={`Dar de baja el lote ${baja.codigo_lote}`} onClose={() => setBaja(null)} width={440}>
          <form onSubmit={guardarBaja} className="form">
            <Alert>{formError}</Alert>
            <p>Se retirarán <strong>{baja.cantidad_actual}</strong> unidades de {baja.producto} del inventario. Quedará registrado en el kardex.</p>
            <Field label="Motivo *"><input required autoFocus value={baja.motivo} onChange={(e) => setBaja({ ...baja, motivo: e.target.value })} placeholder="Vencido, dañado, retiro sanitario…" /></Field>
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => setBaja(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={guardando}>{guardando ? 'Procesando…' : 'Dar de baja'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
