
import { X, Pencil, Save, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
    actualizarVenta,
    obtenerOpcionesVentas,
    obtenerDetalleVenta
} from '../../services/api';

import VentasFormulario from './VentasFormulario';

import {
    FORMULARIO_VACIO,
    formularioDesdeDetalle,
    formulariosDesdeDetalle,
    validarVenta,
    armarDatos
} from './utilsVentas';


function VentaEditarModal({
    venta,
    onCerrar,
    onVentaActualizada,
    onMostrarMensaje
}) {

    // ========================================================
    // DATOS GENERALES DE LA FACTURA
    // ========================================================

    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);


    const [lineas, setLineas] = useState([]);

    // ========================================================
    // OPCIONES PARA LOS SELECT
    // ========================================================

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
    const [cargandoVenta, setCargandoVenta] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const invoiceID = venta?.InvoiceID;


    // ========================================================
    // CARGAR LAS LISTAS DE LOS SELECT
    // ========================================================

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


    // ========================================================
    // CARGAR LOS DATOS COMPLETOS DE LA VENTA
    // ========================================================

    useEffect(() => {

        if (!invoiceID) {

            setCargandoVenta(false);

            return;

        }

        let cancelado = false;


        const cargarVenta = async () => {

            try {

                setCargandoVenta(true);


                const data = await obtenerDetalleVenta(invoiceID);


                // ------------------------------------------------
                // VALIDAR QUE EXISTA EL ENCABEZADO
                // ------------------------------------------------

                if (!data || !data.encabezado) {

                    throw new Error(
                        'No se encontró la información de la venta.'
                    );

                }


                // ------------------------------------------------
                // OBTENER TODAS LAS LÍNEAS
                // ------------------------------------------------

                const lineasFactura = data.lineas || [];


                if (lineasFactura.length === 0) {

                    throw new Error(
                        'La factura no contiene líneas de productos.'
                    );

                }


                if (!cancelado) {

 
                    setFormulario(
                        formularioDesdeDetalle(
                            data.encabezado,
                            lineasFactura[0]
                        )
                    );


                    // --------------------------------------------
                    // CARGAR TODAS LAS LÍNEAS DE PRODUCTOS
                    // --------------------------------------------

                    setLineas(
                        formulariosDesdeDetalle(
                            data.encabezado,
                            lineasFactura
                        )
                    );

                }

            } catch (error) {

                console.error(error);

                if (!cancelado) {

                    if (onMostrarMensaje) {

                        onMostrarMensaje({
                            tipo: 'error',
                            titulo: 'No se pudo cargar la venta',
                            mensaje:
                                error.message ||
                                'No fue posible obtener la información de la venta.'
                        });

                    }

                    onCerrar();

                }

            } finally {

                if (!cancelado) {

                    setCargandoVenta(false);

                }

            }

        };


        cargarVenta();


        return () => {

            cancelado = true;

        };

       
    }, [invoiceID]);


    // ========================================================
    // CAMBIAR UN CAMPO DEL ENCABEZADO
    // ========================================================

    const cambiarCampo = (e) => {

        const { name, value } = e.target;

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value
        }));

    };



    const cambiarCampoLinea = (indice, e) => {

        const { name, value } = e.target;

        setLineas((anteriores) =>
            anteriores.map((linea, i) => {

                if (i === indice) {

                    return {
                        ...linea,
                        [name]: value
                    };

                }

                return linea;

            })
        );

    };


    // ========================================================
    // GUARDAR CAMBIOS
    // ========================================================

    const guardarCambios = async (e) => {

        e.preventDefault();


        // ----------------------------------------------------
        // VALIDAR QUE EXISTA AL MENOS UNA LÍNEA
        // ----------------------------------------------------

        if (lineas.length === 0) {

            if (onMostrarMensaje) {

                onMostrarMensaje({
                    tipo: 'error',
                    titulo: 'No hay productos',
                    mensaje:
                        'La factura no contiene líneas de productos para actualizar.'
                });

            }

            return;

        }


        // ----------------------------------------------------
        // VALIDAR LOS DATOS GENERALES
        // ----------------------------------------------------

        const errorFormulario = validarVenta(formulario);


        if (errorFormulario) {

            if (onMostrarMensaje) {

                onMostrarMensaje({
                    tipo: 'error',
                    titulo: 'Datos inválidos',
                    mensaje: errorFormulario
                });

            }

            return;

        }


        // ----------------------------------------------------
        // VALIDAR CADA LÍNEA DE PRODUCTO
        // ----------------------------------------------------

        for (let i = 0; i < lineas.length; i++) {

            const errorLinea = validarVenta(lineas[i]);


            if (errorLinea) {

                if (onMostrarMensaje) {

                    onMostrarMensaje({
                        tipo: 'error',
                        titulo: `Datos inválidos en el producto ${i + 1}`,
                        mensaje: errorLinea
                    });

                }

                return;

            }

        }


        // ----------------------------------------------------
        // COMENZAR ACTUALIZACIÓN
        // ----------------------------------------------------

        setGuardando(true);


        try {

            let ultimaRespuesta = null;


            // ------------------------------------------------
            // ACTUALIZAR TODAS LAS LÍNEAS
            // ------------------------------------------------
            //
            // SP_Ventas_Actualizar trabaja con una línea por
            // llamada.
            //
            // Por eso recorremos todos los productos.
            //
            // NO se inventan productos.
            //
            // Cada línea conserva el StockItemID que devolvió
            // SP_Ventas_Detalle.
            //
            // ------------------------------------------------

            for (const linea of lineas) {

                const datos = armarDatos(linea);


                ultimaRespuesta = await actualizarVenta(
                    invoiceID,
                    datos
                );

            }


            // ------------------------------------------------
            // AVISAR QUE LA VENTA FUE ACTUALIZADA
            // ------------------------------------------------

            await onVentaActualizada(ultimaRespuesta);


        } catch (error) {

            console.error(error);

            if (onMostrarMensaje) {

                onMostrarMensaje({
                    tipo: 'error',
                    titulo: 'No se puede actualizar la venta',
                    mensaje:
                        error.message ||
                        'Ocurrió un error al actualizar la venta.'
                });

            }

        } finally {

            setGuardando(false);

        }

    };


    // ========================================================
    // SI NO HAY VENTA SELECCIONADA
    // ========================================================

    if (!venta) {

        return null;

    }


    // ========================================================
    // PANTALLA DE CARGA
    // ========================================================

    if (cargandoVenta) {

        return (

            <div
                className="modal-fondo"
                onClick={onCerrar}
            >

                <div
                    className="modal-contenido modal-cliente-form"
                    onClick={(e) => e.stopPropagation()}
                >

                    <div className="modal-cargando">

                        <Loader2
                            size={30}
                            className="girando"
                        />

                        <p>
                            Cargando información de la venta...
                        </p>

                    </div>

                </div>

            </div>

        );

    }


    // ========================================================
    // MODAL
    // ========================================================

    return (

        <div
            className="modal-fondo"
            onClick={onCerrar}
        >

            <div
                className="modal-contenido modal-cliente-form"
                onClick={(e) => e.stopPropagation()}
            >

                {/* ==================================================
                    ENCABEZADO
                    ================================================== */}

                <header className="cd-encabezado">

                    <div className="cd-avatar">

                        <Pencil size={25} />

                    </div>


                    <div className="cd-titulo">

                        <h2>
                            Modificar venta
                        </h2>

                        <p className="cd-subtitulo">

                            Actualice la información de la venta
                            seleccionada.

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


                {/* ==================================================
                    FORMULARIO
                    ================================================== */}

                <form onSubmit={guardarCambios}>

                    <VentasFormulario

                        formulario={formulario}

                        onCambiar={cambiarCampo}

                        opciones={opciones}

                        cargandoOpciones={cargandoOpciones}

                        idVenta={invoiceID}

                        lineas={lineas}

                        onCambiarLinea={cambiarCampoLinea}

                    />


                    {/* ==================================================
                        BOTONES
                        ================================================== */}

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
                            disabled={
                                guardando ||
                                cargandoOpciones ||
                                cargandoVenta ||
                                lineas.length === 0
                            }
                        >

                            {guardando ? (

                                <>

                                    <Loader2
                                        size={17}
                                        className="girando"
                                    />

                                    Guardando...

                                </>

                            ) : (

                                <>

                                    <Save size={17} />

                                    Guardar cambios

                                </>

                            )}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}


export default VentaEditarModal;