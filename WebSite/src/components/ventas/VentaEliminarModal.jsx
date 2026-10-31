
import {
    Trash2,
    Eye,
    Receipt,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react';

import { useState } from 'react';

import {
    eliminarVenta,
    obtenerDetalleVenta
} from '../../services/api';

import VentaDetalleModal from './VentaDetalleModal';


function VentaEliminarModal({
    venta,
    onCerrar,
    onEliminado
}) {

    const [estado, setEstado] = useState('confirmar');
    const [mensajeError, setMensajeError] = useState('');

    const [verDetalle, setVerDetalle] = useState(false);
    const [detalleCompleto, setDetalleCompleto] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);


    if (!venta) {
        return null;
    }


    const confirmarEliminacion = async () => {

        setEstado('eliminando');

        try {

            await eliminarVenta(venta.InvoiceID);
            setEstado('exito');

        } catch (error) {

            console.error(error);

            setMensajeError(
                error.message ||
                'No se pudo eliminar la venta.'
            );

            setEstado('error');

        }
    };


    const cerrarConExito = async () => {

        if (onEliminado) {
            await onEliminado(venta.InvoiceID);
        }

    };


    const abrirDetalle = async () => {

        setCargandoDetalle(true);

        try {

            const data = await obtenerDetalleVenta(venta.InvoiceID);
            setDetalleCompleto(data);
            setVerDetalle(true);

        } catch (error) {

            console.error(error);

            setMensajeError('No se pudo cargar la información de la venta.');
            setEstado('error');

        } finally {

            setCargandoDetalle(false);

        }

    };


    if (estado === 'confirmar' || estado === 'eliminando') {

        return (

            <>

                <div className="modal-fondo" onClick={onCerrar}>

                    <div
                        className="modal-confirmacion"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <div className="confirmacion-icono">
                            <Trash2 size={28} />
                        </div>

                        <h2>¿Desea eliminar esta venta?</h2>
                        <p>Esta acción no se puede deshacer.</p>

                        <div className="confirmacion-cliente-tarjeta">

                            <div className="confirmacion-cliente-info">

                                <span className="confirmacion-cliente-avatar">
                                    <Receipt size={17} />
                                </span>

                                <span className="confirmacion-cliente-nombre">
                                    Factura #{venta.InvoiceID} — {venta.Nombre_Cliente}
                                </span>

                            </div>

                            <button
                                type="button"
                                className="btn-ojo"
                                onClick={abrirDetalle}
                                disabled={cargandoDetalle}
                                title="Ver información de la venta"
                                aria-label="Ver información de la venta"
                            >
                                {cargandoDetalle ? (
                                    <Loader2 size={16} className="girando" />
                                ) : (
                                    <Eye size={16} />
                                )}
                                {cargandoDetalle ? 'Cargando...' : 'Ver detalle'}
                            </button>

                        </div>

                        <div className="confirmacion-botones">

                            <button
                                type="button"
                                className="btn-cancelar"
                                onClick={onCerrar}
                                disabled={estado === 'eliminando'}
                            >
                                No, cancelar
                            </button>

                            <button
                                type="button"
                                className="btn-eliminar"
                                onClick={confirmarEliminacion}
                                disabled={estado === 'eliminando'}
                            >
                                {estado === 'eliminando'
                                    ? 'Eliminando...'
                                    : 'Sí, eliminar'}
                            </button>

                        </div>

                    </div>

                </div>

                {verDetalle && detalleCompleto && (

                    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>

                        <VentaDetalleModal
                            venta={detalleCompleto}
                            onCerrar={() => setVerDetalle(false)}
                        />

                    </div>

                )}

            </>

        );

    }


    if (estado === 'exito') {

        return (

            <div className="modal-fondo" onClick={cerrarConExito}>

                <div
                    className="mensaje-modal exito"
                    onClick={(e) => e.stopPropagation()}
                >

                    <div className="mensaje-icono">
                        <CheckCircle2 size={28} />
                    </div>

                    <h2>Venta eliminada</h2>

                    <p>
                        La factura #{venta.InvoiceID} se eliminó
                        correctamente y ya no aparecerá en la lista.
                    </p>

                    <button
                        type="button"
                        className="btn-aceptar"
                        onClick={cerrarConExito}
                    >
                        Entendido
                    </button>

                </div>

            </div>

        );

    }


    return (

        <div className="modal-fondo" onClick={onCerrar}>

            <div
                className="mensaje-modal error"
                onClick={(e) => e.stopPropagation()}
            >

                <div className="mensaje-icono">
                    <XCircle size={28} />
                </div>

                <h2>No se puede eliminar</h2>

                <p>{mensajeError}</p>

                <div className="confirmacion-botones">

                    <button
                        type="button"
                        className="btn-cancelar"
                        onClick={onCerrar}
                    >
                        Cerrar
                    </button>

                    <button
                        type="button"
                        className="btn-aceptar"
                        onClick={() => setEstado('confirmar')}
                    >
                        Volver a intentar
                    </button>

                </div>

            </div>

        </div>

    );
}

export default VentaEliminarModal;