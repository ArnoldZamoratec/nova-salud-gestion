// Máximo de caracteres por campo (los mismos valores valida backend/src/validar.js).
export const MAX = {
  usuarioNombre: 50,
  email: 60,
  password: 30,
  categoria: 30,
  productoNombre: 60,
  descripcion: 200,
  laboratorio: 40,
  presentacion: 30,
  clienteNombre: 80,
  telefono: 9,
  codigoLote: 15,
  motivo: 100,
  busqueda: 50,
};

// Valores máximos de los campos numéricos.
export const NUM = {
  precio: 99999.99,
  cantidad: 99999,
  stockMinimo: 9999,
  montoRecibido: 99999,
};

/** Solo dígitos, como máximo `n`. */
export const digitos = (v, n) => String(v).replace(/\D/g, '').slice(0, n);

/** Número con hasta `enteros` dígitos y `decimales` decimales; descarta lo que sobre. */
export function numero(v, enteros, decimales = 0) {
  const [ent = '', dec] = String(v).replace(',', '.').split('.');
  const e = ent.replace(/\D/g, '').slice(0, enteros);
  if (!decimales || dec === undefined) return e;
  return `${e}.${dec.replace(/\D/g, '').slice(0, decimales)}`;
}
