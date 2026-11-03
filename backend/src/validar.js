// Límites de longitud de los campos de texto, iguales a las columnas de database/nova_salud.sql.
// El frontend usa los mismos valores en frontend/src/limites.js.
import { HttpError } from './middleware/errorHandler.js';

export const MAX = {
  usuarioNombre: 100,
  email: 120,
  password: 72, // bcrypt ignora lo que pase de 72 bytes
  categoria: 80,
  productoNombre: 150,
  descripcion: 255,
  laboratorio: 100,
  presentacion: 80,
  clienteNombre: 120,
  telefono: 20,
  codigoLote: 50,
  // movimientos_inventario.motivo es VARCHAR(255) y el sistema le agrega prefijos
  // ("Baja del lote …:", "Anulación B001-…:") y el detalle de lotes; se deja margen.
  motivo: 150,
};

/** Devuelve el texto sin espacios extremos; 400 si supera `max` caracteres. */
export function texto(valor, max, campo) {
  const s = String(valor ?? '').trim();
  if (s.length > max) throw new HttpError(400, `${campo}: máximo ${max} caracteres`);
  return s;
}

/** Recorta el texto del kardex al tamaño de la columna motivo (VARCHAR 255). */
export const motivoKardex = (s) => (s.length > 255 ? `${s.slice(0, 254)}…` : s);
