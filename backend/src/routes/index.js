import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ah } from '../middleware/errorHandler.js';
import { verificarToken, requiereRol } from '../middleware/auth.js';
import { subirImagen } from '../middleware/upload.js';
import * as auth from '../controllers/auth.controller.js';
import * as productos from '../controllers/productos.controller.js';
import * as cat from '../controllers/catalogos.controller.js';
import * as ventas from '../controllers/ventas.controller.js';
import * as reportes from '../controllers/reportes.controller.js';
import * as tienda from '../controllers/tienda.controller.js';
import * as lotes from '../controllers/lotes.controller.js';

const r = Router();
const admin = requiereRol('admin');

// Limita intentos de login (protección contra fuerza bruta)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { message: 'Demasiados intentos, espere unos minutos' } });

// ---------- Públicas ----------
r.post('/auth/login', loginLimiter, ah(auth.login));
r.get('/health', (req, res) => res.json({ ok: true }));

// Catálogo público (solo consulta)
r.get('/tienda/productos', ah(tienda.catalogo));
r.get('/tienda/categorias', ah(tienda.categoriasTienda));

// ---------- Protegidas (requieren iniciar sesión) ----------
r.use(verificarToken);
r.get('/auth/me', ah(auth.me));

r.get('/usuarios', admin, ah(auth.listarUsuarios));
r.post('/usuarios', admin, ah(auth.crearUsuario));
r.patch('/usuarios/:id/estado', admin, ah(auth.cambiarEstadoUsuario));

r.get('/productos', ah(productos.listar));
r.get('/productos/buscar', ah(productos.buscar));
r.get('/productos/:id', ah(productos.obtener));
r.post('/productos', admin, ah(productos.crear));
r.put('/productos/:id', admin, ah(productos.actualizar));
r.delete('/productos/:id', admin, ah(productos.eliminar));
r.post('/productos/:id/stock', admin, ah(productos.movimientoStock));
r.post('/productos/:id/imagen', admin, subirImagen, ah(productos.subirImagenProducto));
r.delete('/productos/:id/imagen', admin, ah(productos.quitarImagenProducto));
r.get('/movimientos', ah(productos.movimientos));

r.get('/lotes', ah(lotes.listar));
r.post('/lotes/:id/baja', admin, ah(lotes.baja));

r.get('/categorias', ah(cat.listarCategorias));
r.post('/categorias', admin, ah(cat.crearCategoria));

r.get('/clientes', ah(cat.listarClientes));
r.get('/clientes/dni/:dni', ah(cat.clientePorDni));
r.get('/clientes/:id/ventas', ah(cat.historialCliente));
r.post('/clientes', ah(cat.crearCliente));
r.put('/clientes/:id', ah(cat.actualizarCliente));

r.get('/ventas', ah(ventas.listar));
r.get('/ventas/:id', ah(ventas.obtener));
r.post('/ventas', ah(ventas.registrar));
r.post('/ventas/:id/anular', admin, ah(ventas.anular));

r.get('/alertas', ah(reportes.alertas));
r.get('/dashboard', ah(reportes.dashboard));

export default r;
