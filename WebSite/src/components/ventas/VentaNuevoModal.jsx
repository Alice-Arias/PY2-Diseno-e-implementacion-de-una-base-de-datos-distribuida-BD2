// ============================================================
// MODAL PARA CREAR UNA NUEVA VENTA
// ============================================================

import { X, ShoppingCart, Save, Loader2 } from 'lucide-react';

import { useEffect, useState } from 'react';

import {
    insertarVenta,
    obtenerOpcionesVentas
} from '../../services/api';

import VentasFormulario from './VentasFormulario';

import {
    FORMULARIO_VACIO,
    validarVenta,
    armarDatos
} from './utilsVentas';


function VentaNuevoModal({
    onCerrar,
    onVentaCreada,
    onMostrarMensaje
}) {

    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);

    const [opciones, setOpciones] = useState({
        clientes: [],
        metodosEntrega: [],
        contactos: [],
        vendedores: [],
        pedidos: [],
        productos: [],
        tiposPaquete: []
    });

    const [cargandoOpciones, setCargandoOpciones] = useState(true);
    const [guardando, setGuardando] = useState(false);


    useEffect(() => {

        const cargarOpciones = async () => {

            try {

                const data = await obtenerOpcionesVentas();
                setOpciones(data);

            } catch (error) {

                console.error(error);

                if (onMostrarMensaje) {
                    onMostrarMensaje({
                        tipo: 'error',
                        titulo: 'No se pudieron cargar las opciones',
                        mensaje: error.message
                    });
                }

            } finally {

                setCargandoOpciones(false);

            }
        };

        cargarOpciones();


    }, []);


    const cambiarCampo = (e) => {

        const { name, value } = e.target;

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value
        }));

    };


    const guardarVenta = async (e) => {

        e.preventDefault();

        const error = validarVenta(formulario);

        if (error) {

            if (onMostrarMensaje) {
                onMostrarMensaje({
                    tipo: 'error',
                    titulo: 'Datos inválidos',
                    mensaje: error
                });
            }

            return;
        }

        setGuardando(true);

        try {

            const data = await insertarVenta(armarDatos(formulario));

            await onVentaCreada(data);

        } catch (error) {

            console.error(error);

            if (onMostrarMensaje) {
                onMostrarMensaje({
                    tipo: 'error',
                    titulo: 'No se puede crear la venta',
                    mensaje:
                        error.message ||
                        'Ocurrió un error al crear la venta.'
                });
            }

        } finally {

            setGuardando(false);

        }

    };


    return (

        <div className="modal-fondo" onClick={onCerrar}>

            <div
                className="modal-contenido modal-cliente-form"
                onClick={(e) => e.stopPropagation()}
            >

                <header className="cd-encabezado">

                    <div className="cd-avatar">
                        <ShoppingCart size={25} />
                    </div>

                    <div className="cd-titulo">
                        <h2>Nueva venta</h2>
                        <p className="cd-subtitulo">
                            Complete la información para registrar
                            una nueva venta.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="modal-cerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        disabled={guardando}
                    >
                        <X size={22} />
                    </button>

                </header>

                <form onSubmit={guardarVenta}>

                    <VentasFormulario
                        formulario={formulario}
                        onCambiar={cambiarCampo}
                        opciones={opciones}
                        cargandoOpciones={cargandoOpciones}
                    />

                    <div className="modal-footer">

                        <button
                            type="button"
                            className="btn btn-claro"
                            onClick={onCerrar}
                            disabled={guardando}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="btn btn-azul"
                            disabled={guardando || cargandoOpciones}
                        >

                            {guardando ? (
                                <>
                                    <Loader2 size={17} className="girando" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={17} />
                                    Crear venta
                                </>
                            )}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );
}

export default VentaNuevoModal;