import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Ocurrió un error';

export const soles = (n) =>
  'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fecha = (s) => (s ? new Date(s.replace(' ', 'T')).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const soloFecha = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('es-PE') : '—');
export const hoyISO = () => new Date().toLocaleDateString('en-CA');
