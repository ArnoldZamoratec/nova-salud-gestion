import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './socket.js';
import { pool } from './config/db.js';
import { UPLOADS_DIR } from './middleware/upload.js';

// Clave JWT por defecto: el proyecto funciona sin archivo .env
process.env.JWT_SECRET ||= 'nova_salud_clave_jwt_local';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const app = express();

app.use(helmet());
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

// Fotos de productos (públicas: se ven en la tienda)
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', dotfiles: 'deny', index: false }));
app.use('/api', routes);
app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server, CLIENT_URL);

const PORT = Number(process.env.PORT) || 4000;
try {
  await pool.query('SELECT 1');
  server.listen(PORT, () => console.log(`✔ API Nova Salud en http://localhost:${PORT}/api`));
} catch (err) {
  console.error('✖ No se pudo conectar a MySQL:', err.message);
  console.error('  Revise las variables DB_* en backend/.env y ejecute "npm run db:init".');
  process.exit(1);
}
