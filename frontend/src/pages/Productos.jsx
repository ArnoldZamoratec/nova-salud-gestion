import { useEffect, useState } from 'react';
import { api, errMsg, hoyISO, soles, soloFecha } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Empty, Field, Modal, ProductoImg, StockBadge, VencBadge } from '../components/ui.jsx';
import { MAX } from '../limites.js';

const VACIO = {
  nombre: '', descripcion: '', laboratorio: '', presentacion: '', categoria_id: '',
  precio_compra: '', precio_venta: '', stock_minimo: 10, fecha_vencimiento: '', requiere_receta: false,
};

export default function Productos() {
  const { isAdmin, stockVersion } = useAuth();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtros, setFiltros] = useState({ q: '', categoria: '', estado: '' });
  const [form, setForm] = useState(null);
  const [stockForm, setStockForm] = useState(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [foto, setFoto] = useState({ archivo: null, preview: null, quitar: false });
  const [guardando, setGuardando] = useState(false);

  const cargar = () =>
    api.get('/productos', { params: filtros }).then((r) => setProductos(r.data)).catch((e) => setError(errMsg(e)));

  useEffect(() => {
    api.get('/categorias').then((r) => setCategorias(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, stockVersion]);

  const abrirForm = (datos) => {
    setFormError('');
    setFoto({ archivo: null, preview: datos.imagen || null, quitar: false });
    setForm(datos);
  };

  const elegirFoto = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) return setFormError('Use una imagen JPG, PNG o WebP');
    if (archivo.size > 2 * 1024 * 1024) return setFormError('La imagen no debe pesar más de 2 MB');
    setFormError('');
    setFoto({ archivo, preview: URL.createObjectURL(archivo), quitar: false });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setFormError('');
    setGuardando(true);
    try {
      let id = form.id;
      if (id) await api.put(`/productos/${id}`, form);
      else {
        id = (await api.post('/productos', form)).data.id;
        setForm((f) => ({ ...f, id })); // si falla la foto, reintentar no duplica el producto
      }

      if (foto.archivo) {
        const fd = new FormData();
        fd.append('imagen', foto.archivo);
        await api.post(`/productos/${id}/imagen`, fd);
      } else if (foto.quitar && form.imagen) {
        await api.delete(`/productos/${id}/imagen`);
      }
      setForm(null);
      cargar();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setGuardando(false);
    }
  };

  const guardarStock = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post(`/productos/${stockForm.producto.id}/stock`, stockForm);
      setStockForm(null);
      cargar();
    } catch (err) {
      setFormError(errMsg(err));
    }
  };

  const eliminar = async (p) => {
    if (!window.confirm(`¿Dar de baja "${p.nombre}"? Se conservará su historial.`)) return;
    try {
      await api.delete(`/productos/${p.id}`);
      cargar();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const nuevaCategoria = async () => {
    const nombre = window.prompt(`Nombre de la nueva categoría (máx. ${MAX.categoria} caracteres)`)?.trim();
    if (!nombre) return;
    if (nombre.length > MAX.categoria) return setFormError(`El nombre de la categoría admite como máximo ${MAX.categoria} caracteres`);
    try {
      const { data } = await api.post('/categorias', { nombre });
      setCategorias((c) => [...c, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setForm((f) => ({ ...f, categoria_id: data.id }));
    } catch (err) {
      setFormError(errMsg(err));
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Productos</h1>
          <p className="muted">{productos.length} productos. El stock se actualiza en tiempo real.</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => abrirForm({ ...VACIO })}>+ Nuevo producto</button>}
      </div>

      <div className="filters card">
        <input maxLength={MAX.busqueda} placeholder="Buscar por nombre, presentación o laboratorio" value={filtros.q} onChange={(e) => setFiltros({ ...filtros, q: e.target.value })} />
        <select value={filtros.categoria} onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
          <option value="">Todo el stock</option>
          <option value="bajo">Stock bajo</option>
          <option value="agotado">Agotados</option>
        </select>
      </div>

      <Alert>{error}</Alert>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th></th><th>Producto</th><th>Categoría</th><th className="right">P. venta</th>
              <th className="right">Stock</th><th>Vence</th><th>Estado</th>{isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={p.stock === 0 ? 'row-red' : p.stock_bajo ? 'row-amber' : ''}>
                <td style={{ width: 60 }}><ProductoImg imagen={p.imagen} categoria={p.categoria} nombre={p.nombre} /></td>
                <td>
                  <strong>{p.nombre}</strong>
                  <div className="muted small">{p.presentacion}</div>
                  {p.laboratorio && <div className="muted small">{p.laboratorio}</div>}
                </td>
                <td>{p.categoria || '—'}</td>
                <td className="right">{soles(p.precio_venta)}</td>
                <td className="right"><strong>{p.stock}</strong> <span className="muted small">/ mín {p.stock_minimo}</span></td>
                <td>{soloFecha(p.fecha_vencimiento)} <VencBadge dias={p.dias_para_vencer} /></td>
                <td>
                  <div className="tags"><StockBadge p={p} />{p.requiere_receta ? <span className="tag tag-blue">Receta</span> : null}</div>
                </td>
                {isAdmin && (
                  <td className="actions">
                    <button className="btn btn-sm" onClick={() => { setFormError(''); setStockForm({ producto: p, tipo: 'entrada', cantidad: '', motivo: '', codigo_lote: '', fecha_fabricacion: '', fecha_caducidad: '' }); }}>Stock</button>
                    <button className="btn btn-sm" onClick={() => abrirForm({ ...VACIO, ...p, categoria_id: p.categoria_id || '', fecha_vencimiento: p.fecha_vencimiento || '', requiere_receta: !!p.requiere_receta })}>Editar</button>
                    <button className="btn btn-sm danger" onClick={() => eliminar(p)}>Baja</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!productos.length && <Empty>No se encontraron productos</Empty>}
      </div>

      {form && (
        <Modal title={form.id ? 'Editar producto' : 'Nuevo producto'} onClose={() => setForm(null)} width={720}>
          <form onSubmit={guardar} className="form grid-form">
            <Alert>{formError}</Alert>
            <div className="foto-field full">
              <ProductoImg imagen={foto.preview} categoria={categorias.find((c) => String(c.id) === String(form.categoria_id))?.nombre} className="foto-preview" />
              <div className="foto-actions">
                <strong>Foto del producto</strong>
                <small className="muted">JPG, PNG o WebP de hasta 2 MB. Se muestra en la tienda online.</small>
                <div className="row-actions" style={{ justifyContent: 'flex-start', marginTop: 4 }}>
                  <label className="btn btn-sm">
                    {foto.preview ? 'Cambiar foto' : 'Subir foto'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={elegirFoto} />
                  </label>
                  {foto.preview && <button type="button" className="btn btn-sm danger" onClick={() => setFoto({ archivo: null, preview: null, quitar: true })}>Quitar</button>}
                </div>
              </div>
            </div>
            <Field label="Nombre *"><input required maxLength={MAX.productoNombre} value={form.nombre} onChange={set('nombre')} autoFocus /></Field>
            <Field label="Laboratorio"><input maxLength={MAX.laboratorio} value={form.laboratorio || ''} onChange={set('laboratorio')} /></Field>
            <Field label="Presentación"><input maxLength={MAX.presentacion} value={form.presentacion || ''} onChange={set('presentacion')} placeholder="Caja x 100 tab" /></Field>
            <Field label="Categoría">
              <div className="input-group">
                <select value={form.categoria_id} onChange={set('categoria_id')}>
                  <option value="">—</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button type="button" className="btn btn-sm" onClick={nuevaCategoria}>+</button>
              </div>
            </Field>
            <Field label="Precio de compra (S/)"><input type="number" step="0.01" min="0" value={form.precio_compra} onChange={set('precio_compra')} /></Field>
            <Field label="Precio de venta (S/) *"><input type="number" step="0.01" min="0.01" required value={form.precio_venta} onChange={set('precio_venta')} /></Field>
            <Field label="Stock mínimo (alerta)" hint="Se alertará al llegar a este nivel"><input type="number" min="0" value={form.stock_minimo} onChange={set('stock_minimo')} /></Field>
            <Field label="Fecha de vencimiento" hint="Con lotes registrados se actualiza sola: próxima caducidad"><input type="date" value={form.fecha_vencimiento} onChange={set('fecha_vencimiento')} /></Field>
            <label className="check"><input type="checkbox" checked={form.requiere_receta} onChange={set('requiere_receta')} /> Requiere receta médica</label>
            <Field label="Descripción"><textarea rows={2} maxLength={MAX.descripcion} value={form.descripcion || ''} onChange={set('descripcion')} /></Field>
            <div className="row-actions full">
              <button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {stockForm && (
        <Modal title={`Stock de ${stockForm.producto.nombre}`} onClose={() => setStockForm(null)} width={440}>
          <form onSubmit={guardarStock} className="form">
            <Alert>{formError}</Alert>
            <p className="muted">Stock actual: <strong>{stockForm.producto.stock}</strong></p>
            <div className="metodos">
              <button type="button" className={`key ${stockForm.tipo === 'entrada' ? 'is-on' : ''}`} aria-pressed={stockForm.tipo === 'entrada'} onClick={() => setStockForm({ ...stockForm, tipo: 'entrada' })}>Ingreso de mercadería</button>
              <button type="button" className={`key ${stockForm.tipo === 'ajuste' ? 'is-on' : ''}`} aria-pressed={stockForm.tipo === 'ajuste'} onClick={() => setStockForm({ ...stockForm, tipo: 'ajuste' })}>Ajuste por conteo</button>
            </div>
            {stockForm.tipo === 'entrada' && (
              <>
                <Field label="Código de lote *"><input required maxLength={MAX.codigoLote} value={stockForm.codigo_lote} onChange={(e) => setStockForm({ ...stockForm, codigo_lote: e.target.value })} placeholder="Como figura en la caja" /></Field>
                <div className="grid-2">
                  <Field label="Fabricación *"><input type="date" required max={hoyISO()} value={stockForm.fecha_fabricacion} onChange={(e) => setStockForm({ ...stockForm, fecha_fabricacion: e.target.value })} /></Field>
                  <Field label="Caducidad *"><input type="date" required min={stockForm.fecha_fabricacion || undefined} value={stockForm.fecha_caducidad} onChange={(e) => setStockForm({ ...stockForm, fecha_caducidad: e.target.value })} /></Field>
                </div>
              </>
            )}
            {stockForm.tipo === 'ajuste' && <p className="muted small">Si el conteo es menor, se descuenta de los lotes que vencen primero.</p>}
            <Field label={stockForm.tipo === 'entrada' ? 'Cantidad que ingresa *' : 'Stock real contado'}>
              <input type="number" min={stockForm.tipo === 'entrada' ? 1 : 0} required autoFocus value={stockForm.cantidad} onChange={(e) => setStockForm({ ...stockForm, cantidad: e.target.value })} />
            </Field>
            <Field label={stockForm.tipo === 'entrada' ? 'Referencia (guía / factura)' : 'Motivo del ajuste *'}>
              <input required={stockForm.tipo === 'ajuste'} maxLength={MAX.motivo} value={stockForm.motivo} onChange={(e) => setStockForm({ ...stockForm, motivo: e.target.value })} />
            </Field>
            <button className="btn btn-primary btn-block">Registrar</button>
          </form>
        </Modal>
      )}
    </>
  );
}
