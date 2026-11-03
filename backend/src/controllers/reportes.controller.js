// Alertas de reposición / vencimiento y métricas del dashboard
import { pool } from '../config/db.js';

const diasAlerta = () => Number(process.env.DIAS_ALERTA_VENCIMIENTO) || 60;

export async function obtenerAlertas() {
  const base = `SELECT p.id, p.imagen, p.nombre, p.presentacion, p.stock, p.stock_minimo, p.fecha_vencimiento,
                       DATEDIFF(p.fecha_vencimiento, CURDATE()) AS dias_para_vencer,
                       GREATEST(p.stock_minimo * 2 - p.stock, 0) AS cantidad_sugerida
                FROM productos p
                WHERE p.activo = 1`;
  const [agotados] = await pool.query(`${base} AND p.stock = 0 ORDER BY p.nombre`);
  const [stockBajo] = await pool.query(`${base} AND p.stock > 0 AND p.stock <= p.stock_minimo ORDER BY (p.stock / NULLIF(p.stock_minimo,0))`);
  // Vencimientos por lote; los productos sin lotes registrados usan su propia fecha de vencimiento
  const vencimientos = (condicion, params = []) => pool.query(
    `SELECT CONCAT('L', l.id_lote) AS id, p.nombre, l.codigo_lote, l.cantidad_actual AS stock,
            l.fecha_caducidad AS fecha_vencimiento, DATEDIFF(l.fecha_caducidad, CURDATE()) AS dias_para_vencer
     FROM lote l JOIN productos p ON p.id = l.id_producto
     WHERE p.activo = 1 AND l.cantidad_actual > 0 AND ${condicion('l.fecha_caducidad')}
     UNION ALL
     SELECT CONCAT('P', p.id), p.nombre, NULL, p.stock, p.fecha_vencimiento, DATEDIFF(p.fecha_vencimiento, CURDATE())
     FROM productos p
     WHERE p.activo = 1 AND p.stock > 0 AND ${condicion('p.fecha_vencimiento')}
       AND NOT EXISTS (SELECT 1 FROM lote x WHERE x.id_producto = p.id)
     ORDER BY fecha_vencimiento`,
    [...params, ...params],
  );
  const [porVencer] = await vencimientos((f) => `${f} >= CURDATE() AND ${f} <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`, [diasAlerta()]);
  const [vencidos] = await vencimientos((f) => `${f} < CURDATE()`);
  return {
    agotados,
    stockBajo,
    porVencer,
    vencidos,
    total: agotados.length + stockBajo.length + porVencer.length + vencidos.length,
    diasAlerta: diasAlerta(),
  };
}

export async function alertas(req, res) {
  res.json(await obtenerAlertas());
}

export async function dashboard(req, res) {
  const [[hoy]] = await pool.query(
    `SELECT COUNT(*) AS ventas, COALESCE(SUM(total),0) AS ingresos, COALESCE(AVG(total),0) AS ticket_promedio
     FROM ventas WHERE estado = 'completada' AND DATE(creado_en) = CURDATE()`,
  );
  const [[mes]] = await pool.query(
    `SELECT COUNT(*) AS ventas, COALESCE(SUM(total),0) AS ingresos FROM ventas
     WHERE estado = 'completada' AND YEAR(creado_en) = YEAR(CURDATE()) AND MONTH(creado_en) = MONTH(CURDATE())`,
  );
  const [[inventario]] = await pool.query(
    `SELECT COUNT(*) AS productos, COALESCE(SUM(stock),0) AS unidades,
            COALESCE(SUM(stock * precio_compra),0) AS valorizado
     FROM productos WHERE activo = 1`,
  );
  const [ultimos7] = await pool.query(
    `SELECT DATE(creado_en) AS fecha, COUNT(*) AS ventas, SUM(total) AS ingresos
     FROM ventas WHERE estado = 'completada' AND creado_en >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(creado_en) ORDER BY fecha`,
  );
  const [topProductos] = await pool.query(
    `SELECT p.nombre, SUM(d.cantidad) AS unidades, SUM(d.subtotal) AS ingresos
     FROM detalle_venta d JOIN ventas v ON v.id = d.venta_id JOIN productos p ON p.id = d.producto_id
     WHERE v.estado = 'completada' AND v.creado_en >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY p.id ORDER BY unidades DESC LIMIT 5`,
  );
  const [porMetodo] = await pool.query(
    `SELECT metodo_pago, COUNT(*) AS ventas, SUM(total) AS ingresos FROM ventas
     WHERE estado = 'completada' AND creado_en >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY metodo_pago`,
  );
  const al = await obtenerAlertas();

  // Completar los 7 días aunque no haya ventas
  const serie = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-CA');
    const row = ultimos7.find((r) => r.fecha === key);
    serie.push({ fecha: key, ventas: row?.ventas || 0, ingresos: Number(row?.ingresos || 0) });
  }

  res.json({
    hoy,
    mes,
    inventario,
    ultimos7: serie,
    topProductos,
    porMetodo,
    alertas: {
      agotados: al.agotados.length,
      stockBajo: al.stockBajo.length,
      porVencer: al.porVencer.length,
      vencidos: al.vencidos.length,
      total: al.total,
    },
  });
}
