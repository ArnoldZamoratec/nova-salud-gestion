// Consulta de lotes y baja de lotes (vencidos, dañados, retirados por DIGEMID, etc.)
import { pool, withTransaction } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { emitirCambioStock } from '../socket.js';
import { sincronizarVencimiento } from '../lotes.js';

const diasAlerta = () => Number(process.env.DIAS_ALERTA_VENCIMIENTO) || 60;

const ESTADO = `CASE
    WHEN l.cantidad_actual = 0 THEN 'agotado'
    WHEN l.fecha_caducidad < CURDATE() THEN 'vencido'
    WHEN l.fecha_caducidad <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 'por_vencer'
    ELSE 'vigente' END`;

export async function listar(req, res) {
  const { producto_id, estado, q } = req.query;
  const where = ['p.activo = 1'];
  const params = [diasAlerta()];
  if (producto_id) { where.push('l.id_producto = ?'); params.push(producto_id); }
  if (q) { where.push('(l.codigo_lote LIKE ? OR p.nombre LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const having = estado ? 'HAVING estado = ?' : '';
  if (estado) params.push(estado);
  const [rows] = await pool.query(
    `SELECT l.*, p.nombre AS producto, p.presentacion,
            DATEDIFF(l.fecha_caducidad, CURDATE()) AS dias_para_vencer, ${ESTADO} AS estado
     FROM lote l JOIN productos p ON p.id = l.id_producto
     WHERE ${where.join(' AND ')} ${having}
     ORDER BY (l.cantidad_actual = 0), l.fecha_caducidad, l.id_lote`,
    params,
  );
  res.json({ lotes: rows, diasAlerta: diasAlerta() });
}

/** Retira del inventario todas las unidades que quedan en un lote. */
export async function baja(req, res) {
  const motivo = req.body?.motivo?.trim();
  if (!motivo) throw new HttpError(400, 'Indique el motivo de la baja');
  const result = await withTransaction(async (conn) => {
    const [[l]] = await conn.query('SELECT * FROM lote WHERE id_lote = ? FOR UPDATE', [req.params.id]);
    if (!l) throw new HttpError(404, 'Lote no encontrado');
    if (l.cantidad_actual === 0) throw new HttpError(400, 'El lote ya no tiene unidades');
    const [[p]] = await conn.query('SELECT id, stock FROM productos WHERE id = ? FOR UPDATE', [l.id_producto]);
    const nuevo = Math.max(0, p.stock - l.cantidad_actual);
    await conn.query('UPDATE lote SET cantidad_actual = 0 WHERE id_lote = ?', [l.id_lote]);
    await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, p.id]);
    await sincronizarVencimiento(conn, p.id);
    await conn.query(
      `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
       VALUES (?, 'ajuste', ?, ?, ?, ?, ?)`,
      [p.id, p.stock - nuevo, p.stock, nuevo, `Baja del lote ${l.codigo_lote}: ${motivo}`, req.user.id],
    );
    return { id: p.id, stock: nuevo };
  });
  emitirCambioStock([result]);
  res.json(result);
}
