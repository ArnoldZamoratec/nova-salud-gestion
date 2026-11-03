import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('user') || 'null'));
  const [socket, setSocket] = useState(null);
  const [alertCount, setAlertCount] = useState(0);
  const [stockVersion, setStockVersion] = useState(0); // cambia cuando el servidor avisa de un cambio de stock

  const refreshAlerts = useCallback(() => {
    api.get('/alertas').then((r) => setAlertCount(r.data.total)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshAlerts();
    const s = io({ auth: { token: sessionStorage.getItem('token') } });
    s.on('stock:actualizado', () => {
      setStockVersion((v) => v + 1);
      refreshAlerts();
    });
    setSocket(s);
    return () => s.disconnect();
  }, [user, refreshAlerts]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    sessionStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAdmin: user?.rol === 'admin', socket, alertCount, refreshAlerts, stockVersion }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
