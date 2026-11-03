// Catálogo público de la botica (solo consulta: la venta se realiza en el local)
import { pool } from '../config/db.js';

// Productos visibles en el catálogo: activos, no vencidos y sin receta médica
const WHERE_TIENDA = `p.activo = 1 AND p.requiere_receta = 0
  AND (p.fecha_vencimiento IS NULL OR p.fecha_vencimiento >= CURDATE())`;

export async function catalogo(req, res) {
  const { q, categoria } = req.query;
  const where = [WHERE_TIENDA];
  const params = [];
  if (q) { where.push('(p.nombre LIKE ? OR p.laboratorio LIKE ? OR p.descripcion LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (categoria) { where.push('p.categoria_id = ?'); params.push(categoria); }
  // No se expone el stock exacto ni el precio de compra
  const [rows] = await pool.query(
    `SELECT p.id, p.nombre, p.descripcion, p.imagen, p.laboratorio, p.presentacion, p.precio_venta,
            p.categoria_id, c.nombre AS categoria, (p.stock > 0) AS disponible
     FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE ${where.join(' AND ')}
     ORDER BY (p.stock > 0) DESC, p.nombre`,
    params,
  );
  res.json(rows);
}

export async function categoriasTienda(req, res) {
  const [rows] = await pool.query(
    `SELECT c.id, c.nombre, COUNT(p.id) AS productos FROM categorias c
     JOIN productos p ON p.categoria_id = c.id AND ${WHERE_TIENDA}
     GROUP BY c.id ORDER BY c.nombre`,
  );
  res.json(rows);
}
