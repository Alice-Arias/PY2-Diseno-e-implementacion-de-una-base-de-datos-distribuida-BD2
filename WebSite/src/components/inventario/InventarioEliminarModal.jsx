
import {
    Trash2,
    Eye,
    Package,
    CheckCircle2,
    XCircle
} from 'lucide-react';

import { useState } from 'react';

import {
    eliminarInventario,
    obtenerDetalleInventarios
} from '../../services/api';

import InventarioDetalleModal from './InventarioDetalleModal';


function InventarioEliminarModal({

    inventario,
    onCerrar,
    onEliminado

}) {

    // 'confirmar' | 'eliminando' | 'exito' | 'error'
    const [estado, setEstado] = useState('confirmar');

    // Mensaje de error devuelto por el backend.
    const [mensajeError, setMensajeError] = useState('');

    // Controla si el modal de detalle está abierto encima de este.
    const [verDetalle, setVerDetalle] = useState(false);

    // Detalle completo que espera InventarioDetalleModal.
    const [detalleCompleto, setDetalleCompleto] = useState(null);

    const [cargandoDetalle, setCargandoDetalle] = useState(false);


    if (!inventario) {
        return null;
    }


    // ========================================================
    // ELIMINAR PRODUCTO
    // ========================================================

    const confirmarEliminacion = async () => {

        setEstado('eliminando');

        try {

            await eliminarInventario(
                inventario.StockItemID
            );

            setEstado('exito');

        } catch (error) {

            console.error(error);

            setMensajeError(
                error.message ||
                'No se pudo eliminar el producto.'
            );

            setEstado('error');

        }

    };


    const cerrarConExito = async () => {

        if (onEliminado) {

            await onEliminado(
                inventario.StockItemID
            );

        }

    };


 
    const abrirDetalle = async () => {

        setCargandoDetalle(true);

        try {

            const data = await obtenerDetalleInventarios(
                inventario.StockItemID
            );

            setDetalleCompleto(data);

            setVerDetalle(true);

        } catch (error) {

            console.error(error);

            setMensajeError(
                'No se pudo cargar la información del producto.'
            );

            setEstado('error');

        } finally {

            setCargandoDetalle(false);

        }

    };



    if (
        estado === 'confirmar' ||
        estado === 'eliminando'
    ) {

        return (

            <>

                <div
                    className="modal-fondo"
                    onClick={onCerrar}
                >

                    <div
                        className="modal-confirmacion"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <div className="confirmacion-icono">

                            <Trash2 size={28} />

                        </div>


                        <h2>
                            ¿Desea eliminar este producto?
                        </h2>


                        <p>
                            Esta acción no se puede deshacer.
                        </p>


                       

                        <div className="confirmacion-cliente-tarjeta">

                            <div className="confirmacion-cliente-info">

                                <span className="confirmacion-cliente-avatar">

                                    <Package size={17} />

                                </span>


                                <span className="confirmacion-cliente-nombre">

                                    {inventario.Producto}

                                </span>

                            </div>


                            <button
                                type="button"
                                className="btn-ojo"
                                onClick={abrirDetalle}
                                disabled={cargandoDetalle}
                                title="Ver información del producto"
                                aria-label="Ver información del producto"
                            >

                                <Eye size={16} />

                                {cargandoDetalle
                                    ? 'Cargando...'
                                    : 'Ver detalle'}

                            </button>

                        </div>


                        <div className="confirmacion-botones">

                            <button
                                type="button"
                                className="btn-cancelar"
                                onClick={onCerrar}
                                disabled={
                                    estado === 'eliminando'
                                }
                            >

                                No, cancelar

                            </button>


                            <button
                                type="button"
                                className="btn-eliminar"
                                onClick={confirmarEliminacion}
                                disabled={
                                    estado === 'eliminando'
                                }
                            >

                                {estado === 'eliminando'
                                    ? 'Eliminando...'
                                    : 'Sí, eliminar'}

                            </button>

                        </div>

                    </div>

                </div>


                {verDetalle && detalleCompleto && (

                    <InventarioDetalleModal
                        inventarios={detalleCompleto}
                        onCerrar={() =>
                            setVerDetalle(false)
                        }
                    />

                )}

            </>

        );

    }



    if (estado === 'exito') {

        return (

            <div
                className="modal-fondo"
                onClick={cerrarConExito}
            >

                <div
                    className="mensaje-modal exito"
                    onClick={(e) => e.stopPropagation()}
                >

                    <div className="mensaje-icono">

                        <CheckCircle2 size={28} />

                    </div>


                    <h2>
                        Producto eliminado
                    </h2>


                    <p>

                        "{inventario.Producto}" se eliminó
                        correctamente y ya no aparecerá
                        en la lista.

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

        <div
            className="modal-fondo"
            onClick={onCerrar}
        >

            <div
                className="mensaje-modal error"
                onClick={(e) => e.stopPropagation()}
            >

                <div className="mensaje-icono">

                    <XCircle size={28} />

                </div>


                <h2>
                    No se puede eliminar
                </h2>


                <p>
                    {mensajeError}
                </p>


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
                        onClick={() =>
                            setEstado('confirmar')
                        }
                    >

                        Volver a intentar

                    </button>

                </div>

            </div>

        </div>

    );

}

export default InventarioEliminarModal;