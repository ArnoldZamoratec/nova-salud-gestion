// Límites de los campos. El frontend usa los mismos valores en frontend/src/limites.js.
import { HttpError } from './middleware/errorHandler.js';

export const MAX = {
  usuarioNombre: 50,
  email: 60,
  password: 30,
  categoria: 30,
  productoNombre: 60,
  descripcion: 200,
  laboratorio: 40,
  presentacion: 30,
  clienteNombre: 80,
  telefono: 9,
  codigoLote: 15,
  motivo: 100,
};

export const NUM = {
  precio: 99999.99,
  cantidad: 99999,
  stockMinimo: 9999,
  montoRecibido: 99999,
};

/** Devuelve el texto sin espacios extremos; 400 si supera `max` caracteres. */
export function texto(valor, max, campo) {
  const s = String(valor ?? '').trim();
  if (s.length > max) throw new HttpError(400, `${campo}: máximo ${max} caracteres`);
  return s;
}

/** Recorta el texto del kardex al tamaño de la columna motivo (VARCHAR 255). */
export const motivoKardex = (s) => (s.length > 255 ? `${s.slice(0, 254)}…` : s);
