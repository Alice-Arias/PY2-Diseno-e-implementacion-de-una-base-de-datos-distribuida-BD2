/*---------------------------------------------------------------------------------------*
* NOMBRE: VentaNuevoModal.jsx
*
* DESCRIPCION: Ventana para registrar una venta con un producto. Valida los datos y
* los envía a la API.
*
* ENTRADA: onCerrar, onVentaCreada(respuesta) y onMostrarMensaje(mensaje).
*
* SALIDA: La ventana con el formulario.
*
* OBJETIVO: Registrar ventas nuevas en la sucursal.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import ModalFormulario from '../common/ModalFormulario';
import VentasFormulario from './VentasFormulario';
import useFormulario from '../../hooks/useFormulario';
import useOpcionesFormulario from '../../hooks/useOpcionesFormulario';
import { ventasApi } from '../../services/ventasApi';
import { FORMULARIO_VACIO, validarVenta, datosParaApi } from './formularioVenta';
import { OPCIONES_VACIAS } from './opcionesVentas';

function VentaNuevoModal({ onCerrar, onVentaCreada, onMostrarMensaje }) {
    const { formulario, cambiarCampo } = useFormulario(FORMULARIO_VACIO);
    const { opciones, cargandoOpciones } = useOpcionesFormulario(ventasApi.opciones, OPCIONES_VACIAS, onMostrarMensaje);
    const [guardando, setGuardando] = useState(false);

    const guardar = async (evento) => {
        evento.preventDefault();

        const error = validarVenta(formulario);
        if (error) {
            onMostrarMensaje?.({ tipo: 'error', titulo: 'Datos inválidos', mensaje: error });
            return;
        }

        setGuardando(true);
        try {
            await onVentaCreada(await ventasApi.crear(datosParaApi(formulario)));
        } catch (errorRecibido) {
            console.error(errorRecibido);
            onMostrarMensaje?.({
                tipo: 'error',
                titulo: 'No se puede crear la venta',
                mensaje: errorRecibido.message || 'Ocurrió un error al crear la venta.'
            });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <ModalFormulario
            icono={ShoppingCart}
            titulo="Nueva venta"
            subtitulo="Complete la información para registrar una nueva venta."
            textoGuardar="Crear venta"
            guardando={guardando}
            deshabilitarGuardar={cargandoOpciones}
            onGuardar={guardar}
            onCerrar={onCerrar}
        >
            <VentasFormulario
                formulario={formulario}
                onCambiar={cambiarCampo}
                opciones={opciones}
                cargandoOpciones={cargandoOpciones}
            />
        </ModalFormulario>
    );
}

export default VentaNuevoModal;
