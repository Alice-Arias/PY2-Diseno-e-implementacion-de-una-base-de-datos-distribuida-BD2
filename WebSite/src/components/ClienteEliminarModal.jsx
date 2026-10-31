/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Modal para eliminar un cliente (ClienteEliminarModal)
*
* DESCRIPCION: Componente que muestra una ventana modal para confirmar y ejecutar la
* eliminacion de un cliente. Maneja cuatro estados: confirmar (pregunta si desea
* eliminar el cliente y muestra su nombre con un boton para ver el detalle), eliminando
* (los botones se deshabilitan mientras se procesa), exito (informa que el cliente se
* elimino correctamente) y error (muestra el mensaje devuelto por el backend y permite
* volver a intentar). Desde el estado de confirmacion se puede abrir el modal de detalle
* del cliente encima de este; para ello se piden a la API los datos completos del
* cliente, en lugar de reutilizar el objeto resumido que llega de la lista.
*
* ENTRADA: cliente - objeto del cliente a eliminar. Debe incluir los campos CustomerID y
* Nombre_Cliente. Si es null o undefined el componente no muestra nada.
* onCerrar - funcion que cierra el modal. Se ejecuta al cancelar, al hacer clic en el
* fondo o al cerrar el mensaje de error.
* onEliminado - funcion del componente padre (opcional) que se ejecuta despues de una
* eliminacion exitosa y recibe el CustomerID del cliente eliminado.
* Tambien usa las funciones eliminarCliente y obtenerDetalleClientes del servicio api.
*
* SALIDA: Elemento JSX con el modal correspondiente al estado actual, o null si no hay
* cliente.
*
* RESTRICCIONES: Requiere que el servicio api este disponible, que exista el componente
* ClienteDetalleModal y que existan los estilos de las clases modal-fondo,
* modal-confirmacion, confirmacion-icono, confirmacion-cliente-tarjeta,
* confirmacion-cliente-info, confirmacion-cliente-avatar, confirmacion-cliente-nombre,
* btn-ojo, confirmacion-botones, btn-cancelar, btn-eliminar, mensaje-modal, exito, error,
* mensaje-icono y btn-aceptar. El Hook useState se declara antes del return anticipado
* que ocurre cuando cliente es null, por lo que se respeta el orden de los Hooks. Si
* falla la carga del detalle se pasa al estado de error y el mensaje se muestra con el
* titulo "No se puede eliminar", aunque la accion que fallo fue ver el detalle.
*
* OBJETIVO: Permitir eliminar un cliente de forma segura, pidiendo confirmacion y
* informando el resultado de la operacion.
*
*---------------------------------------------------------------------------------------*/

import {
    Trash2,
    Eye,
    User,
    CheckCircle2,
    XCircle
} from 'lucide-react';

import { useState } from 'react';

import {
    eliminarCliente,
    obtenerDetalleClientes
} from '../services/api';
import ClienteDetalleModal from './ClienteDetalleModal';


function ClienteEliminarModal({
    cliente,
    onCerrar,
    onEliminado
}) {

    // 'confirmar' | 'eliminando' | 'exito' | 'error'
    const [estado, setEstado] = useState('confirmar');

    // Mensaje de error devuelto por el backend, si lo hay.
    const [mensajeError, setMensajeError] = useState('');

    // Controla si el modal de detalle esta abierto encima de este.
    const [verDetalle, setVerDetalle] = useState(false);

    // Detalle COMPLETO del cliente (distinto del objeto "resumen"
    // que llega de la lista). Se pide recien al tocar el ojo.
    const [detalleCompleto, setDetalleCompleto] = useState(null);

    // Indica si el detalle todavia se esta cargando.
    const [cargandoDetalle, setCargandoDetalle] = useState(false);


    if (!cliente) {
        return null;
    }


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: confirmarEliminacion
    *
    * DESCRIPCION: Se ejecuta al presionar "Si, eliminar". Cambia el estado a eliminando,
    * elimina el cliente en la API mediante eliminarCliente usando su CustomerID y, si
    * todo sale bien, cambia el estado a exito. Si ocurre un error guarda el mensaje
    * devuelto (o un mensaje por defecto) y cambia el estado a error.
    *
    * ENTRADA: Ninguna (usa la propiedad cliente).
    *
    * SALIDA: Actualiza los estados estado y mensajeError.
    *
    * RESTRICCIONES: Requiere conexion con la API mediante eliminarCliente.
    *
    * OBJETIVO: Eliminar el cliente de la base de datos.
    *
    *-----------------------------------------------------------------------------------*/

    const confirmarEliminacion = async () => {

        setEstado('eliminando');

        try {

            await eliminarCliente(cliente.CustomerID);

            setEstado('exito');

        } catch (error) {

            console.error(error);

            setMensajeError(
                error.message ||
                'No se pudo eliminar el cliente.'
            );

            setEstado('error');

        }
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: cerrarConExito
    *
    * DESCRIPCION: Se ejecuta al cerrar el mensaje de exito (boton Entendido o clic en el
    * fondo). Si existe onEliminado lo ejecuta enviando el CustomerID del cliente
    * eliminado, para que el padre recargue la lista y cierre el modal.
    *
    * ENTRADA: Ninguna (usa la propiedad cliente).
    *
    * SALIDA: Ejecucion de onEliminado cuando esta definida.
    *
    * RESTRICCIONES: Debe usarse solo despues de una eliminacion exitosa.
    *
    * OBJETIVO: Avisar al componente padre que la eliminacion termino.
    *
    *-----------------------------------------------------------------------------------*/

    const cerrarConExito = async () => {

        if (onEliminado) {
            await onEliminado(cliente.CustomerID);
        }

    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: abrirDetalle
    *
    * DESCRIPCION: Se ejecuta al presionar "Ver detalle". Pide a la API los datos
    * completos del cliente mediante obtenerDetalleClientes, antes de mostrar el modal,
    * en vez de reutilizar el objeto resumido que trae la lista. La funcion devuelve un
    * arreglo porque puede pedir varios IDs a la vez. Mientras responde mantiene activo
    * el indicador cargandoDetalle. Si ocurre un error guarda un mensaje y cambia el
    * estado a error.
    *
    * ENTRADA: Ninguna (usa la propiedad cliente).
    *
    * SALIDA: Actualiza los estados cargandoDetalle, detalleCompleto, verDetalle,
    * mensajeError y estado.
    *
    * RESTRICCIONES: Requiere conexion con la API mediante obtenerDetalleClientes.
    *
    * OBJETIVO: Mostrar la informacion completa del cliente antes de confirmar su
    * eliminacion.
    *
    *-----------------------------------------------------------------------------------*/

    const abrirDetalle = async () => {

        setCargandoDetalle(true);

        try {

            const data = await obtenerDetalleClientes(
                cliente.CustomerID
            );

            // obtenerDetalleClientes devuelve un arreglo
            // (puede pedir varios IDs a la vez).
            setDetalleCompleto(data);
            setVerDetalle(true);

        } catch (error) {

            console.error(error);

            setMensajeError(
                'No se pudo cargar la información del cliente.'
            );
            setEstado('error');

        } finally {

            setCargandoDetalle(false);

        }

    };


    // ========================================================
    // ESTADO: CONFIRMAR / ELIMINANDO
    // Usa .modal-confirmacion, ya definido en tu CSS.
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

                        <h2>¿Desea eliminar este cliente?</h2>
                        <p>Esta acción no se puede deshacer.</p>

                        {/* Nombre del cliente + boton para ver el detalle */}
                        <div className="confirmacion-cliente-tarjeta">

                            <div className="confirmacion-cliente-info">

                                <span className="confirmacion-cliente-avatar">
                                    <User size={17} />
                                </span>

                                <span className="confirmacion-cliente-nombre">
                                    {cliente.Nombre_Cliente}
                                </span>

                            </div>

                            <button
                                type="button"
                                className="btn-ojo"
                                onClick={abrirDetalle}
                                disabled={cargandoDetalle}
                                title="Ver información del cliente"
                                aria-label="Ver información del cliente"
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

                    <ClienteDetalleModal
                        clientes={detalleCompleto}
                        onCerrar={() => setVerDetalle(false)}
                    />

                )}

            </>

        );

    }


    // ========================================================
    // ESTADO: EXITO
    // Usa .mensaje-modal.exito, ya definido en tu CSS.
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

                    <h2>Cliente eliminado</h2>
                    <p>
                        "{cliente.Nombre_Cliente}" se eliminó correctamente
                        y ya no aparecerá en la lista.
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


    // ========================================================
    // ESTADO: ERROR
    // Usa .mensaje-modal.error, ya definido en tu CSS.
    // ========================================================

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


export default ClienteEliminarModal;