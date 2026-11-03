export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Envuelve handlers async para que los errores lleguen al middleware de errores. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      message: err.message.includes('uq_prod_nombre')
        ? 'Ya existe un producto con ese nombre y presentación.'
        : 'Ya existe un registro con ese valor único (DNI, email o RUC).',
    });
  }
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'La imagen no debe pesar más de 2 MB' });
  if (err.name === 'MulterError') return res.status(400).json({ message: 'Archivo inválido' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ message: 'No se puede eliminar: el registro está siendo usado.' });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? 'Error interno del servidor' : err.message });
}
