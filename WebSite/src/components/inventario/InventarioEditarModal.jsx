/*---------------------------------------------------------------------------------------*
* NOMBRE: InventarioEditarModal.jsx
*
* DESCRIPCION: Ventana para modificar un producto. Carga su detalle, lo muestra en el
* formulario y envía los cambios. Si otro usuario lo modificó mientras tanto, la API
* lo rechaza (control de concurrencia con "Version") y se muestra el aviso.
*
* ENTRADA: inventario (fila de la tabla), onCerrar, onInventarioActualizado(respuesta)
*          y onMostrarMensaje(mensaje).
*
* SALIDA: La ventana con el formulario (o "Cargando..." mientras llega el detalle).
*
* OBJETIVO: Modificar productos existentes.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import ModalFormulario from '../common/ModalFormulario';
import ModalCargando from '../common/ModalCargando';
import InventarioFormulario from './InventarioFormulario';
import useUltimo from '../../hooks/useUltimo';
import useFormulario from '../../hooks/useFormulario';
import useOpcionesFormulario from '../../hooks/useOpcionesFormulario';
import { inventarioApi } from '../../services/inventarioApi';
import { FORMULARIO_VACIO, formularioDesdeDetalle, validarInventario, datosParaApi } from './formularioInventario';
import { OPCIONES_VACIAS } from './opcionesInventario';

function InventarioEditarModal({ inventario, onCerrar, onInventarioActualizado, onMostrarMensaje }) {
    const idProducto = inventario?.StockItemID;
    const { formulario, setFormulario, cambiarCampo } = useFormulario(FORMULARIO_VACIO);
    const { opciones, cargandoOpciones } = useOpcionesFormulario(inventarioApi.opciones, OPCIONES_VACIAS, onMostrarMensaje);
    const [cargandoProducto, setCargandoProducto] = useState(() => Boolean(idProducto));
    const [guardando, setGuardando] = useState(false);
    const avisarRef = useUltimo(onMostrarMensaje);
    const cerrarRef = useUltimo(onCerrar);

    /* Carga el detalle del producto y llena el formulario. */
    useEffect(() => {
        if (!idProducto) return undefined;
        let cancelado = false;

        inventarioApi.detalle(idProducto)
            .then((respuesta) => {
                const detalle = Array.isArray(respuesta) ? respuesta[0] : respuesta;
                if (!detalle) throw new Error('No se encontró la información del producto.');
                if (!cancelado) setFormulario(formularioDesdeDetalle(detalle));
            })
            .catch((error) => {
                console.error(error);
                if (cancelado) return;
                avisarRef.current?.({
                    tipo: 'error',
                    titulo: 'No se pudo cargar el producto',
                    mensaje: error.message || 'No fue posible obtener la información del producto.'
                });
                cerrarRef.current?.();
            })
            .finally(() => {
                if (!cancelado) setCargandoProducto(false);
            });

        return () => { cancelado = true; };
    }, [idProducto, setFormulario, avisarRef, cerrarRef]);

    const guardar = async (evento) => {
        evento.preventDefault();

        const error = validarInventario(formulario);
        if (error) {
            onMostrarMensaje?.({ tipo: 'error', titulo: 'Datos inválidos', mensaje: error });
            return;
        }

        setGuardando(true);
        try {
            await onInventarioActualizado(await inventarioApi.actualizar(idProducto, datosParaApi(formulario)));
        } catch (errorRecibido) {
            console.error(errorRecibido);
            onMostrarMensaje?.({
                tipo: 'error',
                titulo: 'No se puede actualizar el producto',
                mensaje: errorRecibido.message || 'Ocurrió un error al actualizar el producto.'
            });
        } finally {
            setGuardando(false);
        }
    };

    if (!inventario) return null;

    if (cargandoProducto) {
        return <ModalCargando texto="Cargando información del producto..." onCerrar={onCerrar} />;
    }

    return (
        <ModalFormulario
            icono={Pencil}
            titulo="Modificar producto"
            subtitulo="Actualice la información del producto seleccionado."
            textoGuardar="Guardar cambios"
            guardando={guardando}
            deshabilitarGuardar={cargandoOpciones}
            onGuardar={guardar}
            onCerrar={onCerrar}
        >
            <InventarioFormulario
                formulario={formulario}
                onCambiar={cambiarCampo}
                opciones={opciones}
                cargandoOpciones={cargandoOpciones}
                idInventario={idProducto}
            />
        </ModalFormulario>
    );
}

export default InventarioEditarModal;
