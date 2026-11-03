import { useEffect, useState } from 'react';
import { api, errMsg, fecha } from '../api';
import { Alert, Field, Modal } from '../components/ui.jsx';
import { MAX } from '../limites.js';

export default function Usuarios() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => api.get('/usuarios').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/usuarios', form);
      setForm(null);
      cargar();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const toggle = async (u) => {
    try {
      await api.patch(`/usuarios/${u.id}/estado`);
      cargar();
    } catch (err) {
      setError(errMsg(err));
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Usuarios</h1>
          <p className="muted">Dos perfiles: administrador y químico farmacéutico.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(''); setForm({ nombre: '', email: '', password: '', rol: 'farmaceutico' }); }}>+ Nuevo usuario</button>
      </div>
      {!form && <Alert>{error}</Alert>}
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Creado</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className={u.activo ? '' : 'row-muted'}>
                <td>{u.nombre}</td><td>{u.email}</td>
                <td><span className={`tag ${u.rol === 'admin' ? 'tag-blue' : ''}`}>{u.rol}</span></td>
                <td>{fecha(u.creado_en)}</td>
                <td><span className={`tag ${u.activo ? 'tag-green' : 'tag-red'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td><button className="btn btn-sm" onClick={() => toggle(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal title="Nuevo usuario" onClose={() => setForm(null)} width={440}>
          <form className="form" onSubmit={guardar}>
            <Alert>{error}</Alert>
            <Field label="Nombre *"><input required autoFocus maxLength={MAX.usuarioNombre} value={form.nombre} onChange={set('nombre')} /></Field>
            <Field label="Email *"><input type="email" required maxLength={MAX.email} value={form.email} onChange={set('email')} /></Field>
            <Field label="Contraseña *" hint={`Entre 8 y ${MAX.password} caracteres`}><input type="password" required minLength={8} maxLength={MAX.password} value={form.password} onChange={set('password')} autoComplete="new-password" /></Field>
            <Field label="Rol">
              <select value={form.rol} onChange={set('rol')}>
                <option value="farmaceutico">Químico Farmacéutico</option>
                <option value="admin">Administrador</option>
              </select>
            </Field>
            <button className="btn btn-primary btn-block">Crear usuario</button>
          </form>
        </Modal>
      )}
    </>
  );
}
