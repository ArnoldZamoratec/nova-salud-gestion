import { fecha, soles } from '../api';

const METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', yape_plin: 'Yape / Plin' };

export default function Comprobante({ venta }) {
  return (
    <div className="ticket print-area">
      <div className="center">
        <strong>BOTICA NOVA SALUD</strong>
        <div className="small">Boleta de venta electrónica</div>
        <div className="small"><strong>{venta.numero}</strong></div>
        <div className="small">{fecha(venta.creado_en)}</div>
      </div>
      <hr />
      <div className="small">Cliente: {venta.cliente || 'Cliente varios'}</div>
      {venta.cliente_dni && <div className="small">DNI: {venta.cliente_dni}</div>}
      <div className="small">Atendido por: {venta.vendedor}</div>
      <hr />
      <table className="ticket-table">
        <tbody>
          {venta.items.map((i) => (
            <tr key={i.id}>
              <td>{i.cantidad} × {i.nombre}<br /><small>{soles(i.precio_unitario)}</small></td>
              <td className="right">{soles(i.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <div className="ticket-line"><span>Op. gravada</span><span>{soles(venta.subtotal)}</span></div>
      <div className="ticket-line"><span>IGV 18%</span><span>{soles(venta.igv)}</span></div>
      <div className="ticket-line total"><span>TOTAL</span><span>{soles(venta.total)}</span></div>
      <div className="ticket-line"><span>Pago</span><span>{METODO[venta.metodo_pago]}</span></div>
      {venta.metodo_pago === 'efectivo' && (
        <>
          <div className="ticket-line"><span>Recibido</span><span>{soles(venta.monto_recibido)}</span></div>
          <div className="ticket-line"><span>Vuelto</span><span>{soles(venta.vuelto)}</span></div>
        </>
      )}
      {venta.estado === 'anulada' && <div className="center tag tag-red">ANULADA</div>}
      <p className="center small">¡Gracias por su preferencia!</p>
    </div>
  );
}
