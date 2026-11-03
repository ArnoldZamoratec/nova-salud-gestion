import { useEffect } from 'react';

export function Modal({ title, onClose, children, width = 560 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn-ghost" onClick={onClose} aria-label="Cerrar">Cerrar</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

export function Alert({ type = 'error', children }) {
  if (!children) return null;
  return <div className={`alert alert-${type}`}>{children}</div>;
}

export function StockBadge({ p }) {
  if (p.stock === 0) return <span className="tag tag-red">Agotado</span>;
  if (p.stock <= p.stock_minimo) return <span className="tag tag-amber">Stock bajo</span>;
  return <span className="tag tag-green">Disponible</span>;
}

export function VencBadge({ dias, diasAlerta = 60 }) {
  if (dias == null) return null;
  if (dias < 0) return <span className="tag tag-red">Vencido</span>;
  if (dias <= diasAlerta) return <span className="tag tag-amber">Vence en {dias} d</span>;
  return null;
}

/** Tinte de plástico por categoría (decorativo, nunca un estado). */
const TINTAS = ['--p-thu', '--p-fri', '--p-wed', '--p-tue', '--p-sat', '--p-mon', '--p-sun'];
export const tintaCategoria = (id) => `var(${TINTAS[(Number(id) || 0) % TINTAS.length]})`;

/** Marca de la botica: cruz de farmacia. */
export function Marca() {
  return (
    <svg className="marca" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path d="M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5z" fill="var(--color-accent-ink)" />
    </svg>
  );
}

/** Foto del producto; sin foto, sus iniciales sobre plástico. */
export function ProductoImg({ imagen, nombre, className = 'thumb-sm' }) {
  const iniciales = (nombre || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className={`prod-img ${className}`}>
      {imagen ? <img src={imagen} alt={nombre || ''} loading="lazy" /> : <span className="iniciales" aria-hidden="true">{iniciales}</span>}
    </div>
  );
}

export function Empty({ children = 'Sin registros' }) {
  return <div className="empty">{children}</div>;
}
