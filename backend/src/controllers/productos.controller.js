import { pool, withTransaction } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { emitirCambioStock } from '../socket.js';
import { borrarImagen, rutaPublica } from '../middleware/upload.js';
import { MAX, texto, motivoKardex } from '../validar.js';
import { validarLote, crearLote, descontarLotes, devolverLotes, sincronizarVencimiento, textoLotes } from '../lotes.js';

const SELECT_PRODUCTO = `
  SELECT p.*, c.nombre AS categoria,
         (p.stock <= p.stock_minimo) AS stock_bajo,
         DATEDIFF(p.fecha_vencimiento, CURDATE()) AS dias_para_vencer
  FROM productos p
  LEFT JOIN categorias c ON c.id = p.categoria_id`;

export async function listar(req, res) {
  const { q, categoria, estado } = req.query;
  const where = ['p.activo = 1'];
  const params = [];
  if (q) {
    where.push('(p.nombre LIKE ? OR p.presentacion LIKE ? OR p.laboratorio LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (categoria) {
    where.push('p.categoria_id = ?');
    params.push(categoria);
  }
  if (estado === 'bajo') where.push('p.stock <= p.stock_minimo');
  if (estado === 'agotado') where.push('p.stock = 0');
  const [rows] = await pool.query(`${SELECT_PRODUCTO} WHERE ${where.join(' AND ')} ORDER BY p.nombre`, params);
  res.json(rows);
}

/** Búsqueda rápida para el punto de venta por nombre (primero los que empiezan con el texto). */
export async function buscar(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const [rows] = await pool.query(
    `${SELECT_PRODUCTO}
     WHERE p.activo = 1 AND (p.nombre LIKE ? OR p.laboratorio LIKE ?)
     ORDER BY (p.nombre LIKE ?) DESC, p.nombre LIMIT 20`,
    [`%${q}%`, `%${q}%`, `${q}%`],
  );
  res.json(rows);
}

export async function obtener(req, res) {
  const [[row]] = await pool.query(`${SELECT_PRODUCTO} WHERE p.id = ?`, [req.params.id]);
  if (!row) throw new HttpError(404, 'Producto no encontrado');
  res.json(row);
}

function validar(body) {
  const { nombre, precio_venta, precio_compra = 0, stock_minimo = 0 } = body;
  const nom = texto(nombre, MAX.productoNombre, 'Nombre');
  if (!nom) throw new HttpError(400, 'El nombre es obligatorio');
  if (!(Number(precio_venta) > 0)) throw new HttpError(400, 'El precio de venta debe ser mayor a 0');
  if (Number(precio_compra) < 0 || Number(stock_minimo) < 0) throw new HttpError(400, 'Valores numéricos inválidos');
  return {
    nombre: nom,
    descripcion: texto(body.descripcion, MAX.descripcion, 'Descripción') || null,
    laboratorio: texto(body.laboratorio, MAX.laboratorio, 'Laboratorio') || null,
    presentacion: texto(body.presentacion, MAX.presentacion, 'Presentación'), // '' (no NULL) para que el UNIQUE nombre+presentación funcione
    categoria_id: body.categoria_id || null,
    precio_compra: Number(precio_compra),
    precio_venta: Number(precio_venta),
    stock_minimo: Number(stock_minimo),
    fecha_vencimiento: body.fecha_vencimiento || null,
    requiere_receta: body.requiere_receta ? 1 : 0,
  };
}

/** Crea el producto con stock 0: las unidades ingresan después, siempre dentro de un lote. */
export async function crear(req, res) {
  const data = validar(req.body || {});
  const [r] = await pool.query('INSERT INTO productos SET ?', [{ ...data, stock: 0 }]);
  emitirCambioStock([{ id: r.insertId, stock: 0 }]);
  res.status(201).json({ id: r.insertId });
}

export async function actualizar(req, res) {
  const data = validar(req.body || {});
  const [r] = await pool.query('UPDATE productos SET ? WHERE id = ?', [data, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Producto no encontrado');
  emitirCambioStock();
  res.json({ ok: true });
}

/** Baja lógica: se conserva el historial de ventas y movimientos. */
export async function eliminar(req, res) {
  await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [req.params.id]);
  emitirCambioStock();
  res.json({ ok: true });
}

/** Sube o reemplaza la foto del producto (campo multipart "imagen"). */
export async function subirImagenProducto(req, res) {
  if (!req.file) throw new HttpError(400, 'Seleccione una imagen');
  const nueva = rutaPublica(req.file.filename);
  const [[p]] = await pool.query('SELECT imagen FROM productos WHERE id = ?', [req.params.id]);
  if (!p) {
    borrarImagen(nueva);
    throw new HttpError(404, 'Producto no encontrado');
  }
  await pool.query('UPDATE productos SET imagen = ? WHERE id = ?', [nueva, req.params.id]);
  borrarImagen(p.imagen); // elimina la foto anterior del disco
  emitirCambioStock();
  res.json({ imagen: nueva });
}

export async function quitarImagenProducto(req, res) {
  const [[p]] = await pool.query('SELECT imagen FROM productos WHERE id = ?', [req.params.id]);
  if (!p) throw new HttpError(404, 'Producto no encontrado');
  await pool.query('UPDATE productos SET imagen = NULL WHERE id = ?', [req.params.id]);
  borrarImagen(p.imagen);
  emitirCambioStock();
  res.json({ ok: true });
}

/**
 * Entrada de mercadería (crea un lote nuevo) o ajuste por conteo físico (descuenta o devuelve
 * unidades a los lotes en orden FEFO). Registra el movimiento en el kardex.
 */
export async function movimientoStock(req, res) {
  const { tipo, cantidad, motivo } = req.body || {};
  const cant = parseInt(cantidad, 10);
  if (!['entrada', 'ajuste'].includes(tipo)) throw new HttpError(400, 'Tipo de movimiento inválido');
  if (!Number.isInteger(cant) || (tipo === 'entrada' && cant <= 0) || (tipo === 'ajuste' && cant < 0)) {
    throw new HttpError(400, 'Cantidad inválida');
  }
  texto(motivo, MAX.motivo, 'Motivo');
  if (tipo === 'ajuste' && !motivo?.trim()) throw new HttpError(400, 'Indique el motivo del ajuste');
  const lote = tipo === 'entrada' ? validarLote(req.body) : null;

  const result = await withTransaction(async (conn) => {
    const [[p]] = await conn.query('SELECT id, stock FROM productos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!p) throw new HttpError(404, 'Producto no encontrado');
    // entrada: suma; ajuste: fija el stock al conteo físico
    const nuevo = tipo === 'entrada' ? p.stock + cant : cant;
    let detalle;
    if (tipo === 'entrada') {
      await crearLote(conn, p.id, lote, cant);
      detalle = `${motivo?.trim() || 'Ingreso de mercadería'} (lote ${lote.codigo_lote})`;
    } else if (nuevo < p.stock) {
      detalle = motivo.trim() + textoLotes(await descontarLotes(conn, p.id, p.stock - nuevo, { incluirVencidos: true }));
    } else {
      if (nuevo > p.stock) await devolverLotes(conn, p.id, nuevo - p.stock);
      detalle = motivo.trim();
    }
    await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, p.id]);
    await sincronizarVencimiento(conn, p.id);
    await conn.query(
      `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
       VALUES (?,?,?,?,?,?,?)`,
      [p.id, tipo, Math.abs(nuevo - p.stock), p.stock, nuevo, motivoKardex(detalle), req.user.id],
    );
    return { id: p.id, stock: nuevo };
  });
  emitirCambioStock([result]);
  res.json(result);
}

export async function movimientos(req, res) {
  const { producto_id, limit = 200 } = req.query;
  const params = [];
  let where = '';
  if (producto_id) {
    where = 'WHERE m.producto_id = ?';
    params.push(producto_id);
  }
  params.push(Math.min(Number(limit) || 200, 1000));
  const [rows] = await pool.query(
    `SELECT m.*, p.nombre AS producto, u.nombre AS usuario, v.numero AS venta_numero
     FROM movimientos_inventario m
     JOIN productos p ON p.id = m.producto_id
     LEFT JOIN usuarios u ON u.id = m.usuario_id
     LEFT JOIN ventas v ON v.id = m.venta_id
     ${where} ORDER BY m.id DESC LIMIT ?`,
    params,
  );
  res.json(rows);
}
