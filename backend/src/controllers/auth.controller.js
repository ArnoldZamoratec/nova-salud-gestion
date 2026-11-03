import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { MAX, texto } from '../validar.js';

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, 'Email y contraseña son obligatorios');

  const [[user]] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email]);
  // Mismo mensaje en ambos casos para no revelar qué emails existen
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Credenciales incorrectas');
  }
  const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  res.json({ token, user: payload });
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function listarUsuarios(req, res) {
  const [rows] = await pool.query('SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY id');
  res.json(rows);
}

export async function crearUsuario(req, res) {
  const { nombre, email, password, rol = 'farmaceutico' } = req.body || {};
  if (!nombre || !email || !password) throw new HttpError(400, 'Nombre, email y contraseña son obligatorios');
  texto(nombre, MAX.usuarioNombre, 'Nombre');
  texto(email, MAX.email, 'Email');
  if (String(password).length > MAX.password) throw new HttpError(400, `Contraseña: máximo ${MAX.password} caracteres`);
  if (password.length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
  if (!['admin', 'farmaceutico'].includes(rol)) throw new HttpError(400, 'Rol inválido');
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?,?,?,?)',
    [nombre.trim(), email.trim().toLowerCase(), hash, rol],
  );
  res.status(201).json({ id: r.insertId });
}

export async function cambiarEstadoUsuario(req, res) {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new HttpError(400, 'No puede desactivar su propio usuario');
  await pool.query('UPDATE usuarios SET activo = NOT activo WHERE id = ?', [id]);
  res.json({ ok: true });
}
