/*---------------------------------------------------------------------------------------*
*
* NOMBRE: InventarioPage (CORREGIDO)
*
* CAMBIOS RESPECTO AL PROYECTO 1:
*   - La paginación la hace SQL Server. React solo pide "la página N" y muestra
*     lo que llega. Ya no se descargan todos los productos ni se usa .slice().
*   - Se eliminó la doble llamada al listar que se hacía al abrir la página.
*   - Las estadísticas (tarjetas) y la lista de grupos vienen de SP_Inventarios_Resumen.
*   - Un solo useEffect depende de [pagina, filtros, recarga]: cada vez que cambia
*     algo de eso se vuelve a consultar. Después de agregar/editar/eliminar se
*     incrementa "recarga" y la tabla se actualiza sola.
*   - Al crear un producto se filtra por su nombre para que se vea de inmediato.
*   - Se ignoran respuestas viejas (si el usuario cambia de página rápido).
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import { Package, Layers, CheckCircle2, Search, Plus, Sun, Eye } from 'lucide-react';

import InventariosTabla from '../components/inventario/InventariosTabla';
import InventarioDetalleModal from '../components/inventario/InventarioDetalleModal';
import InventarioNuevoModal from '../components/inventario/InventarioNuevoModal';
import InventarioEditarModal from '../components/inventario/InventarioEditarModal';
import InventarioEliminarModal from '../components/inventario/InventarioEliminarModal';
import StatCard from '../components/StatCard';

import {
    listarInventarios,
    obtenerResumenInventario,
    obtenerDetalleInventarios
} from '../services/api';

const POR_PAGINA = 10;
const FILTROS_VACIOS = { nombre: '', grupo: '' };

function InventariosPage() {

    // ============================================================
    // DATOS DE LA PÁGINA ACTUAL (vienen ya paginados desde SQL)
    // ============================================================
    const [inventarios, setInventarios] = useState([]);
    const [paginacion, setPaginacion] = useState({
        Total_Registros: 0,
        Pagina: 1,
        Total_Paginas: 1
    });

    // ============================================================
    // ESTADÍSTICAS (calculadas en SQL)
    // ============================================================
    const [resumen, setResumen] = useState({
        Total_Productos: 0,
        Total_Grupos: 0
    });
    const [grupos, setGrupos] = useState([]);

    // ============================================================
    // FILTROS
    // ============================================================
    // "nombreEscrito" es lo que hay en la caja de texto.
    // "filtros" son los filtros que REALMENTE se aplicaron (Enter / select).
    const [nombreEscrito, setNombreEscrito] = useState('');
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);

    const [pagina, setPagina] = useState(1);
    const [recarga, setRecarga] = useState(0);
    const [cargando, setCargando] = useState(false);

    // ============================================================
    // SELECCIÓN Y MODALES
    // ============================================================
    const [seleccionados, setSeleccionados] = useState([]);
    const [inventariosModal, setInventariosModal] = useState(null);
    const [mostrarNuevo, setMostrarNuevo] = useState(false);
    const [inventarioEditar, setInventarioEditar] = useState(null);
    const [inventarioEliminar, setInventarioEliminar] = useState(null);
    const [mensaje, setMensaje] = useState(null);

    // Identifica la última petición para descartar respuestas viejas.
    const ultimaPeticion = useRef(0);

    // ============================================================
    // CARGAR LA PÁGINA ACTUAL
    // Se ejecuta al abrir y cada vez que cambia la página, los filtros
    // o se pide una recarga (después de crear / editar / eliminar).
    // ============================================================
    useEffect(() => {
        const id = ++ultimaPeticion.current;
        setCargando(true);

        listarInventarios({ ...filtros, pagina, tamano: POR_PAGINA })
            .then(({ datos, paginacion: info }) => {
                if (id !== ultimaPeticion.current) return; // respuesta vieja
                setInventarios(datos);
                setPaginacion(info);

                // Si SQL ajustó la página (ej. se borró el único registro de
                // la última página), se sincroniza el número de página.
                if (info.Pagina !== pagina) {
                    setPagina(info.Pagina);
                }
            })
            .catch((err) => {
                if (id !== ultimaPeticion.current) return;
                console.error(err);
                setMensaje({
                    tipo: 'error',
                    titulo: 'Error',
                    mensaje: 'Ocurrió un error al buscar los productos.'
                });
            })
            .finally(() => {
                if (id === ultimaPeticion.current) setCargando(false);
            });
    }, [pagina, filtros, recarga]);

    // ============================================================
    // CARGAR ESTADÍSTICAS (al abrir y después de cada cambio)
    // ============================================================
    useEffect(() => {
        obtenerResumenInventario()
            .then(({ totales, grupos: lista }) => {
                setResumen(totales);
                setGrupos(lista);
            })
            .catch((err) => console.error(err));
    }, [recarga]);

    // ============================================================
    // FILTROS
    // ============================================================
    const aplicarFiltros = (cambios = {}) => {
        setFiltros((anterior) => ({ ...anterior, ...cambios }));
        setPagina(1);
        setSeleccionados([]);
    };

    const restaurarFiltros = () => {
        setNombreEscrito('');
        setFiltros(FILTROS_VACIOS);
        setPagina(1);
        setSeleccionados([]);
    };

    // ============================================================
    // SELECCIÓN Y DETALLE
    // ============================================================
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
            setMensaje({
                tipo: 'error',
                titulo: 'Error',
                mensaje: 'No se pudo cargar el detalle del producto.'
            });
        }
    };

    // ============================================================
    // DESPUÉS DE CREAR / ACTUALIZAR / ELIMINAR
    // ============================================================
    const recargar = () => {
        setSeleccionados([]);
        setRecarga((r) => r + 1);
    };

    const inventarioCreado = async (data) => {
        setMostrarNuevo(false);
        const nombreNuevo = data?.inventario?.Producto;

        if (nombreNuevo) {
            // Se filtra por el nombre del producto nuevo para que se vea de inmediato.
            setNombreEscrito(nombreNuevo);
            setFiltros({ nombre: nombreNuevo, grupo: '' });
            setPagina(1);
        }
        recargar();

        setMensaje({
            tipo: 'exito',
            titulo: 'Producto creado',
            mensaje: 'El producto se creó correctamente y se muestra en la tabla.'
        });
    };

    const inventarioActualizado = async () => {
        setInventarioEditar(null);
        recargar(); // se queda en la misma página y con los mismos filtros
        setMensaje({
            tipo: 'exito',
            titulo: 'Producto actualizado',
            mensaje: 'El producto se actualizó correctamente.'
        });
    };

    const inventarioEliminado = async () => {
        setInventarioEliminar(null);
        recargar();
        setMensaje({
            tipo: 'exito',
            titulo: 'Producto eliminado',
            mensaje: 'El producto se eliminó correctamente.'
        });
    };

    // ============================================================
    // BOTONES DE PÁGINA (solo cálculo visual, los datos vienen de SQL)
    // ============================================================
    const totalPaginas = paginacion.Total_Paginas || 1;
    const totalRegistros = paginacion.Total_Registros || 0;

    const numerosPagina = (() => {
        const maxBotones = 5;
        let inicio = Math.max(1, pagina - 2);
        let fin = Math.min(totalPaginas, inicio + maxBotones - 1);
        inicio = Math.max(1, fin - maxBotones + 1);
        return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
    })();

    const desde = totalRegistros === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
    const hasta = Math.min(pagina * POR_PAGINA, totalRegistros);

    const ahora = new Date();
    const fechaTexto = ahora.toLocaleDateString('es-CR', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
    const horaTexto = ahora.toLocaleTimeString('es-CR', {
        hour: '2-digit', minute: '2-digit', hour12: false
    });

    // ============================================================
    // INTERFAZ
    // ============================================================
    return (
        <div>
            <div className="page-header">
                <div className="title-block">
                    <div className="icon-box">
                        <Package size={22} />
                    </div>
                    <div>
                        <h1>Inventario</h1>
                        <p>Consulta y administra los productos registrados en Wide World Importers.</p>
                    </div>
                </div>
                <div className="header-right">
                    <span>{fechaTexto} | {horaTexto}</span>
                    <div className="sun-icon"><Sun size={16} /></div>
                </div>
            </div>

            <div className="stats-row">
                <StatCard icon={Package} color="blue" label="Total de productos" value={resumen.Total_Productos} />
                <StatCard icon={Layers} color="green" label="Grupos" value={resumen.Total_Grupos} />
                <StatCard icon={CheckCircle2} color="yellow" label="Resultados actuales" value={totalRegistros} />
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    aplicarFiltros({ nombre: nombreEscrito.trim() });
                                }
                            }}
                        />
                    </div>

                    <select
                        value={filtros.grupo}
                        onChange={(e) => aplicarFiltros({ grupo: e.target.value })}
                    >
                        <option value="">Todos los grupos</option>
                        {grupos.map((g) => (
                            <option key={g.ID} value={g.Nombre}>{g.Nombre}</option>
                        ))}
                    </select>

                    <button className="btn-restaurar" onClick={restaurarFiltros}>
                        Restaurar filtros
                    </button>

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

                {/* La tabla no se desmonta mientras carga: así la paginación
                    nunca "desaparece"; solo se atenúa. */}
                <div style={{ opacity: cargando ? 0.5 : 1, transition: 'opacity .15s' }}>
                    <InventariosTabla
                        inventarios={inventarios}
                        seleccionados={seleccionados}
                        onToggleSeleccion={toggleSeleccion}
                        onVerUno={abrirDetalle}
                        onEditar={setInventarioEditar}
                        onEliminar={setInventarioEliminar}
                    />
                </div>

                <div className="paginacion">
                    <span>
                        {cargando
                            ? 'Cargando...'
                            : `Mostrando ${desde} - ${hasta} de ${totalRegistros} resultados`}
                    </span>

                    <div className="paginas">
                        <button
                            disabled={pagina === 1 || cargando}
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                        >
                            ‹
                        </button>

                        {numerosPagina.map((n) => (
                            <button
                                key={n}
                                className={pagina === n ? 'activo' : ''}
                                disabled={cargando}
                                onClick={() => setPagina(n)}
                            >
                                {n}
                            </button>
                        ))}

                        <button
                            disabled={pagina >= totalPaginas || cargando}
                            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                        >
                            ›
                        </button>
                    </div>
                </div>
            </div>

            <InventarioDetalleModal
                inventarios={inventariosModal}
                onCerrar={() => setInventariosModal(null)}
            />

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
                        <button className="btn-aceptar" onClick={() => setMensaje(null)}>
                            Aceptar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InventariosPage;
