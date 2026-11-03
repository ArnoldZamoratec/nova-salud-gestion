// Lógica de lotes compartida por inventario y ventas.
// Regla FEFO (First Expired, First Out): siempre se despacha primero el lote vigente que vence antes.
import { HttpError } from './middleware/errorHandler.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Valida los datos de un lote nuevo que ingresa con `cantidad` unidades. */
export function validarLote(b = {}) {
  const codigo = String(b.codigo_lote || '').trim();
  if (!codigo) throw new HttpError(400, 'Indique el código del lote');
  if (codigo.length > 50) throw new HttpError(400, 'El código del lote es demasiado largo');
  if (!FECHA.test(b.fecha_fabricacion || '')) throw new HttpError(400, 'Indique la fecha de fabricación');
  if (!FECHA.test(b.fecha_caducidad || '')) throw new HttpError(400, 'Indique la fecha de caducidad');
  if (b.fecha_caducidad <= b.fecha_fabricacion) throw new HttpError(400, 'La caducidad debe ser posterior a la fabricación');
  if (b.fecha_fabricacion > new Date().toLocaleDateString('en-CA')) throw new HttpError(400, 'La fecha de fabricación no puede ser futura');
  return { codigo_lote: codigo, fecha_fabricacion: b.fecha_fabricacion, fecha_caducidad: b.fecha_caducidad };
}

/** Crea el lote. Si el código ya existe para el producto, responde 409. */
export async function crearLote(conn, productoId, datos, cantidad) {
  try {
    const [r] = await conn.query(
      `INSERT INTO lote (codigo_lote, fecha_fabricacion, fecha_caducidad, cantidad_inicial, cantidad_actual, id_producto)
       VALUES (?,?,?,?,?,?)`,
      [datos.codigo_lote, datos.fecha_fabricacion, datos.fecha_caducidad, cantidad, cantidad, productoId],
    );
    return r.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, `El lote ${datos.codigo_lote} ya está registrado para este producto`);
    throw err;
  }
}

/** Unidades en lotes ya caducados (no se pueden vender). */
export async function unidadesVencidas(conn, productoId) {
  const [[r]] = await conn.query(
    'SELECT COALESCE(SUM(cantidad_actual),0) AS n FROM lote WHERE id_producto = ? AND fecha_caducidad < CURDATE()',
    [productoId],
  );
  return Number(r.n);
}

/**
 * Descuenta `cantidad` de los lotes vigentes en orden FEFO.
 * Devuelve los lotes afectados [{ codigo, cantidad }]. Si los lotes no alcanzan (stock antiguo
 * registrado sin lote), el resto se descuenta solo del stock del producto.
 */
export async function descontarLotes(conn, productoId, cantidad, { incluirVencidos = false } = {}) {
  const [lotes] = await conn.query(
    `SELECT id_lote, codigo_lote, cantidad_actual FROM lote
     WHERE id_producto = ? AND cantidad_actual > 0 ${incluirVencidos ? '' : 'AND fecha_caducidad >= CURDATE()'}
     ORDER BY fecha_caducidad, id_lote FOR UPDATE`,
    [productoId],
  );
  const usados = [];
  let falta = cantidad;
  for (const l of lotes) {
    if (falta <= 0) break;
    const toma = Math.min(falta, l.cantidad_actual);
    await conn.query('UPDATE lote SET cantidad_actual = cantidad_actual - ? WHERE id_lote = ?', [toma, l.id_lote]);
    usados.push({ codigo: l.codigo_lote, cantidad: toma });
    falta -= toma;
  }
  return usados;
}

/** Devuelve unidades a los lotes (anulación o ajuste positivo), llenando primero los que vencen antes. */
export async function devolverLotes(conn, productoId, cantidad) {
  const [lotes] = await conn.query(
    `SELECT id_lote, cantidad_inicial - cantidad_actual AS espacio FROM lote
     WHERE id_producto = ? AND cantidad_actual < cantidad_inicial AND fecha_caducidad >= CURDATE()
     ORDER BY fecha_caducidad, id_lote FOR UPDATE`,
    [productoId],
  );
  let falta = cantidad;
  for (const l of lotes) {
    if (falta <= 0) break;
    const pone = Math.min(falta, Number(l.espacio));
    await conn.query('UPDATE lote SET cantidad_actual = cantidad_actual + ? WHERE id_lote = ?', [pone, l.id_lote]);
    falta -= pone;
  }
}

/**
 * Mantiene productos.fecha_vencimiento = próxima caducidad del stock en lotes
 * (primero entre los lotes vigentes; si solo quedan vencidos, la del vencido más antiguo).
 */
export async function sincronizarVencimiento(conn, productoId) {
  const [[r]] = await conn.query(
    `SELECT COALESCE(MIN(CASE WHEN fecha_caducidad >= CURDATE() THEN fecha_caducidad END), MIN(fecha_caducidad)) AS f
     FROM lote WHERE id_producto = ? AND cantidad_actual > 0`,
    [productoId],
  );
  if (r.f) await conn.query('UPDATE productos SET fecha_vencimiento = ? WHERE id = ?', [r.f, productoId]);
}

export const textoLotes = (usados) => (usados.length ? ` (lote ${usados.map((u) => `${u.codigo}×${u.cantidad}`).join(', ')})` : '');
