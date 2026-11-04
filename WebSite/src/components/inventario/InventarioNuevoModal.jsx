/*---------------------------------------------------------------------------------------*
*
* NOMBRE: InventarioNuevoModal (CORREGIDO PY2)
*
* CAMBIOS:
*   - Usa el mismo InventarioFormulario que el modal de edición (antes tenía su
*     propio formulario duplicado de más de 1000 líneas).
*   - Incluye grupos e inventario (holdings): sin esto el producto nuevo no
*     aparecía en la tabla.
*   - Usa validarInventario y armarDatos de utilsInventario.
*
*-----------------------------------------------------------------------------------------*/

import { X, PackagePlus, Save, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import useUltimo from '../../hooks/useUltimo';

import { insertarInventario, obtenerOpcionesInventario } from '../../services/api';
import InventarioFormulario from './InventarioFormulario';
import { FORMULARIO_VACIO, validarInventario, armarDatos } from './utilsInventario';

function InventarioNuevoModal({ onCerrar, onInventarioCreado, onMostrarMensaje }) {
    // Versión actual de onMostrarMensaje (ver hooks/useUltimo.js).
    const avisarRef = useUltimo(onMostrarMensaje);
    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
    const [opciones, setOpciones] = useState({ proveedores: [], colores: [], tiposPaquete: [], grupos: [] });
    const [cargandoOpciones, setCargandoOpciones] = useState(true);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        obtenerOpcionesInventario()
            .then((data) =>
                setOpciones({
                    proveedores: data.proveedores || [],
                    colores: data.colores || [],
                    tiposPaquete: data.tiposPaquete || [],
                    grupos: data.grupos || []
                })
            )
            .catch((error) => {
                console.error(error);
                avisarRef.current?.({
                    tipo: 'error',
                    titulo: 'No se pudieron cargar las opciones',
                    mensaje: error.message
                });
            })
            .finally(() => setCargandoOpciones(false));
    }, [avisarRef]);

    const cambiarCampo = (e) => {
        const { name, value, type, checked } = e.target;
        setFormulario((anterior) => ({
            ...anterior,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const guardarInventario = async (e) => {
        e.preventDefault();

        const error = validarInventario(formulario);
        if (error) {
            onMostrarMensaje?.({ tipo: 'error', titulo: 'Datos inválidos', mensaje: error });
            return;
        }

        setGuardando(true);
        try {
            const data = await insertarInventario(armarDatos(formulario));
            await onInventarioCreado(data);
        } catch (err) {
            console.error(err);
            onMostrarMensaje?.({
                tipo: 'error',
                titulo: 'No se puede crear el producto',
                mensaje: err.message || 'Ocurrió un error al crear el producto.'
            });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="modal-fondo" onClick={onCerrar}>
            <div className="modal-contenido modal-cliente-form" onClick={(e) => e.stopPropagation()}>
                <header className="cd-encabezado">
                    <div className="cd-avatar">
                        <PackagePlus size={25} />
                    </div>
                    <div className="cd-titulo">
                        <h2>Nuevo producto</h2>
                        <p className="cd-subtitulo">
                            Complete la información del producto, sus grupos y su inventario.
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

                <form onSubmit={guardarInventario}>
                    <InventarioFormulario
                        formulario={formulario}
                        onCambiar={cambiarCampo}
                        opciones={opciones}
                        cargandoOpciones={cargandoOpciones}
                        resaltar
                    />

                    <div className="modal-footer">
                        <button type="button" className="btn btn-claro" onClick={onCerrar} disabled={guardando}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-azul" disabled={guardando || cargandoOpciones}>
                            {guardando ? (
                                <>
                                    <Loader2 size={17} className="girando" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={17} />
                                    Guardar producto
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default InventarioNuevoModal;
