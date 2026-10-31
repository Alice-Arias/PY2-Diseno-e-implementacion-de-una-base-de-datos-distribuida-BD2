
import { useState } from 'react';
import { User, Truck, Loader2 } from 'lucide-react';

import InventarioDetalleModal from '../inventario/InventarioDetalleModal';

import ClienteDetalleModal from '../ClienteDetalleModal';

import {
    obtenerDetalleInventarios,
    obtenerDetalleClientes
} from '../../services/api';

import './ventas.css';


function VentaDetalleModal({ venta, onCerrar }) {

    // Detalle del producto que se está viendo (null = cerrado)
    const [productoDetalle, setProductoDetalle] = useState(null);
    const [cargandoProducto, setCargandoProducto] = useState(false);

    // Detalle del cliente que se está viendo (null = cerrado)
    const [clienteDetalle, setClienteDetalle] = useState(null);
    const [cargandoCliente, setCargandoCliente] = useState(false);


    if (!venta) {
        return null;
    }

    const { encabezado: e, lineas } = venta;


    const formatearFecha = (fecha) => {

        if (!fecha) {
            return '-';
        }

        return new Date(fecha).toLocaleDateString('es-CR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatearMoneda = (valor) => {

        if (valor === null || valor === undefined) {
            return '-';
        }

        return Number(valor).toLocaleString('es-CR', {
            style: 'currency',
            currency: 'USD'
        });
    };


    // ========================================================
    // ABRIR EL DETALLE REAL DEL PRODUCTO
    // ========================================================

    const verProducto = async (stockItemId) => {

        if (!stockItemId || cargandoProducto) {
            return;
        }

        setCargandoProducto(true);

        try {

            const detalle = await obtenerDetalleInventarios(stockItemId);
            setProductoDetalle(detalle);

        } catch (error) {

            console.error(error);

        } finally {

            setCargandoProducto(false);

        }
    };


    // ========================================================
    // ABRIR EL DETALLE REAL DEL CLIENTE
    // ========================================================

    const verCliente = async () => {

        if (cargandoCliente) {
            return;
        }

        // Si esto salta, es casi seguro que falta volver a ejecutar
        // el SQL actualizado de SP_Ventas_Detalle (el que agrega
        // ca.CustomerID al SELECT del encabezado) contra tu base.
        if (!e.CustomerID) {

            console.warn(
                'CustomerID no llegó en el encabezado de la venta:',
                e
            );

            alert(
                'No se pudo abrir el cliente: falta el CustomerID.\n\n' +
                'Revisá que el SP_Ventas_Detalle actualizado (con ' +
                'ca.CustomerID en el SELECT) se haya ejecutado en tu ' +
                'base de datos.'
            );

            return;
        }

        setCargandoCliente(true);

        try {

            const detalle = await obtenerDetalleClientes(e.CustomerID);
            setClienteDetalle(detalle);

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

                <div
                    className="vta-modal"
                    onClick={(ev) => ev.stopPropagation()}
                >

                    <button
                        className="vta-cerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>

                    {/* ============================================
                        ENCABEZADO DE LA FACTURA
                    ============================================ */}

                    <header className="vta-encabezado vta-animar" style={{ animationDelay: '0s' }}>

                        <div className="vta-avatar">🧾</div>

                        <div className="vta-titulo">
                            <h2>Factura #{e.InvoiceID}</h2>
                            <p>{e.Metodo_Entrega}</p>
                        </div>

                    </header>

                    {/* ============================================
                        TARJETAS: CLIENTE Y VENDEDOR
                        (estilo prov-caja, con barra de color arriba)
                    ============================================ */}

                    <div className="vta-cajas vta-animar" style={{ animationDelay: '0.05s' }}>

                        <div className="vta-caja">

                            <div className="vta-caja-titulo">
                                <span className="vta-caja-ico">
                                    <User size={16} />
                                </span>
                                Cliente
                            </div>

                            <a
                                href="#"
                                className="vta-caja-nombre vta-link-producto"
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    verCliente();
                                }}
                            >
                                {cargandoCliente ? (
                                    <Loader2 size={15} className="girando" />
                                ) : (
                                    e.Nombre_Cliente
                                )}
                            </a>

                        </div>

                        <div className="vta-caja vta-caja-verde">

                            <div className="vta-caja-titulo">
                                <span className="vta-caja-ico verde">
                                    <Truck size={16} />
                                </span>
                                Vendedor
                            </div>

                            <p className="vta-caja-nombre">
                                {e.Vendedor || '-'}
                            </p>

                        </div>

                    </div>

                    {/* ============================================
                        INFORMACIÓN DE LA FACTURA
                    ============================================ */}

                    <div className="vta-panel vta-animar" style={{ animationDelay: '0.1s' }}>

                        <h3 className="vta-panel-titulo">
                            <span className="vta-ico">📋</span>
                            Información de la factura
                        </h3>

                        <div className="vta-fila">
                            <span className="vta-etiqueta">Método de entrega</span>
                            <span className="vta-valor">
                                {e.Metodo_Entrega || '-'}
                            </span>
                        </div>

                        <div className="vta-fila">
                            <span className="vta-etiqueta">Número de orden</span>
                            <span className="vta-valor">
                                {e.Numero_Orden || '-'}
                            </span>
                        </div>

                        <div className="vta-fila">
                            <span className="vta-etiqueta">Persona de contacto</span>
                            <span className="vta-valor">
                                {e.Persona_Contacto || '-'}
                            </span>
                        </div>

                        <div className="vta-fila">
                            <span className="vta-etiqueta">Fecha de la factura</span>
                            <span className="vta-valor">
                                {formatearFecha(e.Fecha_Factura)}
                            </span>
                        </div>

                        <div className="vta-direccion">
                            <span className="vta-ico verde">🚚</span>
                            <div>
                                <strong>Instrucciones de entrega</strong>
                                <p>{e.Intrucciones_Entrega || '-'}</p>
                            </div>
                        </div>

                    </div>

                    {/* ============================================
                        DETALLE DE LA FACTURA (líneas)
                    ============================================ */}

                    <div className="vta-panel vta-animar" style={{ animationDelay: '0.18s' }}>

                        <h3 className="vta-panel-titulo">
                            <span className="vta-ico verde">📦</span>
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
                                            <td colSpan={6} style={{ textAlign: 'center' }}>
                                                Esta factura no tiene líneas de detalle.
                                            </td>
                                        </tr>

                                    )}

                                    {lineas && lineas.map((linea, idx) => (

                                        <tr key={idx}>
                                            <td>
                                                <a
                                                    href="#"
                                                    className="vta-link-producto"
                                                    onClick={(ev) => {
                                                        ev.preventDefault();
                                                        verProducto(linea.StockItemID);
                                                    }}
                                                >
                                                    {linea.Producto}
                                                </a>
                                            </td>
                                            <td>{linea.Cantidad}</td>
                                            <td>{formatearMoneda(linea.Precio_Unitario)}</td>
                                            <td>{linea.Impuesto_Aplicado}%</td>
                                            <td>{formatearMoneda(linea.Impuesto_Monto)}</td>
                                            <td>{formatearMoneda(linea.Total_Linea)}</td>
                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </div>

            </div>

            <InventarioDetalleModal
                inventarios={productoDetalle}
                onCerrar={() => setProductoDetalle(null)}
            />


            {clienteDetalle && (

                <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>

                    <ClienteDetalleModal
                        clientes={clienteDetalle}
                        onCerrar={() => setClienteDetalle(null)}
                    />

                </div>

            )}

        </>

    );
}


export default VentaDetalleModal;