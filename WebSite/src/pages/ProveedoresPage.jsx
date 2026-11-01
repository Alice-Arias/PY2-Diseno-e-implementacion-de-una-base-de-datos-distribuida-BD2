/*---------------------------------------------------------------------------------------*
*
* NOMBRE: ProveedoresPage (CORREGIDO PY2)
*
* CAMBIOS:
*   - Paginación, orden y filtros en SQL (SP_Proveedores_Listar con @Pagina).
*   - Tarjetas y listas de filtros desde SP_Proveedores_Resumen (antes new Set()).
*   - Al crear un proveedor se filtra por su nombre para que aparezca de inmediato.
*   - Después de editar/eliminar se recarga la misma página con los mismos filtros.
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Truck, CheckCircle2, Tag, Search, Plus, Sun, Eye } from 'lucide-react';

import ProveedoresTabla from '../components/proveedores/ProveedoresTabla';
import ProveedorDetalleModal from '../components/proveedores/ProveedorDetalleModal';
import ProveedorNuevoModal from '../components/proveedores/ProveedorNuevoModal';
import ProveedorEditarModal from '../components/proveedores/ProveedorEditarModal';
import ProveedorEliminarModal from '../components/proveedores/ProveedorEliminarModal';
import StatCard from '../components/StatCard';
import Paginacion from '../components/Paginacion';
import useListadoServidor from '../hooks/useListadoServidor';

import {
    listarProveedores,
    obtenerResumenProveedores,
    obtenerDetalleProveedores,
    precargarOpciones,
    limpiarCacheOpciones
} from '../services/api';

const POR_PAGINA = 10;
const FILTROS_VACIOS = { nombre: '', categoria: '', metodoEntrega: '' };

function ProveedoresPage() {
    const listado = useListadoServidor(listarProveedores, {
        porPagina: POR_PAGINA,
        filtrosIniciales: FILTROS_VACIOS
    });

    const [nombreEscrito, setNombreEscrito] = useState('');
    const [resumen, setResumen] = useState({ totales: {}, categorias: [], metodos: [] });

    const [seleccionados, setSeleccionados] = useState([]);
    const [proveedoresModal, setProveedoresModal] = useState(null);
    const [mostrarNuevo, setMostrarNuevo] = useState(false);
    const [proveedorEditar, setProveedorEditar] = useState(null);
    const [proveedorEliminar, setProveedorEliminar] = useState(null);
    const [mensaje, setMensaje] = useState(null);
    const [recargaResumen, setRecargaResumen] = useState(0);

    // PY2: al abrir la página se cargan (una sola vez) las listas del formulario,
    // así Agregar / Modificar abren al instante.
    useEffect(() => {
        precargarOpciones('proveedores');
    }, []);

    // Estadísticas y listas de filtros (calculadas en SQL).
    useEffect(() => {
        obtenerResumenProveedores()
            .then(setResumen)
            .catch((err) => console.error(err));
    }, [recargaResumen]);

    useEffect(() => {
        if (listado.error) {
            setMensaje({ tipo: 'error', titulo: 'Error', mensaje: 'Ocurrió un error al buscar los proveedores.' });
        }
    }, [listado.error]);

    const filtrar = (cambios) => {
        setSeleccionados([]);
        listado.aplicarFiltros(cambios);
    };

    const restaurarFiltros = () => {
        setNombreEscrito('');
        setSeleccionados([]);
        listado.reemplazarFiltros(FILTROS_VACIOS);
    };

    const toggleSeleccion = (id) => {
        setSeleccionados((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const abrirDetalle = async (ids) => {
        try {
            setProveedoresModal(await obtenerDetalleProveedores(ids));
        } catch (err) {
            console.error(err);
            setMensaje({ tipo: 'error', titulo: 'Error', mensaje: 'No se pudo cargar el detalle del proveedor.' });
        }
    };

    const recargarTodo = () => {
        setSeleccionados([]);
        // Los datos cambiaron: se refrescan las listas del formulario en segundo plano.
        limpiarCacheOpciones();
        precargarOpciones('proveedores');
        listado.recargar();
        setRecargaResumen((r) => r + 1);
    };

    const proveedorCreado = async (data) => {
        setMostrarNuevo(false);
        const nombreNuevo = data?.proveedor?.Nombre;

        if (nombreNuevo) {
            setNombreEscrito(nombreNuevo);
            listado.reemplazarFiltros({ ...FILTROS_VACIOS, nombre: nombreNuevo });
        }
        recargarTodo();
        setMensaje({ tipo: 'exito', titulo: 'Proveedor creado', mensaje: 'El proveedor se creó correctamente y se muestra en la tabla.' });
    };

    const proveedorActualizado = async () => {
        setProveedorEditar(null);
        recargarTodo();
        setMensaje({ tipo: 'exito', titulo: 'Proveedor actualizado', mensaje: 'El proveedor se actualizó correctamente.' });
    };

    const proveedorEliminado = async () => {
        setProveedorEliminar(null);
        recargarTodo();
        setMensaje({ tipo: 'exito', titulo: 'Proveedor eliminado', mensaje: 'El proveedor se eliminó correctamente.' });
    };

    const ahora = new Date();
    const fechaTexto = ahora.toLocaleDateString('es-CR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const horaTexto = ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <div>
            <div className="page-header">
                <div className="title-block">
                    <div className="icon-box"><Truck size={22} /></div>
                    <div>
                        <h1>Proveedores</h1>
                        <p>Consulta y busca proveedores registrados en Wide World Importers.</p>
                    </div>
                </div>
                <div className="header-right">
                    <span>{fechaTexto} | {horaTexto}</span>
                    <div className="sun-icon"><Sun size={16} /></div>
                </div>
            </div>

            <div className="stats-row">
                <StatCard icon={Truck} color="blue" label="Total de proveedores" value={resumen.totales?.Total_Proveedores ?? 0} />
                <StatCard icon={Tag} color="green" label="Categorías" value={resumen.totales?.Total_Categorias ?? 0} />
                <StatCard icon={CheckCircle2} color="yellow" label="Resultados actuales" value={listado.paginacion.Total_Registros} />
            </div>

            <div className="table-card">
                <div className="toolbar">
                    <div className="search-box">
                        <Search size={16} />
                        <input
                            placeholder="Buscar por nombre... (Enter)"
                            value={nombreEscrito}
                            maxLength={100}
                            onChange={(e) => setNombreEscrito(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && filtrar({ nombre: nombreEscrito.trim() })}
                        />
                    </div>

                    <select
                        value={listado.filtros.categoria}
                        onChange={(e) => filtrar({ categoria: e.target.value })}
                    >
                        <option value="">Todas las categorías</option>
                        {resumen.categorias.map((c) => (
                            <option key={c.Nombre} value={c.Nombre}>{c.Nombre}</option>
                        ))}
                    </select>

                    <select
                        value={listado.filtros.metodoEntrega}
                        onChange={(e) => filtrar({ metodoEntrega: e.target.value })}
                    >
                        <option value="">Todos los métodos</option>
                        {resumen.metodos.map((m) => (
                            <option key={m.Nombre} value={m.Nombre}>{m.Nombre}</option>
                        ))}
                    </select>

                    <button className="btn-restaurar" onClick={restaurarFiltros}>Restaurar filtros</button>

                    <button
                        className="btn-filtros"
                        disabled={seleccionados.length === 0}
                        onClick={() => abrirDetalle(seleccionados)}
                        style={{
                            opacity: seleccionados.length === 0 ? 0.5 : 1,
                            cursor: seleccionados.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Eye size={16} />
                        Ver seleccionados ({seleccionados.length})
                    </button>

                    <button className="btn-nuevo" onClick={() => setMostrarNuevo(true)}>
                        <Plus size={16} />
                        Nuevo Proveedor
                    </button>
                </div>

                <div style={{ opacity: listado.cargando ? 0.5 : 1, transition: 'opacity .15s' }}>
                    <ProveedoresTabla
                        proveedores={listado.filas}
                        seleccionados={seleccionados}
                        onToggleSeleccion={toggleSeleccion}
                        onVerUno={abrirDetalle}
                        onEditar={setProveedorEditar}
                        onEliminar={setProveedorEliminar}
                    />
                </div>

                <Paginacion
                    pagina={listado.pagina}
                    totalPaginas={listado.paginacion.Total_Paginas}
                    totalRegistros={listado.paginacion.Total_Registros}
                    porPagina={POR_PAGINA}
                    cargando={listado.cargando}
                    onCambiar={listado.cambiarPagina}
                />
            </div>

            <ProveedorDetalleModal proveedores={proveedoresModal} onCerrar={() => setProveedoresModal(null)} />

            {mostrarNuevo && (
                <ProveedorNuevoModal
                    onCerrar={() => setMostrarNuevo(false)}
                    onProveedorCreado={proveedorCreado}
                    onMostrarMensaje={setMensaje}
                />
            )}

            {proveedorEditar && (
                <ProveedorEditarModal
                    proveedor={proveedorEditar}
                    onCerrar={() => setProveedorEditar(null)}
                    onProveedorActualizado={proveedorActualizado}
                    onMostrarMensaje={setMensaje}
                />
            )}

            {proveedorEliminar && (
                <ProveedorEliminarModal
                    proveedor={proveedorEliminar}
                    onCerrar={() => setProveedorEliminar(null)}
                    onEliminado={proveedorEliminado}
                    onMostrarMensaje={setMensaje}
                />
            )}

            {mensaje && (
                <div className="modal-overlay">
                    <div className={`mensaje-modal ${mensaje.tipo}`}>
                        <h2>{mensaje.titulo}</h2>
                        <p>{mensaje.mensaje}</p>
                        <button className="btn-aceptar" onClick={() => setMensaje(null)}>Aceptar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProveedoresPage;
