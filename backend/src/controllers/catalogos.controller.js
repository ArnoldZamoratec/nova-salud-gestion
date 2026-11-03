// Categorías y clientes
import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

// ---------- Categorías ----------
export async function listarCategorias(req, res) {
  const [rows] = await pool.query(
    `SELECT c.*, COUNT(p.id) AS productos FROM categorias c
     LEFT JOIN productos p ON p.categoria_id = c.id AND p.activo = 1
     GROUP BY c.id ORDER BY c.nombre`,
  );
  res.json(rows);
}

export async function crearCategoria(req, res) {
  const nombre = req.body?.nombre?.trim();
  if (!nombre) throw new HttpError(400, 'El nombre es obligatorio');
  const [r] = await pool.query('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
  res.status(201).json({ id: r.insertId, nombre });
}

// ---------- Clientes ----------
export async function listarClientes(req, res) {
  const q = req.query.q?.trim();
  const params = [];
  let where = '';
  if (q) {
    where = 'WHERE c.dni LIKE ? OR c.nombre LIKE ?';
    params.push(`%${q}%`, `%${q}%`);
  }
  const [rows] = await pool.query(
    `SELECT c.*, COUNT(v.id) AS compras, COALESCE(SUM(v.total),0) AS total_comprado, MAX(v.creado_en) AS ultima_compra
     FROM clientes c
     LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'completada'
     ${where} GROUP BY c.id ORDER BY c.nombre`,
    params,
  );
  res.json(rows);
}

export async function clientePorDni(req, res) {
  const [[row]] = await pool.query('SELECT * FROM clientes WHERE dni = ?', [req.params.dni]);
  if (!row) throw new HttpError(404, 'Cliente no registrado');
  res.json(row);
}

function datosCliente(b = {}) {
  if (!/^\d{8}$|^\d{11}$/.test(b.dni || '')) throw new HttpError(400, 'DNI (8 dígitos) o RUC (11 dígitos) inválido');
  if (!b.nombre?.trim()) throw new HttpError(400, 'El nombre es obligatorio');
  return { dni: b.dni, nombre: b.nombre.trim(), telefono: b.telefono || null, email: b.email || null };
}

export async function crearCliente(req, res) {
  const data = datosCliente(req.body);
  const [r] = await pool.query('INSERT INTO clientes SET ?', [data]);
  res.status(201).json({ id: r.insertId, ...data });
}

export async function actualizarCliente(req, res) {
  await pool.query('UPDATE clientes SET ? WHERE id = ?', [datosCliente(req.body), req.params.id]);
  res.json({ ok: true });
}

export async function historialCliente(req, res) {
  const [rows] = await pool.query(
    `SELECT id, numero, total, metodo_pago, estado, creado_en FROM ventas
     WHERE cliente_id = ? ORDER BY id DESC LIMIT 50`,
    [req.params.id],
  );
  res.json(rows);
}
