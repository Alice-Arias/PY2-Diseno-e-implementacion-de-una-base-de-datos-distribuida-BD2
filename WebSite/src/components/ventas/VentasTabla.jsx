/*---------------------------------------------------------------------------------------*
* NOMBRE: VentasTabla.jsx
*
* DESCRIPCION: Tabla de ventas: número de factura, fecha, cliente, método de entrega,
* monto y los botones ver y modificar. Clic en una fila abre el detalle.
*
* ENTRADA: ventas, onVer(numeroFactura) y onEditar(venta).
*
* SALIDA: La tabla.
*
* OBJETIVO: Mostrar las ventas de la página actual.
*-----------------------------------------------------------------------------------------*/

import { Eye, Pencil } from 'lucide-react';
import { formatoFecha, formatoMoneda } from '../../utils/formato';

function VentasTabla({ ventas, onVer, onEditar }) {
    /* Los botones están dentro de la fila: se evita que el clic también abra el detalle. */
    const soloBoton = (accion) => (evento) => {
        evento.stopPropagation();
        accion();
    };

    return (
        <div className="vta-tabla-contenedor">
            <table className="vta-tabla tabla-coherente">
                <thead>
                    <tr>
                        <th>N.° Factura</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Método de entrega</th>
                        <th className="vta-centro">Monto</th>
                        <th className="vta-centro">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {ventas.length === 0 && (
                        <tr>
                            <td colSpan={6} className="vta-vacio">No se encontraron ventas con esos filtros.</td>
                        </tr>
                    )}
                    {ventas.map((venta) => (
                        <tr key={venta.InvoiceID} onClick={() => onVer(venta.InvoiceID)} style={{ cursor: 'pointer' }}>
                            <td><span className="vta-numero-factura">#{venta.InvoiceID}</span></td>
                            <td>{formatoFecha(venta.Fecha_Factura)}</td>
                            <td><span className="vta-nombre-cliente">{venta.Nombre_Cliente}</span></td>
                            <td>{venta.Metodo_Entrega}</td>
                            <td className="vta-centro"><span className="vta-monto">{formatoMoneda(venta.Monto)}</span></td>
                            <td className="vta-centro">
                                <div className="vta-acciones-fila">
                                    <button type="button" className="vta-accion vta-accion-ver" title="Ver detalle" aria-label="Ver detalle"
                                            onClick={soloBoton(() => onVer(venta.InvoiceID))}>
                                        <Eye size={17} />
                                    </button>
                                    <button type="button" className="vta-accion vta-accion-editar" title="Editar" aria-label="Editar"
                                            onClick={soloBoton(() => onEditar(venta))}>
                                        <Pencil size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default VentasTabla;
