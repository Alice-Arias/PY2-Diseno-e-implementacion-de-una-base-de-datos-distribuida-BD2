
import {
    X,
    Pencil,
    Save,
    Loader2
} from 'lucide-react';

import { useEffect, useState } from 'react';

import {
    actualizarInventario,
    obtenerOpcionesInventario,
    obtenerDetalleInventarios
} from '../../services/api';

import InventarioFormulario from './InventarioFormulario';

import {
    FORMULARIO_VACIO,
    formularioDesdeDetalle,
    validarInventario,
    armarDatos
} from './utilsInventario';


function InventarioEditarModal({

    inventario,
    onCerrar,
    onInventarioActualizado,
    onMostrarMensaje

}) {


    const [formulario, setFormulario] = useState(
        FORMULARIO_VACIO
    );

    const [opciones, setOpciones] = useState({
        proveedores: [],
        colores: [],
        tiposPaquete: []
    });


    const [cargandoOpciones, setCargandoOpciones] =
        useState(true);


    const [cargandoInventario, setCargandoInventario] =
        useState(true);

    const [guardando, setGuardando] = useState(false);



    useEffect(() => {

        const cargarOpciones = async () => {

            try {

                const data =
                    await obtenerOpcionesInventario();

                setOpciones({

                    proveedores:
                        data.proveedores || [],

                    colores:
                        data.colores || [],

                    tiposPaquete:
                        data.tiposPaquete || []

                });

            } catch (error) {

                console.error(error);

                if (onMostrarMensaje) {

                    onMostrarMensaje({

                        tipo: 'error',

                        titulo:
                            'No se pudieron cargar las opciones',

                        mensaje: error.message

                    });

                }

            } finally {

                setCargandoOpciones(false);

            }

        };

        cargarOpciones();

    }, []);



    const stockItemID =
        inventario?.StockItemID;


    useEffect(() => {

        if (!stockItemID) {

            setCargandoInventario(false);

            return;

        }


 
        let cancelado = false;


        const cargarInventario = async () => {

            try {

                setCargandoInventario(true);


                const data =
                    await obtenerDetalleInventarios(
                        stockItemID
                    );


                const detalle =
                    Array.isArray(data)
                        ? data[0]
                        : data;


                if (!detalle) {

                    throw new Error(
                        'No se encontró la información del producto.'
                    );

                }


                if (!cancelado) {

                    setFormulario(
                        formularioDesdeDetalle(detalle)
                    );

                }

            } catch (error) {

                console.error(error);


                if (!cancelado) {

                    if (onMostrarMensaje) {

                        onMostrarMensaje({

                            tipo: 'error',

                            titulo:
                                'No se pudo cargar el producto',

                            mensaje:
                                error.message ||
                                'No fue posible obtener la información del producto.'

                        });

                    }


  
                    onCerrar();

                }

            } finally {

                if (!cancelado) {

                    setCargandoInventario(false);

                }

            }

        };


        cargarInventario();


        return () => {

            cancelado = true;

        };


  

    }, [stockItemID]);

    const cambiarCampo = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;


        setFormulario((anterior) => ({

            ...anterior,

            [name]:
                type === 'checkbox'
                    ? checked
                    : value

        }));

    };



    const guardarCambios = async (e) => {

        e.preventDefault();


        const error =
            validarInventario(formulario);


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

            const data =
                await actualizarInventario(

                    stockItemID,

                    armarDatos(formulario)

                );


            await onInventarioActualizado(data);


        } catch (error) {

            console.error(error);


            if (onMostrarMensaje) {

                onMostrarMensaje({

                    tipo: 'error',

                    titulo:
                        'No se puede actualizar el producto',

                    mensaje:
                        error.message ||
                        'Ocurrió un error al actualizar el producto.'

                });

            }

        } finally {

            setGuardando(false);

        }

    };


  
    if (!inventario) {

        return null;

    }


    if (cargandoInventario) {

        return (

            <div
                className="modal-fondo"
                onClick={onCerrar}
            >

                <div
                    className="modal-contenido modal-cliente-form"
                    onClick={(e) =>
                        e.stopPropagation()
                    }
                >

                    <div className="modal-cargando">

                        <Loader2
                            size={30}
                            className="girando"
                        />

                        <p>
                            Cargando información del producto...
                        </p>

                    </div>

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
                className="modal-contenido modal-cliente-form"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >

        
                <header className="cd-encabezado">

                    <div className="cd-avatar">

                        <Pencil size={25} />

                    </div>


                    <div className="cd-titulo">

                        <h2>
                            Modificar producto
                        </h2>

                        <p className="cd-subtitulo">

                            Actualice la información del producto
                            seleccionado.

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


              
                <form onSubmit={guardarCambios}>

                    <InventarioFormulario

                        formulario={formulario}

                        onCambiar={cambiarCampo}

                        opciones={opciones}

                        cargandoOpciones={
                            cargandoOpciones
                        }

                        idInventario={
                            stockItemID
                        }

                        resaltar

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
                            disabled={
                                guardando ||
                                cargandoOpciones
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

export default InventarioEditarModal;