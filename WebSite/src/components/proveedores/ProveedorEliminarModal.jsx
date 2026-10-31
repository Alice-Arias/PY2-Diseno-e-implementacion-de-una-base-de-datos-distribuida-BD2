
import {
    Trash2,
    Eye,
    Truck,
    CheckCircle2,
    XCircle
} from 'lucide-react';

import { useState } from 'react';

import {
    eliminarProveedor,
    obtenerDetalleProveedores
} from '../../services/api';

import ProveedorDetalleModal from './ProveedorDetalleModal';


function ProveedorEliminarModal({
    proveedor,
    onCerrar,
    onEliminado
}) {

    // 'confirmar' | 'eliminando' | 'exito' | 'error'
    const [estado, setEstado] = useState('confirmar');

    // Mensaje de error devuelto por el backend.
    const [mensajeError, setMensajeError] = useState('');

    // Controla si el modal de detalle está abierto encima de este.
    const [verDetalle, setVerDetalle] = useState(false);

    // Detalle completo (arreglo) que espera ProveedorDetalleModal.
    const [detalleCompleto, setDetalleCompleto] = useState(null);

    const [cargandoDetalle, setCargandoDetalle] = useState(false);


    if (!proveedor) {
        return null;
    }


    // ========================================================
    // ELIMINAR PROVEEDOR
    // ========================================================

    const confirmarEliminacion = async () => {

        setEstado('eliminando');

        try {

            await eliminarProveedor(proveedor.SupplierID);

            setEstado('exito');

        } catch (error) {

            console.error(error);

            setMensajeError(
                error.message ||
                'No se pudo eliminar el proveedor.'
            );

            setEstado('error');

        }
    };


    // ========================================================
    // CERRAR DESPUÉS DE UN ÉXITO
    // ========================================================

    const cerrarConExito = async () => {

        if (onEliminado) {
            await onEliminado(proveedor.SupplierID);
        }

    };


    // ========================================================
    // ABRIR EL DETALLE COMPLETO
    // ========================================================

    const abrirDetalle = async () => {

        setCargandoDetalle(true);

        try {

            const data = await obtenerDetalleProveedores(
                proveedor.SupplierID
            );

            setDetalleCompleto(data);
            setVerDetalle(true);

        } catch (error) {

            console.error(error);

            setMensajeError(
                'No se pudo cargar la información del proveedor.'
            );

            setEstado('error');

        } finally {

            setCargandoDetalle(false);

        }

    };


    // ========================================================
    // ESTADO: CONFIRMAR / ELIMINANDO
    // ========================================================

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

                        <h2>¿Desea eliminar este proveedor?</h2>
                        <p>Esta acción no se puede deshacer.</p>

                        {/* Nombre del proveedor + botón para ver el detalle */}

                        <div className="confirmacion-cliente-tarjeta">

                            <div className="confirmacion-cliente-info">

                                <span className="confirmacion-cliente-avatar">
                                    <Truck size={17} />
                                </span>

                                <span className="confirmacion-cliente-nombre">
                                    {proveedor.Nombre_Proveedor}
                                </span>

                            </div>

                            <button
                                type="button"
                                className="btn-ojo"
                                onClick={abrirDetalle}
                                disabled={cargandoDetalle}
                                title="Ver información del proveedor"
                                aria-label="Ver información del proveedor"
                            >
                                <Eye size={16} />
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

                    <ProveedorDetalleModal
                        proveedores={detalleCompleto}
                        onCerrar={() => setVerDetalle(false)}
                    />

                )}

            </>

        );

    }


    // ========================================================
    // ESTADO: ÉXITO
    // ========================================================

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

                    <h2>Proveedor eliminado</h2>

                    <p>
                        "{proveedor.Nombre_Proveedor}" se eliminó
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

export default ProveedorEliminarModal;