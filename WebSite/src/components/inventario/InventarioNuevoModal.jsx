/*---------------------------------------------------------------------------------------*
* NOMBRE: InventarioNuevoModal.jsx
*
* DESCRIPCION: Ventana para crear un producto. Valida los datos y los envía a la API.
*
* ENTRADA: onCerrar, onInventarioCreado(respuesta) y onMostrarMensaje(mensaje).
*
* SALIDA: La ventana con el formulario.
*
* OBJETIVO: Registrar productos nuevos.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import ModalFormulario from '../common/ModalFormulario';
import InventarioFormulario from './InventarioFormulario';
import useFormulario from '../../hooks/useFormulario';
import useOpcionesFormulario from '../../hooks/useOpcionesFormulario';
import { inventarioApi } from '../../services/inventarioApi';
import { FORMULARIO_VACIO, validarInventario, datosParaApi } from './formularioInventario';
import { OPCIONES_VACIAS } from './opcionesInventario';

function InventarioNuevoModal({ onCerrar, onInventarioCreado, onMostrarMensaje }) {
    const { formulario, cambiarCampo } = useFormulario(FORMULARIO_VACIO);
    const { opciones, cargandoOpciones } = useOpcionesFormulario(inventarioApi.opciones, OPCIONES_VACIAS, onMostrarMensaje);
    const [guardando, setGuardando] = useState(false);

    const guardar = async (evento) => {
        evento.preventDefault();

        const error = validarInventario(formulario);
        if (error) {
            onMostrarMensaje?.({ tipo: 'error', titulo: 'Datos inválidos', mensaje: error });
            return;
        }

        setGuardando(true);
        try {
            await onInventarioCreado(await inventarioApi.crear(datosParaApi(formulario)));
        } catch (errorRecibido) {
            console.error(errorRecibido);
            onMostrarMensaje?.({
                tipo: 'error',
                titulo: 'No se puede crear el producto',
                mensaje: errorRecibido.message || 'Ocurrió un error al crear el producto.'
            });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <ModalFormulario
            icono={PackagePlus}
            titulo="Nuevo producto"
            subtitulo="Complete la información del producto, sus grupos y su inventario."
            textoGuardar="Guardar producto"
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
            />
        </ModalFormulario>
    );
}

export default InventarioNuevoModal;
