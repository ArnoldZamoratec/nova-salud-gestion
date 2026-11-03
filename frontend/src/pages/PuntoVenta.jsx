import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, errMsg, soles } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Modal, ProductoImg, StockBadge, VencBadge } from '../components/ui.jsx';
import Comprobante from '../components/Comprobante.jsx';
import { MAX, NUM, numero, digitos } from '../limites.js';

const METODOS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'yape_plin', label: 'Yape / Plin' },
];

export default function PuntoVenta() {
  const { stockVersion } = useAuth();
  const searchRef = useRef(null);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [dni, setDni] = useState('');
  const [cliente, setCliente] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState(null);
  const [metodo, setMetodo] = useState('efectivo');
  const [recibido, setRecibido] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [venta, setVenta] = useState(null);

  // ---- búsqueda de productos (con debounce) ----
  const buscar = useCallback(async (texto) => {
    if (!texto.trim()) return setResultados([]);
    const { data } = await api.get('/productos/buscar', { params: { q: texto } });
    setResultados(data);
    return data;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(q).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q, buscar, stockVersion]);

  // Si otra caja vendió, actualizar el stock disponible en el carrito
  useEffect(() => {
    if (!carrito.length || stockVersion === 0) return;
    api.get('/productos').then(({ data }) => {
      const map = new Map(data.map((p) => [p.id, p.stock]));
      setCarrito((c) => c.map((it) => ({ ...it, stock: map.get(it.id) ?? it.stock })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockVersion]);

  const agregar = (p) => {
    setError('');
    if (p.stock <= 0) return setError(`${p.nombre} está agotado`);
    if (p.dias_para_vencer != null && p.dias_para_vencer < 0) return setError(`${p.nombre} está vencido`);
    const ex = carrito.find((i) => i.id === p.id);
    if (ex && ex.cantidad >= p.stock) return setError(`Solo hay ${p.stock} unidades de ${p.nombre}`);
    setCarrito((c) =>
      ex
        ? c.map((i) => (i.id === p.id ? { ...i, cantidad: i.cantidad + 1, stock: p.stock } : i))
        : [...c, { id: p.id, nombre: p.nombre, presentacion: p.presentacion, precio: p.precio_venta, stock: p.stock, requiere_receta: p.requiere_receta, cantidad: 1 }],
    );
    setQ('');
    setResultados([]);
    searchRef.current?.focus();
  };

  const onSearchKey = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // Enter agrega el producto si el nombre coincide exactamente o si hay un único resultado
    const data = await buscar(q);
    if (!data?.length) return setError('No se encontró el producto');
    const exacto = data.find((p) => p.nombre.toLowerCase() === q.trim().toLowerCase());
    if (exacto || data.length === 1) agregar(exacto || data[0]);
    else setError('');
  };

  const setCantidad = (id, cant) => {
    setCarrito((c) =>
      c.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, Math.min(i.stock, Number(cant) || 1)) } : i)),
    );
  };
  const quitar = (id) => setCarrito((c) => c.filter((i) => i.id !== id));

  const total = useMemo(() => Math.round(carrito.reduce((s, i) => s + i.precio * i.cantidad, 0) * 100) / 100, [carrito]);
  const subtotal = Math.round((total / 1.18) * 100) / 100;
  const igv = Math.round((total - subtotal) * 100) / 100;
  const vuelto = metodo === 'efectivo' && recibido ? Number(recibido) - total : 0;
  const conReceta = carrito.some((i) => i.requiere_receta);

  // ---- cliente ----
  const buscarCliente = async () => {
    setError('');
    if (!dni.trim()) return setCliente(null);
    try {
      const { data } = await api.get(`/clientes/dni/${dni.trim()}`);
      setCliente(data);
    } catch (e) {
      if (e.response?.status === 404) setNuevoCliente({ dni: dni.trim(), nombre: '', telefono: '' });
      else setError(errMsg(e));
    }
  };

  const guardarCliente = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/clientes', nuevoCliente);
      setCliente(data);
      setNuevoCliente(null);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // ---- cobrar ----
  const cobrar = useCallback(async () => {
    if (!carrito.length || procesando) return;
    setError('');
    if (metodo === 'efectivo' && recibido && Number(recibido) < total) return setError('El monto recibido es menor al total');
    setProcesando(true);
    try {
      const { data } = await api.post('/ventas', {
        items: carrito.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
        cliente_id: cliente?.id || null,
        metodo_pago: metodo,
        monto_recibido: metodo === 'efectivo' ? recibido || total : null,
      });
      setVenta(data);
      setCarrito([]);
      setCliente(null);
      setDni('');
      setRecibido('');
      setMetodo('efectivo');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setProcesando(false);
    }
  }, [carrito, cliente, metodo, recibido, total, procesando]);

  // Atajos de teclado: F2 buscar, F9 cobrar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F9') { e.preventDefault(); cobrar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cobrar]);

  const sugerencias = [Math.ceil(total), Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, 100, 200]
    .filter((v, i, a) => v >= total && a.indexOf(v) === i)
    .slice(0, 4);

  return (
    <div className="pos">
      <section className="pos-left card">
        <div className="pos-search">
          <input
            ref={searchRef}
            autoFocus
            maxLength={MAX.busqueda}
            placeholder="Escriba el nombre del producto  (F2)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onSearchKey}
          />
        </div>
        <Alert>{error}</Alert>
        <div className="pos-results">
          {resultados.map((p) => {
            const vencido = p.dias_para_vencer != null && p.dias_para_vencer < 0;
            return (
              <button key={p.id} className="pos-item" onClick={() => agregar(p)} disabled={p.stock === 0 || vencido}>
                <ProductoImg imagen={p.imagen} categoria={p.categoria} nombre={p.nombre} />
                <div className="grow">
                  <strong>{p.nombre}</strong>
                  <small className="muted">{p.presentacion}</small>
                  {p.laboratorio && <small className="muted">{p.laboratorio}</small>}
                  <div className="tags">
                    <StockBadge p={p} />
                    <VencBadge dias={p.dias_para_vencer} />
                    {p.requiere_receta ? <span className="tag tag-blue">Receta</span> : null}
                  </div>
                </div>
                <div className="right">
                  <strong className="price">{soles(p.precio_venta)}</strong>
                  <small className="muted">Stock: {p.stock}</small>
                </div>
              </button>
            );
          })}
          {!resultados.length && (
            <div className="empty">
              {q ? 'Sin coincidencias' : 'Escriba el nombre del producto para agregarlo a la venta. Enter agrega si hay un solo resultado.'}
            </div>
          )}
        </div>
      </section>

      <section className="pos-right card">
        <h3>Venta actual</h3>
        <div className="cart">
          {carrito.map((i) => (
            <div key={i.id} className="cart-row">
              <div className="cart-info">
                <strong>{i.nombre}</strong>
                <small className="muted"><span className="num">{soles(i.precio)}</span> c/u, quedan {i.stock}</small>
              </div>
              <div className="qty">
                <button onClick={() => setCantidad(i.id, i.cantidad - 1)}>−</button>
                <input inputMode="numeric" maxLength={5} value={i.cantidad} onChange={(e) => setCantidad(i.id, digitos(e.target.value, 5))} />
                <button onClick={() => setCantidad(i.id, i.cantidad + 1)}>+</button>
              </div>
              <strong className="cart-sub">{soles(i.precio * i.cantidad)}</strong>
              <button className="btn-ghost danger" onClick={() => quitar(i.id)} aria-label={`Quitar ${i.nombre}`}>Quitar</button>
            </div>
          ))}
          {!carrito.length && <div className="empty">Carrito vacío</div>}
        </div>

        {conReceta && <Alert type="warn">Hay productos que requieren receta médica. Verifíquela antes de cobrar.</Alert>}

        <div className="pos-cliente">
          <input
            placeholder="DNI del cliente (opcional) + Enter"
            value={dni}
            onChange={(e) => { setDni(e.target.value.replace(/\D/g, '')); setCliente(null); }}
            onKeyDown={(e) => e.key === 'Enter' && buscarCliente()}
            maxLength={11}
          />
          <button className="btn" onClick={buscarCliente}>Buscar</button>
        </div>
        {cliente && <div className="cliente-chip"><span>Cliente: <strong>{cliente.nombre}</strong></span> <button className="btn-ghost" onClick={() => { setCliente(null); setDni(''); }}>Quitar</button></div>}

        <div className="metodos">
          {METODOS.map((m) => (
            <button key={m.id} className={`key ${metodo === m.id ? 'is-on' : ''}`} aria-pressed={metodo === m.id} onClick={() => setMetodo(m.id)}>{m.label}</button>
          ))}
        </div>

        {metodo === 'efectivo' && total > 0 && (
          <div className="efectivo">
            <input type="number" min="0" max={NUM.montoRecibido} step="0.1" placeholder={`Monto recibido (${soles(total)})`} value={recibido} onChange={(e) => setRecibido(numero(e.target.value, 5, 2))} />
            <div className="sugerencias">
              {sugerencias.map((v) => <button key={v} className="key num" onClick={() => setRecibido(String(v))}>S/ {v}</button>)}
            </div>
          </div>
        )}

        <div className="totales">
          <div><span>Op. gravada</span><span>{soles(subtotal)}</span></div>
          <div><span>IGV (18%)</span><span>{soles(igv)}</span></div>
          <div className="total"><span>Total</span><span>{soles(total)}</span></div>
          {metodo === 'efectivo' && recibido && <div className={vuelto < 0 ? 'neg' : 'vuelto'}><span>Vuelto</span><span>{soles(vuelto)}</span></div>}
        </div>

        <button className="btn btn-primary btn-block btn-lg" disabled={!carrito.length || procesando} onClick={cobrar}>
          {procesando ? 'Procesando…' : `Cobrar ${soles(total)}  (F9)`}
        </button>
      </section>

      {nuevoCliente && (
        <Modal title="Registrar cliente" onClose={() => setNuevoCliente(null)} width={420}>
          <form onSubmit={guardarCliente} className="form">
            <p className="muted">El documento {nuevoCliente.dni} no está registrado.</p>
            <label className="field"><span>Nombre completo</span>
              <input autoFocus required maxLength={MAX.clienteNombre} value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
            </label>
            <label className="field"><span>Teléfono</span>
              <input type="tel" maxLength={MAX.telefono} value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: digitos(e.target.value, MAX.telefono) })} />
            </label>
            <button className="btn btn-primary btn-block">Guardar y usar</button>
          </form>
        </Modal>
      )}

      {venta && (
        <Modal title="Venta registrada" onClose={() => { setVenta(null); searchRef.current?.focus(); }} width={420}>
          <Comprobante venta={venta} />
          <div className="row-actions no-print">
            <button className="btn" onClick={() => window.print()}>Imprimir</button>
            <button className="btn btn-primary" autoFocus onClick={() => { setVenta(null); searchRef.current?.focus(); }}>Nueva venta</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
