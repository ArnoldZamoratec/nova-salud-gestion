import { useEffect, useState } from 'react';
import { api, errMsg, fecha, soles } from '../api';
import { Alert, Empty, Field, Modal } from '../components/ui.jsx';

export default function Clientes() {
  const [q, setQ] = useState('');
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const cargar = () => api.get('/clientes', { params: { q } }).then((r) => setClientes(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const guardar = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (form.id) await api.put(`/clientes/${form.id}`, form);
      else await api.post('/clientes', form);
      setForm(null);
      cargar();
    } catch (err) {
      setFormError(errMsg(err));
    }
  };

  const verHistorial = async (c) => {
    const { data } = await api.get(`/clientes/${c.id}/ventas`);
    setHistorial({ cliente: c, ventas: data });
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Clientes</h1>
          <p className="muted">Fidelización: historial de compras por cliente</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(''); setForm({ dni: '', nombre: '', telefono: '', email: '' }); }}>+ Nuevo cliente</button>
      </div>
      <div className="filters card">
        <input placeholder="Buscar por DNI o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Alert>{error}</Alert>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>DNI/RUC</th><th>Nombre</th><th>Teléfono</th><th className="right">Compras</th><th className="right">Total comprado</th><th>Última compra</th><th></th></tr></thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.dni}</td>
                <td>{c.nombre}</td>
                <td>{c.telefono || '—'}</td>
                <td className="right">{c.compras}</td>
                <td className="right">{soles(c.total_comprado)}</td>
                <td>{fecha(c.ultima_compra)}</td>
                <td className="actions">
                  <button className="btn btn-sm" onClick={() => verHistorial(c)}>Historial</button>
                  <button className="btn btn-sm" onClick={() => { setFormError(''); setForm({ ...c, telefono: c.telefono || '', email: c.email || '' }); }}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clientes.length && <Empty />}
      </div>

      {form && (
        <Modal title={form.id ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setForm(null)} width={440}>
          <form className="form" onSubmit={guardar}>
            <Alert>{formError}</Alert>
            <Field label="DNI (8) o RUC (11) *"><input required autoFocus maxLength={11} value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Nombre completo *"><input required value={form.nombre} onChange={set('nombre')} /></Field>
            <Field label="Teléfono"><input value={form.telefono} onChange={set('telefono')} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={set('email')} /></Field>
            <button className="btn btn-primary btn-block">Guardar</button>
          </form>
        </Modal>
      )}

      {historial && (
        <Modal title={`Compras de ${historial.cliente.nombre}`} onClose={() => setHistorial(null)}>
          <table className="table">
            <thead><tr><th>N°</th><th>Fecha</th><th className="right">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {historial.ventas.map((v) => (
                <tr key={v.id}><td className="mono">{v.numero}</td><td>{fecha(v.creado_en)}</td><td className="right">{soles(v.total)}</td><td>{v.estado}</td></tr>
              ))}
            </tbody>
          </table>
          {!historial.ventas.length && <Empty>Sin compras registradas</Empty>}
        </Modal>
      )}
    </>
  );
}
