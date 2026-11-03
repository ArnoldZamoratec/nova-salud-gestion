import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api';
import { Alert, Marca } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand brand-lg">
          <Marca />
          <div>
            <strong>Nova Salud</strong>
            <small>Gestión de inventario y ventas</small>
          </div>
        </div>
        <Alert>{error}</Alert>
        <label className="field">
          <span>Correo</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required autoComplete="username" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
        <a href="/" className="link small center">Ir al catálogo</a>
      </form>
    </div>
  );
}
