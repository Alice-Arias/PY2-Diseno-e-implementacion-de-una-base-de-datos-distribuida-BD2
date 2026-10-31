
import { Eye, Pencil, Trash2 } from 'lucide-react';

import './ventas.css';


function VentasTabla({ ventas, onVerUna, onEditar, onEliminar }) {

    const formatearFecha = (fecha) => {

        if (!fecha) {
            return '-';
        }

        const d = new Date(fecha);

        return d.toLocaleDateString('es-CR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatearMonto = (monto) => {

        if (monto === null || monto === undefined) {
            return '-';
        }

        return Number(monto).toLocaleString('es-CR', {
            style: 'currency',
            currency: 'USD'
        });
    };


    return (

        <div className="vta-tabla-contenedor">

            <table className="vta-tabla">

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
                            <td colSpan={6} className="vta-vacio">
                                No se encontraron ventas con esos filtros.
                            </td>
                        </tr>

                    )}

                    {ventas.map((v) => (

                        <tr
                            key={v.InvoiceID}
                            onClick={() => onVerUna(v.InvoiceID)}
                            style={{ cursor: 'pointer' }}
                        >
                            <td>
                                <span className="vta-numero-factura">
                                    #{v.InvoiceID}
                                </span>
                            </td>
                            <td>{formatearFecha(v.Fecha_Factura)}</td>
                            <td>
                                <span className="vta-nombre-cliente">
                                    {v.Nombre_Cliente}
                                </span>
                            </td>
                            <td>{v.Metodo_Entrega}</td>
                            <td className="vta-centro">
                                <span className="vta-monto">
                                    {formatearMonto(v.Monto)}
                                </span>
                            </td>
                            <td className="vta-centro">

                                <div className="vta-acciones-fila">

                                    <button
                                        type="button"
                                        className="vta-accion vta-accion-ver"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onVerUna(v.InvoiceID);
                                        }}
                                        title="Ver detalle"
                                        aria-label="Ver detalle"
                                    >
                                        <Eye size={17} />
                                    </button>

                                    {onEditar && (
                                        <button
                                            type="button"
                                            className="vta-accion vta-accion-editar"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditar(v);
                                            }}
                                            title="Editar"
                                            aria-label="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    )}


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