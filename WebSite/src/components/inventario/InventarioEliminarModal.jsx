/*---------------------------------------------------------------------------------------*
* NOMBRE: InventarioEliminarModal.jsx
*
* DESCRIPCION: Confirmación para eliminar un producto. Tiene tres pasos:
*   confirmar  pregunta, con botón para ver el detalle del producto.
*   exito      el producto se eliminó.
*   error      no se pudo eliminar (ej. tiene ventas); permite volver a intentar.
*
* ENTRADA: inventario (fila de la tabla), onCerrar y onEliminado(id).
*
* SALIDA: La ventana del paso actual.
*
* OBJETIVO: Evitar eliminar un producto por accidente.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { Trash2, Eye, Package, CheckCircle2, XCircle } from 'lucide-react';
import InventarioDetalleModal from './InventarioDetalleModal';
import { inventarioApi } from '../../services/inventarioApi';

const detenerClic = (evento) => evento.stopPropagation();

function InventarioEliminarModal({ inventario, onCerrar, onEliminado }) {
    const [paso, setPaso] = useState('confirmar');   // confirmar | eliminando | exito | error
    const [mensajeError, setMensajeError] = useState('');
    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    if (!inventario) return null;

    const eliminando = paso === 'eliminando';

    const mostrarError = (texto) => {
        setMensajeError(texto);
        setPaso('error');
    };

    const eliminar = async () => {
        setPaso('eliminando');
        try {
            await inventarioApi.eliminar(inventario.StockItemID);
            setPaso('exito');
        } catch (error) {
            console.error(error);
            mostrarError(error.message || 'No se pudo eliminar el producto.');
        }
    };

    const verDetalle = async () => {
        setCargandoDetalle(true);
        try {
            setDetalle(await inventarioApi.detalle(inventario.StockItemID));
        } catch (error) {
            console.error(error);
            mostrarError('No se pudo cargar la información del producto.');
        } finally {
            setCargandoDetalle(false);
        }
    };

    const terminar = () => onEliminado?.(inventario.StockItemID);

    if (paso === 'exito') {
        return (
            <div className="modal-fondo" onClick={terminar}>
                <div className="mensaje-modal exito" onClick={detenerClic}>
                    <div className="mensaje-icono"><CheckCircle2 size={28} /></div>
                    <h2>Producto eliminado</h2>
                    <p>"{inventario.Producto}" se eliminó correctamente y ya no aparecerá en la lista.</p>
                    <button type="button" className="btn-aceptar" onClick={terminar}>Entendido</button>
                </div>
            </div>
        );
    }

    if (paso === 'error') {
        return (
            <div className="modal-fondo" onClick={onCerrar}>
                <div className="mensaje-modal error" onClick={detenerClic}>
                    <div className="mensaje-icono"><XCircle size={28} /></div>
                    <h2>No se puede eliminar</h2>
                    <p>{mensajeError}</p>
                    <div className="confirmacion-botones">
                        <button type="button" className="btn-cancelar" onClick={onCerrar}>Cerrar</button>
                        <button type="button" className="btn-aceptar" onClick={() => setPaso('confirmar')}>Volver a intentar</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="modal-fondo" onClick={onCerrar}>
                <div className="modal-confirmacion" onClick={detenerClic}>
                    <div className="confirmacion-icono"><Trash2 size={28} /></div>
                    <h2>¿Desea eliminar este producto?</h2>
                    <p>Esta acción no se puede deshacer.</p>

                    <div className="confirmacion-cliente-tarjeta">
                        <div className="confirmacion-cliente-info">
                            <span className="confirmacion-cliente-avatar"><Package size={17} /></span>
                            <span className="confirmacion-cliente-nombre">{inventario.Producto}</span>
                        </div>
                        <button type="button" className="btn-ojo" onClick={verDetalle} disabled={cargandoDetalle}
                                title="Ver información del producto" aria-label="Ver información del producto">
                            <Eye size={16} />
                            {cargandoDetalle ? 'Cargando...' : 'Ver detalle'}
                        </button>
                    </div>

                    <div className="confirmacion-botones">
                        <button type="button" className="btn-cancelar" onClick={onCerrar} disabled={eliminando}>No, cancelar</button>
                        <button type="button" className="btn-eliminar" onClick={eliminar} disabled={eliminando}>
                            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                        </button>
                    </div>
                </div>
            </div>

            {detalle && <InventarioDetalleModal registros={detalle} onCerrar={() => setDetalle(null)} />}
        </>
    );
}

export default InventarioEliminarModal;
