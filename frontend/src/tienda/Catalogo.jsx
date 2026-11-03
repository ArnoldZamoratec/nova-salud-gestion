import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { soles, errMsg } from '../api';
import { Alert, ProductoImg, tintaCategoria } from '../components/ui.jsx';
import { MAX } from '../limites.js';

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(null);
  const listaRef = useRef(null);

  useEffect(() => {
    axios.get('/api/tienda/categorias').then((r) => setCategorias(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      axios.get('/api/tienda/productos', { params: { q: q || undefined, categoria: categoria || undefined } })
        .then((r) => { setProductos(r.data); setError(''); })
        .catch((e) => setError(errMsg(e)))
        .finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, categoria]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const verProductos = (e) => {
    e.preventDefault();
    listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <section className="hero">
        <div className="hero-texto">
          <h1>Catálogo de Nova Salud</h1>
          <p className="hero-lead">Consulta precios y disponibilidad, y acércate a la botica por tus productos.</p>
          <form className="hero-search" role="search" onSubmit={verProductos}>
            <label htmlFor="buscar" className="sr-only">Buscar productos</label>
            <input id="buscar" type="search" maxLength={MAX.busqueda} placeholder="Paracetamol, vitamina C, alcohol" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary">Buscar</button>
          </form>
        </div>
      </section>

      <section ref={listaRef} className="catalogo" aria-labelledby="titulo-catalogo">
        <div className="catalogo-head">
          <h2 id="titulo-catalogo">{q ? `Resultados para “${q}”` : 'Productos'}</h2>
          <div className="keys" role="group" aria-label="Categorías">
            <button className={`key ${!categoria ? 'is-on' : ''}`} aria-pressed={!categoria} onClick={() => setCategoria('')}>Todos</button>
            {categorias.map((c) => (
              <button key={c.id} className={`key ${String(categoria) === String(c.id) ? 'is-on' : ''}`} aria-pressed={String(categoria) === String(c.id)} onClick={() => setCategoria(c.id)}>
                {c.nombre}
              </button>
            ))}
          </div>
        </div>

        <Alert>{error}</Alert>
        {cargando ? (
          <div className="product-grid" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="product-card skeleton" />)}
          </div>
        ) : (
          <div className="product-grid">
            {productos.map((p) => {
              const agotado = !p.disponible;
              return (
                <article key={p.id} className={`product-card ${agotado ? 'agotado' : ''}`}>
                  <button
                    type="button"
                    className="product-thumb-btn"
                    style={{ '--t': tintaCategoria(p.categoria_id) }}
                    onClick={() => p.imagen && setZoom(p)}
                    disabled={!p.imagen}
                    aria-label={p.imagen ? `Ver imagen completa de ${p.nombre}` : p.nombre}
                  >
                    <ProductoImg imagen={p.imagen} categoria={p.categoria} nombre={p.nombre} className="product-thumb" />
                  </button>
                  <div className="product-info">
                    <h3>{p.nombre}</h3>
                    <p className="muted small">{p.presentacion}</p>
                    {p.laboratorio && <p className="muted small">{p.laboratorio}</p>}
                  </div>
                  <div className="product-foot">
                    <strong className="price num">{soles(p.precio_venta)}</strong>
                    <span className="tag">{agotado ? 'Agotado' : 'Disponible'}</span>
                  </div>
                </article>
              );
            })}
            {!productos.length && <div className="empty">No encontramos productos con esa búsqueda.</div>}
          </div>
        )}
      </section>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-label={zoom.nombre}>
          <figure>
            <img src={zoom.imagen} alt={zoom.nombre} />
            <figcaption>{zoom.nombre}<span className="muted small">{zoom.presentacion}</span></figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
