/*---------------------------------------------------------------------------------------*
*
* NOMBRE: InventariosPage (CORREGIDO PY2)
*
* CAMBIOS:
*   - Paginación, orden y filtros en SQL (SP_Inventarios_Listar con @Pagina).
*   - El producto nuevo ahora sí aparece: el SP crea también holdings y grupos.
*   - Tarjetas y lista de grupos desde SP_Inventarios_Resumen (antes new Set()).
*   - Al crear un producto se filtra por su nombre para que aparezca de inmediato.
*   - Después de editar/eliminar se recarga la misma página con los mismos filtros.
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import RelojTema from '../components/RelojTema';   // PY2: hora en vivo y tema
import { Package, Layers, CheckCircle2, Search, Plus, Sun, Eye } from 'lucide-react';

import InventariosTabla from '../components/inventario/InventariosTabla';
import InventarioDetalleModal from '../components/inventario/InventarioDetalleModal';
import InventarioNuevoModal from '../components/inventario/InventarioNuevoModal';
import InventarioEditarModal from '../components/inventario/InventarioEditarModal';
import InventarioEliminarModal from '../components/inventario/InventarioEliminarModal';
import StatCard from '../components/StatCard';
import Paginacion from '../components/Paginacion';
import useListadoServidor from '../hooks/useListadoServidor';

import {
    listarInventarios,
    obtenerResumenInventario,
    obtenerDetalleInventarios,
    precargarOpciones,
    limpiarCacheOpciones
} from '../services/api';

const POR_PAGINA = 10;
const FILTROS_VACIOS = { nombre: '', grupo: '' };

function InventariosPage() {
    const [mensaje, setMensaje] = useState(null);

    const listado = useListadoServidor(listarInventarios, {
        porPagina: POR_PAGINA,
        filtrosIniciales: FILTROS_VACIOS,
        alFallar: () =>
            setMensaje({ tipo: 'error', titulo: 'Error', mensaje: 'Ocurrió un error al buscar los productos.' })
    });

    const [nombreEscrito, setNombreEscrito] = useState('');
    const [resumen, setResumen] = useState({ totales: {}, grupos: [] });

    const [seleccionados, setSeleccionados] = useState([]);
    const [inventariosModal, setInventariosModal] = useState(null);
    const [mostrarNuevo, setMostrarNuevo] = useState(false);
    const [inventarioEditar, setInventarioEditar] = useState(null);
    const [inventarioEliminar, setInventarioEliminar] = useState(null);
    const [recargaResumen, setRecargaResumen] = useState(0);

    // PY2: al abrir la página se cargan (una sola vez) las listas del formulario,
    // así Agregar / Modificar abren al instante.
    useEffect(() => {
        precargarOpciones('inventario');
    }, []);

    // Estadísticas y listas de filtros (calculadas en SQL).
    useEffect(() => {
        obtenerResumenInventario()
            .then(setResumen)
            .catch((err) => console.error(err));
    }, [recargaResumen]);


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
            setInventariosModal(await obtenerDetalleInventarios(ids));
        } catch (err) {
            console.error(err);
            setMensaje({ tipo: 'error', titulo: 'Error', mensaje: 'No se pudo cargar el detalle del producto.' });
        }
    };

    const recargarTodo = () => {
        setSeleccionados([]);
        // Los datos cambiaron: se refrescan las listas del formulario en segundo plano.
        limpiarCacheOpciones();
        precargarOpciones('inventario');
        listado.recargar();
        setRecargaResumen((r) => r + 1);
    };

    const inventarioCreado = async (data) => {
        setMostrarNuevo(false);
        const nombreNuevo = data?.inventario?.Producto;

        if (nombreNuevo) {
            setNombreEscrito(nombreNuevo);
            listado.reemplazarFiltros({ ...FILTROS_VACIOS, nombre: nombreNuevo });
        }
        recargarTodo();
        setMensaje({ tipo: 'exito', titulo: 'Producto creado', mensaje: 'El producto se creó correctamente y se muestra en la tabla.' });
    };

    const inventarioActualizado = async () => {
        setInventarioEditar(null);
        recargarTodo();
        setMensaje({ tipo: 'exito', titulo: 'Producto actualizado', mensaje: 'El producto se actualizó correctamente.' });
    };

    const inventarioEliminado = async () => {
        setInventarioEliminar(null);
        recargarTodo();
        setMensaje({ tipo: 'exito', titulo: 'Producto eliminado', mensaje: 'El producto se eliminó correctamente.' });
    };

    const ahora = new Date();
    const fechaTexto = ahora.toLocaleDateString('es-CR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const horaTexto = ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <div>
            <div className="page-header">
                <div className="title-block">
                    <div className="icon-box"><Package size={22} /></div>
                    <div>
                        <h1>Inventario</h1>
                        <p>Consulta y administra los productos registrados en Wide World Importers.</p>
                    </div>
                </div>
                <div className="header-right">
                    <RelojTema />
                </div>
            </div>

            <div className="stats-row">
                <StatCard icon={Package} color="blue" label="Total de productos" value={resumen.totales?.Total_Productos ?? 0} />
                <StatCard icon={Layers} color="green" label="Grupos" value={resumen.totales?.Total_Grupos ?? 0} />
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
                        value={listado.filtros.grupo}
                        onChange={(e) => filtrar({ grupo: e.target.value })}
                    >
                        <option value="">Todos los grupos</option>
                        {resumen.grupos.map((g) => (
                            <option key={g.ID} value={g.Nombre}>{g.Nombre}</option>
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
                        Nuevo Producto
                    </button>
                </div>

                <div style={{ opacity: listado.cargando ? 0.5 : 1, transition: 'opacity .15s' }}>
                    <InventariosTabla
                        inventarios={listado.filas}
                        seleccionados={seleccionados}
                        onToggleSeleccion={toggleSeleccion}
                        onVerUno={abrirDetalle}
                        onEditar={setInventarioEditar}
                        onEliminar={setInventarioEliminar}
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

            <InventarioDetalleModal inventarios={inventariosModal} onCerrar={() => setInventariosModal(null)} />

            {mostrarNuevo && (
                <InventarioNuevoModal
                    onCerrar={() => setMostrarNuevo(false)}
                    onInventarioCreado={inventarioCreado}
                    onMostrarMensaje={setMensaje}
                />
            )}

            {inventarioEditar && (
                <InventarioEditarModal
                    inventario={inventarioEditar}
                    onCerrar={() => setInventarioEditar(null)}
                    onInventarioActualizado={inventarioActualizado}
                    onMostrarMensaje={setMensaje}
                />
            )}

            {inventarioEliminar && (
                <InventarioEliminarModal
                    inventario={inventarioEliminar}
                    onCerrar={() => setInventarioEliminar(null)}
                    onEliminado={inventarioEliminado}
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

export default InventariosPage;
