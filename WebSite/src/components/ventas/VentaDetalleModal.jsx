/*---------------------------------------------------------------------------------------*
* NOMBRE: VentaDetalleModal.jsx
*
* DESCRIPCION: Ventana con el detalle de una factura: cliente, vendedor, datos de la
* factura y sus líneas. El nombre del cliente y cada producto son enlaces que abren
* su propio detalle encima.
*
* ENTRADA: venta ({ encabezado, lineas } de la API) y onCerrar.
*
* SALIDA: La ventana, o nada si no hay venta.
*
* OBJETIVO: Consultar una factura completa.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { User, Truck, Loader2 } from 'lucide-react';
import { FaFileInvoiceDollar, FaClipboardList, FaTruck, FaBoxOpen } from 'react-icons/fa';
import InventarioDetalleModal from '../inventario/InventarioDetalleModal';
import ClienteDetalleModal from '../clientes/ClienteDetalleModal';
import { inventarioApi } from '../../services/inventarioApi';
import { clientesApi } from '../../services/catalogoApi';
import { formatoFecha, formatoMoneda } from '../../utils/formato';

/* Fila "etiqueta: valor" de la información de la factura. */
function Fila({ etiqueta, children }) {
    return (
        <div className="vta-fila">
            <span className="vta-etiqueta">{etiqueta}</span>
            <span className="vta-valor">{children}</span>
        </div>
    );
}

/* Enlace que ejecuta una acción en lugar de navegar. */
function Enlace({ clase, onClick, children }) {
    return (
        <a href="#" className={clase} onClick={(evento) => { evento.preventDefault(); onClick(); }}>
            {children}
        </a>
    );
}

function VentaDetalleModal({ venta, onCerrar }) {
    const [productoDetalle, setProductoDetalle] = useState(null);
    const [cargandoProducto, setCargandoProducto] = useState(false);
    const [clienteDetalle, setClienteDetalle] = useState(null);
    const [cargandoCliente, setCargandoCliente] = useState(false);

    if (!venta) return null;

    const { encabezado, lineas } = venta;

    const verProducto = async (idProducto) => {
        if (!idProducto || cargandoProducto) return;
        setCargandoProducto(true);
        try {
            setProductoDetalle(await inventarioApi.detalle(idProducto));
        } catch (error) {
            console.error(error);
        } finally {
            setCargandoProducto(false);
        }
    };

    const verCliente = async () => {
        if (cargandoCliente || !encabezado.CustomerID) return;
        setCargandoCliente(true);
        try {
            setClienteDetalle(await clientesApi.detalle(encabezado.CustomerID));
        } catch (error) {
            console.error(error);
            alert('Error al cargar el cliente: ' + error.message);
        } finally {
            setCargandoCliente(false);
        }
    };

    return (
        <>
            <div className="vta-overlay" onClick={onCerrar}>
                <div className="vta-modal" onClick={(evento) => evento.stopPropagation()}>
                    <button className="vta-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>

                    <header className="vta-encabezado vta-animar" style={{ animationDelay: '0s' }}>
                        <div className="vta-avatar"><FaFileInvoiceDollar /></div>
                        <div className="vta-titulo">
                            <h2>Factura #{encabezado.InvoiceID}</h2>
                            <p>{encabezado.Metodo_Entrega}</p>
                        </div>
                    </header>

                    <div className="vta-cajas vta-animar" style={{ animationDelay: '0.05s' }}>
                        <div className="vta-caja">
                            <div className="vta-caja-titulo">
                                <span className="vta-caja-ico"><User size={16} /></span>
                                Cliente
                            </div>
                            <Enlace clase="vta-caja-nombre vta-link-producto" onClick={verCliente}>
                                {cargandoCliente ? <Loader2 size={15} className="girando" /> : encabezado.Nombre_Cliente}
                            </Enlace>
                        </div>
                        <div className="vta-caja vta-caja-verde">
                            <div className="vta-caja-titulo">
                                <span className="vta-caja-ico verde"><Truck size={16} /></span>
                                Vendedor
                            </div>
                            <p className="vta-caja-nombre">{encabezado.Vendedor || '-'}</p>
                        </div>
                    </div>

                    <div className="vta-panel vta-animar" style={{ animationDelay: '0.1s' }}>
                        <h3 className="vta-panel-titulo">
                            <span className="vta-ico"><FaClipboardList /></span>
                            Información de la factura
                        </h3>
                        <Fila etiqueta="Método de entrega">{encabezado.Metodo_Entrega || '-'}</Fila>
                        <Fila etiqueta="Número de orden">{encabezado.Numero_Orden || '-'}</Fila>
                        <Fila etiqueta="Persona de contacto">{encabezado.Persona_Contacto || '-'}</Fila>
                        <Fila etiqueta="Fecha de la factura">{formatoFecha(encabezado.Fecha_Factura, 'long')}</Fila>
                        <div className="vta-direccion">
                            <span className="vta-ico verde"><FaTruck /></span>
                            <div>
                                <strong>Instrucciones de entrega</strong>
                                <p>{encabezado.Intrucciones_Entrega || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="vta-panel vta-animar" style={{ animationDelay: '0.18s' }}>
                        <h3 className="vta-panel-titulo">
                            <span className="vta-ico verde"><FaBoxOpen /></span>
                            Detalle de la factura
                        </h3>
                        <div className="vta-tabla-wrap">
                            <table className="vta-tabla">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Precio unitario</th>
                                        <th>Impuesto</th>
                                        <th>Monto impuesto</th>
                                        <th>Total línea</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!lineas || lineas.length === 0) && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center' }}>Esta factura no tiene líneas de detalle.</td>
                                        </tr>
                                    )}
                                    {lineas && lineas.map((linea, posicion) => (
                                        <tr key={posicion}>
                                            <td>
                                                <Enlace clase="vta-link-producto" onClick={() => verProducto(linea.StockItemID)}>
                                                    {linea.Producto}
                                                </Enlace>
                                            </td>
                                            <td>{linea.Cantidad}</td>
                                            <td>{formatoMoneda(linea.Precio_Unitario)}</td>
                                            <td>{linea.Impuesto_Aplicado}%</td>
                                            <td>{formatoMoneda(linea.Impuesto_Monto)}</td>
                                            <td>{formatoMoneda(linea.Total_Linea)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <InventarioDetalleModal registros={productoDetalle} onCerrar={() => setProductoDetalle(null)} />

            {clienteDetalle && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
                    <ClienteDetalleModal registros={clienteDetalle} onCerrar={() => setClienteDetalle(null)} />
                </div>
            )}
        </>
    );
}

export default VentaDetalleModal;
