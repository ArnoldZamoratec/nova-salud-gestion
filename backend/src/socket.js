import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export function initSocket(httpServer, origin) {
  io = new Server(httpServer, { cors: { origin } });
  io.use((socket, next) => {
    try {
      socket.user = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('No autorizado'));
    }
  });
  return io;
}

/** Notifica a todos los clientes conectados que cambió el inventario. */
export function emitirCambioStock(productos = []) {
  io?.emit('stock:actualizado', { productos, at: Date.now() });
}
