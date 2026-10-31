// ============================================================
// MODAL PARA EDITAR UN PROVEEDOR
// ============================================================

import { X, Pencil, Save, Loader2 } from 'lucide-react';

import { useEffect, useState } from 'react';

import {
    actualizarProveedor,
    obtenerOpcionesProveedores,
    obtenerDetalleProveedores
} from '../../services/api';

import ProveedorFormulario from './ProveedorFormulario';

import {
    FORMULARIO_VACIO,
    formularioDesdeDetalle,
    validarProveedor,
    armarDatos
} from './utilsProveedor';


function ProveedorEditarModal({
    proveedor,
    onCerrar,
    onProveedorActualizado,
    onMostrarMensaje
}) {

    // ========================================================
    // ESTADO
    // ========================================================

    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);

    const [opciones, setOpciones] = useState({
        categorias: [],
        contactos: [],
        metodosEntrega: [],
        ciudades: []
    });

    // true mientras llegan las listas de los select.
    const [cargandoOpciones, setCargandoOpciones] = useState(true);

    // true mientras llegan los datos completos del proveedor.
    const [cargandoProveedor, setCargandoProveedor] = useState(true);

    const [guardando, setGuardando] = useState(false);


    // ========================================================
    // CARGAR LAS LISTAS DE LOS SELECT
    // ========================================================

    useEffect(() => {

        const cargarOpciones = async () => {

            try {

                const data = await obtenerOpcionesProveedores();

                setOpciones({
                    categorias: data.categorias || [],
                    contactos: data.contactos || [],
                    metodosEntrega: data.metodosEntrega || [],
                    ciudades: data.ciudades || []
                });

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



    const supplierID = proveedor?.SupplierID;

    useEffect(() => {

        if (!supplierID) {
            setCargandoProveedor(false);
            return;
        }

        // Evita actualizar el estado si el modal se cerró
        // antes de que llegara la respuesta.
        let cancelado = false;

        const cargarProveedor = async () => {

            try {

                setCargandoProveedor(true);

                const data = await obtenerDetalleProveedores(supplierID);

                // El backend devuelve un arreglo.
                const detalle = Array.isArray(data) ? data[0] : data;

                if (!detalle) {
                    throw new Error(
                        'No se encontró la información del proveedor.'
                    );
                }

                if (!cancelado) {
                    setFormulario(formularioDesdeDetalle(detalle));
                }

            } catch (error) {

                console.error(error);

                if (!cancelado) {

                    if (onMostrarMensaje) {
                        onMostrarMensaje({
                            tipo: 'error',
                            titulo: 'No se pudo cargar el proveedor',
                            mensaje:
                                error.message ||
                                'No fue posible obtener la información del proveedor.'
                        });
                    }

                    // Sin datos no se puede editar: cerramos el modal.
                    onCerrar();
                }

            } finally {

                if (!cancelado) {
                    setCargandoProveedor(false);
                }

            }
        };

        cargarProveedor();

        return () => {
            cancelado = true;
        };


    }, [supplierID]);


    // ========================================================
    // CAMBIAR UN CAMPO
    // ========================================================

    const cambiarCampo = (e) => {

        const { name, value } = e.target;

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value
        }));

    };


    // ========================================================
    // GUARDAR CAMBIOS
    // ========================================================

    const guardarCambios = async (e) => {

        e.preventDefault();

        const error = validarProveedor(formulario);

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

            const data = await actualizarProveedor(
                supplierID,
                armarDatos(formulario)
            );

            await onProveedorActualizado(data);

        } catch (error) {

            console.error(error);

            if (onMostrarMensaje) {
                onMostrarMensaje({
                    tipo: 'error',
                    titulo: 'No se puede actualizar el proveedor',
                    mensaje:
                        error.message ||
                        'Ocurrió un error al actualizar el proveedor.'
                });
            }

        } finally {

            setGuardando(false);

        }

    };


    // ========================================================
    // CASOS ESPECIALES (después de los hooks)
    // ========================================================

    if (!proveedor) {
        return null;
    }

    if (cargandoProveedor) {

        return (

            <div className="modal-fondo" onClick={onCerrar}>

                <div
                    className="modal-contenido modal-cliente-form"
                    onClick={(e) => e.stopPropagation()}
                >

                    <div className="modal-cargando">

                        <Loader2 size={30} className="girando" />

                        <p>Cargando información del proveedor...</p>

                    </div>

                </div>

            </div>

        );

    }


    // ========================================================
    // RENDERIZADO
    // ========================================================

    return (

        <div className="modal-fondo" onClick={onCerrar}>

            <div
                className="modal-contenido modal-cliente-form"
                onClick={(e) => e.stopPropagation()}
            >

                {/* ENCABEZADO */}

                <header className="cd-encabezado">

                    <div className="cd-avatar">
                        <Pencil size={25} />
                    </div>

                    <div className="cd-titulo">

                        <h2>Modificar proveedor</h2>

                        <p className="cd-subtitulo">
                            Actualice la información del proveedor
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

                {/* FORMULARIO */}

                <form onSubmit={guardarCambios}>

                    <ProveedorFormulario
                        formulario={formulario}
                        onCambiar={cambiarCampo}
                        opciones={opciones}
                        cargandoOpciones={cargandoOpciones}
                        idProveedor={supplierID}
                        resaltar
                    />

                    {/* BOTONES */}

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

export default ProveedorEditarModal;