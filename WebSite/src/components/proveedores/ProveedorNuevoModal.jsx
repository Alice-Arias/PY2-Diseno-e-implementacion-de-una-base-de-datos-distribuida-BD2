// ============================================================
// MODAL PARA CREAR UN NUEVO PROVEEDOR
// ============================================================

import { X, Truck, Save, Loader2 } from 'lucide-react';

import { useEffect, useState } from 'react';


import {
    insertarProveedor,
    obtenerOpcionesProveedores
} from '../../services/api';


import ProveedorFormulario from './ProveedorFormulario';

import {
    FORMULARIO_VACIO,
    validarProveedor,
    armarDatos
} from './utilsProveedor';


function ProveedorNuevoModal({
    onCerrar,
    onProveedorCreado,
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

    const [cargandoOpciones, setCargandoOpciones] = useState(true);

    const [guardando, setGuardando] = useState(false);


 
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


    const cambiarCampo = (e) => {

        const { name, value } = e.target;

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value
        }));

    };


    const guardarProveedor = async (e) => {

        e.preventDefault();

        // Validamos antes de enviar.
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

            const data = await insertarProveedor(
                armarDatos(formulario)
            );

            // Avisamos a la página para que recargue la tabla.
            await onProveedorCreado(data);

        } catch (error) {

            console.error(error);

            if (onMostrarMensaje) {
                onMostrarMensaje({
                    tipo: 'error',
                    titulo: 'No se puede crear el proveedor',
                    mensaje:
                        error.message ||
                        'Ocurrió un error al crear el proveedor.'
                });
            }

        } finally {

            setGuardando(false);

        }

    };


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
                        <Truck size={25} />
                    </div>

                    <div className="cd-titulo">

                        <h2>Nuevo proveedor</h2>

                        <p className="cd-subtitulo">
                            Complete la información para registrar
                            un nuevo proveedor.
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

                <form onSubmit={guardarProveedor}>

                    <ProveedorFormulario
                        formulario={formulario}
                        onCambiar={cambiarCampo}
                        opciones={opciones}
                        cargandoOpciones={cargandoOpciones}
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
                                    Crear proveedor
                                </>

                            )}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );
}

export default ProveedorNuevoModal;