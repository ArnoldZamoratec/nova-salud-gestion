import jwt from 'jsonwebtoken';

/**
 * Responde un error descartando el cuerpo no leído (p. ej. un archivo subido).
 * Sin esto, rechazar una subida antes de leerla corta la conexión (ECONNRESET en proxies).
 */
export function rechazar(req, res, status, message) {
  const enviar = () => { if (!res.headersSent) res.status(status).json({ message }); };
  const tamano = Number(req.headers['content-length'] || 0);
  if (req.readableEnded || tamano === 0 || tamano > 5 * 1024 * 1024) {
    if (tamano > 0 && !req.readableEnded) res.set('Connection', 'close');
    return enviar();
  }
  req.on('end', enviar);
  req.on('error', enviar);
  req.resume();
}

export function verificarToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return rechazar(req, res, 401, 'Token requerido');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return rechazar(req, res, 401, 'Sesión inválida o expirada');
  }
}

export const requiereRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.rol)) return rechazar(req, res, 403, 'No tiene permisos para esta acción');
  next();
};
