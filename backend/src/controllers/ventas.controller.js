import { pool, withTransaction } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { emitirCambioStock } from '../socket.js';
import { MAX, NUM, texto } from '../validar.js';
import { unidadesVencidas, descontarLotes, devolverLotes, sincronizarVencimiento, textoLotes } from '../lotes.js';

const IGV = 0.18;
const redondear = (n) => Math.round(n * 100) / 100;

/**
 * Registra una venta de forma atómica:
 * bloquea las filas de los productos (FOR UPDATE), valida stock y vencimiento,
 * usa los precios de la BD (no los del cliente), descuenta stock y registra el kardex.
 */
export async function registrar(req, res) {
  const { items, cliente_id = null, metodo_pago = 'efectivo', monto_recibido } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'La venta no tiene productos');
  if (!['efectivo', 'tarjeta', 'yape_plin'].includes(metodo_pago)) throw new HttpError(400, 'Método de pago inválido');

  // Agrupar cantidades por producto
  const cantidades = new Map();
  for (const it of items) {
    const id = Number(it.producto_id);
    const cant = parseInt(it.cantidad, 10);
    if (!id || !Number.isInteger(cant) || cant <= 0) throw new HttpError(400, 'Ítem de venta inválido');
    if (cant > NUM.cantidad) throw new HttpError(400, `La cantidad no puede superar ${NUM.cantidad}`);
    cantidades.set(id, (cantidades.get(id) || 0) + cant);
  }
  const ids = [...cantidades.keys()].sort((a, b) => a - b); // orden fijo → evita deadlocks

  const venta = await withTransaction(async (conn) => {
    const [productos] = await conn.query(
      `SELECT id, nombre, precio_venta, stock, activo, fecha_vencimiento,
              (fecha_vencimiento IS NOT NULL AND fecha_vencimiento < CURDATE()) AS vencido
       FROM productos WHERE id IN (?) ORDER BY id FOR UPDATE`,
      [ids],
    );
    if (productos.length !== ids.length) throw new HttpError(400, 'Algún producto no existe');

    let total = 0;
    const detalle = [];
    for (const p of productos) {
      const cantidad = cantidades.get(p.id);
      if (!p.activo) throw new HttpError(400, `${p.nombre} no está disponible`);
      if (p.vencido) throw new HttpError(400, `${p.nombre} está vencido y no puede venderse`);
      if (p.stock < cantidad) throw new HttpError(409, `Stock insuficiente de ${p.nombre} (disponible: ${p.stock})`);
      // Las unidades de lotes caducados siguen en el stock hasta darlas de baja, pero no se venden
      const vigentes = p.stock - (await unidadesVencidas(conn, p.id));
      if (vigentes < cantidad) throw new HttpError(409, `Solo hay ${vigentes} unidades vigentes de ${p.nombre}; el resto pertenece a lotes caducados`);
      const subtotal = redondear(p.precio_venta * cantidad);
      total += subtotal;
      detalle.push({ p, cantidad, subtotal });
    }

    total = redondear(total);
    const subtotal = redondear(total / (1 + IGV));
    const igv = redondear(total - subtotal);
    let recibido = null;
    let vuelto = null;
    if (metodo_pago === 'efectivo') {
      recibido = monto_recibido == null || monto_recibido === '' ? total : Number(monto_recibido);
      if (!(recibido >= total)) throw new HttpError(400, 'El monto recibido es menor al total');
      if (recibido > NUM.montoRecibido) throw new HttpError(400, `El monto recibido no puede superar S/ ${NUM.montoRecibido}`);
      vuelto = redondear(recibido - total);
    }

    const [r] = await conn.query(
      `INSERT INTO ventas (cliente_id, usuario_id, subtotal, igv, total, metodo_pago, monto_recibido, vuelto)
       VALUES (?,?,?,?,?,?,?,?)`,
      [cliente_id || null, req.user.id, subtotal, igv, total, metodo_pago, recibido, vuelto],
    );
    const ventaId = r.insertId;
    const numero = `B001-${String(ventaId).padStart(8, '0')}`;
    await conn.query('UPDATE ventas SET numero = ? WHERE id = ?', [numero, ventaId]);

    for (const { p, cantidad, subtotal: sub } of detalle) {
      await conn.query(
        'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?,?,?,?,?)',
        [ventaId, p.id, cantidad, p.precio_venta, sub],
      );
      await conn.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [cantidad, p.id]);
      const usados = await descontarLotes(conn, p.id, cantidad);
      await sincronizarVencimiento(conn, p.id);
      await conn.query(
        `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, venta_id, usuario_id)
         VALUES (?, 'salida', ?, ?, ?, ?, ?, ?)`,
        [p.id, cantidad, p.stock, p.stock - cantidad, `Venta ${numero}${textoLotes(usados)}`, ventaId, req.user.id],
      );
    }
    return {
      id: ventaId,
      stocks: detalle.map(({ p, cantidad }) => ({ id: p.id, stock: p.stock - cantidad })),
    };
  });

  emitirCambioStock(venta.stocks);
  res.status(201).json(await obtenerVenta(venta.id));
}

async function obtenerVenta(id) {
  const [[venta]] = await pool.query(
    `SELECT v.*, c.nombre AS cliente, c.dni AS cliente_dni, u.nombre AS vendedor
     FROM ventas v
     LEFT JOIN clientes c ON c.id = v.cliente_id
     JOIN usuarios u ON u.id = v.usuario_id
     WHERE v.id = ?`,
    [id],
  );
  if (!venta) throw new HttpError(404, 'Venta no encontrada');
  const [items] = await pool.query(
    `SELECT d.*, p.nombre, p.presentacion FROM detalle_venta d
     JOIN productos p ON p.id = d.producto_id WHERE d.venta_id = ?`,
    [id],
  );
  return { ...venta, items };
}

export async function obtener(req, res) {
  res.json(await obtenerVenta(req.params.id));
}

export async function listar(req, res) {
  const { desde, hasta, estado, q } = req.query;
  const where = [];
  const params = [];
  if (desde) { where.push('DATE(v.creado_en) >= ?'); params.push(desde); }
  if (hasta) { where.push('DATE(v.creado_en) <= ?'); params.push(hasta); }
  if (estado) { where.push('v.estado = ?'); params.push(estado); }
  if (q) { where.push('(v.numero LIKE ? OR c.nombre LIKE ? OR c.dni LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  // El químico farmacéutico solo ve sus propias ventas
  if (req.user.rol !== 'admin') { where.push('v.usuario_id = ?'); params.push(req.user.id); }

  const [rows] = await pool.query(
    `SELECT v.id, v.numero, v.total, v.metodo_pago, v.estado, v.creado_en,
            c.nombre AS cliente, u.nombre AS vendedor,
            (SELECT SUM(cantidad) FROM detalle_venta d WHERE d.venta_id = v.id) AS unidades
     FROM ventas v
     LEFT JOIN clientes c ON c.id = v.cliente_id
     JOIN usuarios u ON u.id = v.usuario_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY v.id DESC LIMIT 500`,
    params,
  );
  res.json(rows);
}

/** Anula una venta y devuelve el stock (solo administrador). */
export async function anular(req, res) {
  const motivo = texto(req.body?.motivo, MAX.motivo, 'Motivo');
  if (!motivo) throw new HttpError(400, 'Indique el motivo de la anulación');

  const stocks = await withTransaction(async (conn) => {
    const [[venta]] = await conn.query('SELECT * FROM ventas WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!venta) throw new HttpError(404, 'Venta no encontrada');
    if (venta.estado === 'anulada') throw new HttpError(400, 'La venta ya fue anulada');

    const [items] = await conn.query('SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id = ? ORDER BY producto_id', [venta.id]);
    const result = [];
    for (const it of items) {
      const [[p]] = await conn.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [it.producto_id]);
      const nuevo = p.stock + it.cantidad;
      await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, it.producto_id]);
      await devolverLotes(conn, it.producto_id, it.cantidad);
      await sincronizarVencimiento(conn, it.producto_id);
      await conn.query(
        `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, venta_id, usuario_id)
         VALUES (?, 'anulacion', ?, ?, ?, ?, ?, ?)`,
        [it.producto_id, it.cantidad, p.stock, nuevo, `Anulación ${venta.numero}: ${motivo}`, venta.id, req.user.id],
      );
      result.push({ id: it.producto_id, stock: nuevo });
    }
    await conn.query("UPDATE ventas SET estado = 'anulada' WHERE id = ?", [venta.id]);
    return result;
  });

  emitirCambioStock(stocks);
  res.json({ ok: true });
}
