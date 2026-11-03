import { useEffect, useState } from 'react';
import { api, errMsg, soloFecha } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from '../components/ui.jsx';

function Seccion({ titulo, color, items, columnas, descripcion }) {
  return (
    <div className={`card alert-section border-${color}`}>
      <div className="section-head">
        <h3>{titulo}</h3>
        <span className={`tag tag-${color}`}>{items.length}</span>
      </div>
      <p className="muted small">{descripcion}</p>
      {items.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>{columnas.map((c) => <th key={c.label} className={c.right ? 'right' : ''}>{c.label}</th>)}</tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>{columnas.map((c) => <td key={c.label} className={c.right ? 'right' : ''}>{c.render(p)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="empty">Todo en orden.</div>}
    </div>
  );
}

export default function Alertas() {
  const { stockVersion } = useAuth();
  const [a, setA] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/alertas').then((r) => setA(r.data)).catch((e) => setError(errMsg(e)));
  }, [stockVersion]);

  if (error) return <Alert>{error}</Alert>;
  if (!a) return <div className="empty">Cargando…</div>;

  const reposicion = [
    { label: 'Producto', render: (p) => <><strong>{p.nombre}</strong><div className="muted small">{p.presentacion}</div></> },
    { label: 'Stock', right: true, render: (p) => <strong>{p.stock}</strong> },
    { label: 'Mínimo', right: true, render: (p) => p.stock_minimo },
    { label: 'Pedir (sugerido)', right: true, render: (p) => <strong>{p.cantidad_sugerida}</strong> },
  ];
  const vencimiento = [
    { label: 'Producto', render: (p) => <strong>{p.nombre}</strong> },
    { label: 'Lote', render: (p) => p.codigo_lote || <span className="muted">sin lote</span> },
    { label: 'Unidades', right: true, render: (p) => p.stock },
    { label: 'Vence', render: (p) => soloFecha(p.fecha_vencimiento) },
    { label: 'Días', right: true, render: (p) => <strong>{p.dias_para_vencer}</strong> },
  ];

  const exportarPedido = () => {
    const filas = [...a.agotados, ...a.stockBajo];
    const csv = ['Producto,Stock,Minimo,Cantidad sugerida']
      .concat(filas.map((p) => [`"${p.nombre}"`, p.stock, p.stock_minimo, p.cantidad_sugerida].join(',')))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedido-reposicion-${new Date().toLocaleDateString('en-CA')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Alertas de inventario</h1>
          <p className="muted">Se recalculan automáticamente con cada venta o ingreso de mercadería</p>
        </div>
        {a.agotados.length + a.stockBajo.length > 0 && <button className="btn btn-primary" onClick={exportarPedido}>Exportar pedido de reposición</button>}
      </div>
      <div className="grid-2">
        <Seccion titulo="Agotados" color="red" items={a.agotados} columnas={reposicion} descripcion="Sin unidades disponibles: reponer de inmediato." />
        <Seccion titulo="Stock bajo" color="amber" items={a.stockBajo} columnas={reposicion} descripcion="Stock igual o menor al mínimo configurado." />
        <Seccion titulo={`Por vencer (≤ ${a.diasAlerta} días)`} color="amber" items={a.porVencer} columnas={vencimiento} descripcion="Priorizar su venta antes de que venzan." />
        <Seccion titulo="Vencidos con stock" color="red" items={a.vencidos} columnas={vencimiento} descripcion="Retirar de anaquel y darlos de baja en Lotes. El sistema bloquea su venta." />
      </div>
    </>
  );
}
