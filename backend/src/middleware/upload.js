// Subida de imágenes de productos (multer)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { HttpError } from './errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const PRODUCTOS_DIR = path.join(UPLOADS_DIR, 'productos');
fs.mkdirSync(PRODUCTOS_DIR, { recursive: true });

const TIPOS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export const subirImagen = multer({
  storage: multer.diskStorage({
    destination: PRODUCTOS_DIR,
    // Nombre aleatorio: nunca se usa el nombre que envía el usuario
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + TIPOS[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    TIPOS[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Formato no permitido. Use JPG, PNG o WebP')),
}).single('imagen');

/** Ruta pública que se guarda en la BD para un archivo subido. */
export const rutaPublica = (filename) => `/uploads/productos/${filename}`;

/** Borra del disco una imagen guardada previamente (ignora si no existe). */
export function borrarImagen(rutaGuardada) {
  if (!rutaGuardada?.startsWith('/uploads/productos/')) return;
  const archivo = path.join(PRODUCTOS_DIR, path.basename(rutaGuardada));
  fs.promises.unlink(archivo).catch(() => {});
}
