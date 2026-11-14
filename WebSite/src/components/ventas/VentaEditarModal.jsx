/*---------------------------------------------------------------------------------------*
* NOMBRE: VentaEditarModal.jsx
*
* DESCRIPCION: Ventana para modificar una venta. Carga la factura con todas sus líneas;
* al guardar, valida el encabezado y cada línea, y envía una actualización por línea
* (cada una con el encabezado de la factura).
*
* ENTRADA: venta (fila de la tabla), onCerrar, onVentaActualizada(respuesta) y
*          onMostrarMensaje(mensaje).
*
* SALIDA: La ventana con el formulario (o "Cargando..." mientras llega la factura).
*
* OBJETIVO: Corregir los datos de una venta registrada.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import ModalFormulario from '../common/ModalFormulario';
import ModalCargando from '../common/ModalCargando';
import VentasFormulario from './VentasFormulario';
import useUltimo from '../../hooks/useUltimo';
import useFormulario from '../../hooks/useFormulario';
import useOpcionesFormulario from '../../hooks/useOpcionesFormulario';
import { ventasApi } from '../../services/ventasApi';
import { FORMULARIO_VACIO, lineasDesdeDetalle, soloEncabezado, validarVenta, datosParaApi } from './formularioVenta';
import { OPCIONES_VACIAS } from './opcionesVentas';

function VentaEditarModal({ venta, onCerrar, onVentaActualizada, onMostrarMensaje }) {
    const numeroFactura = venta?.InvoiceID;
    const { formulario, setFormulario, cambiarCampo } = useFormulario(FORMULARIO_VACIO);
    const { opciones, cargandoOpciones } = useOpcionesFormulario(ventasApi.opciones, OPCIONES_VACIAS, onMostrarMensaje);
    const [lineas, setLineas] = useState([]);
    const [cargandoVenta, setCargandoVenta] = useState(() => Boolean(numeroFactura));
    const [guardando, setGuardando] = useState(false);
    const avisarRef = useUltimo(onMostrarMensaje);
    const cerrarRef = useUltimo(onCerrar);

    /* Carga la factura: el formulario toma el encabezado y la primera línea. */
    useEffect(() => {
        if (!numeroFactura) return undefined;
        let cancelado = false;

        ventasApi.detalle(numeroFactura)
            .then((factura) => {
                if (!factura?.encabezado) throw new Error('No se encontró la información de la venta.');
                const lineasFactura = factura.lineas || [];
                if (lineasFactura.length === 0) throw new Error('La factura no contiene líneas de productos.');
                if (cancelado) return;
                setFormulario(lineasDesdeDetalle(factura.encabezado, [lineasFactura[0]])[0]);
                setLineas(lineasDesdeDetalle(factura.encabezado, lineasFactura));
            })
            .catch((error) => {
                console.error(error);
                if (cancelado) return;
                avisarRef.current?.({
                    tipo: 'error',
                    titulo: 'No se pudo cargar la venta',
                    mensaje: error.message || 'No fue posible obtener la información de la venta.'
                });
                cerrarRef.current?.();
            })
            .finally(() => {
                if (!cancelado) setCargandoVenta(false);
            });

        return () => { cancelado = true; };
    }, [numeroFactura, setFormulario, avisarRef, cerrarRef]);

    const cambiarCampoLinea = (posicionLinea, evento) => {
        const { name, value } = evento.target;
        setLineas((actuales) => actuales.map((linea, posicion) => (posicion === posicionLinea ? { ...linea, [name]: value } : linea)));
    };

    const avisarError = (titulo, mensaje) => onMostrarMensaje?.({ tipo: 'error', titulo, mensaje });

    /* Primer error del formulario o de alguna línea (cada línea con el encabezado actual). */
    const buscarError = () => {
        if (lineas.length === 0) {
            return ['No hay productos', 'La factura no contiene líneas de productos para actualizar.'];
        }
        const errorEncabezado = validarVenta(formulario);
        if (errorEncabezado) return ['Datos inválidos', errorEncabezado];

        const encabezado = soloEncabezado(formulario);
        for (let posicion = 0; posicion < lineas.length; posicion++) {
            const errorLinea = validarVenta({ ...lineas[posicion], ...encabezado });
            if (errorLinea) return [`Datos inválidos en el producto ${posicion + 1}`, errorLinea];
        }
        return null;
    };

    const guardar = async (evento) => {
        evento.preventDefault();

        const error = buscarError();
        if (error) {
            avisarError(...error);
            return;
        }

        setGuardando(true);
        try {
            const encabezado = soloEncabezado(formulario);
            let ultimaRespuesta = null;
            for (const linea of lineas) {
                ultimaRespuesta = await ventasApi.actualizar(numeroFactura, datosParaApi({ ...linea, ...encabezado }));
            }
            await onVentaActualizada(ultimaRespuesta);
        } catch (errorRecibido) {
            console.error(errorRecibido);
            avisarError('No se puede actualizar la venta', errorRecibido.message || 'Ocurrió un error al actualizar la venta.');
        } finally {
            setGuardando(false);
        }
    };

    if (!venta) return null;

    if (cargandoVenta) {
        return <ModalCargando texto="Cargando información de la venta..." onCerrar={onCerrar} />;
    }

    return (
        <ModalFormulario
            icono={Pencil}
            titulo="Modificar venta"
            subtitulo="Actualice la información de la venta seleccionada."
            textoGuardar="Guardar cambios"
            guardando={guardando}
            deshabilitarGuardar={cargandoOpciones || cargandoVenta || lineas.length === 0}
            onGuardar={guardar}
            onCerrar={onCerrar}
        >
            <VentasFormulario
                formulario={formulario}
                onCambiar={cambiarCampo}
                opciones={opciones}
                cargandoOpciones={cargandoOpciones}
                idVenta={numeroFactura}
                lineas={lineas}
                onCambiarLinea={cambiarCampoLinea}
            />
        </ModalFormulario>
    );
}

export default VentaEditarModal;
