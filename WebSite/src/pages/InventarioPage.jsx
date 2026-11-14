/*---------------------------------------------------------------------------------------*
* NOMBRE: InventarioPage.jsx
*
* DESCRIPCION: Página de Inventario (rol Administrador): tarjetas de totales, buscador
* por nombre, filtro por grupo, tabla paginada y las ventanas para ver, crear,
* modificar y eliminar productos.
*
* ENTRADA: Ninguna.
*
* SALIDA: La página de Inventario.
*
* OBJETIVO: Consultar y administrar los productos.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Package, Layers, CheckCircle2, Plus } from 'lucide-react';
import EncabezadoPagina from '../components/common/EncabezadoPagina';
import StatCard from '../components/common/StatCard';
import BuscadorSugerencias from '../components/common/BuscadorSugerencias';
import BotonVerSeleccionados from '../components/common/BotonVerSeleccionados';
import Paginacion from '../components/common/Paginacion';
import VentanaMensaje from '../components/common/VentanaMensaje';
import InventariosTabla from '../components/inventario/InventariosTabla';
import InventarioDetalleModal from '../components/inventario/InventarioDetalleModal';
import InventarioNuevoModal from '../components/inventario/InventarioNuevoModal';
import InventarioEditarModal from '../components/inventario/InventarioEditarModal';
import InventarioEliminarModal from '../components/inventario/InventarioEliminarModal';
import useListadoServidor from '../hooks/useListadoServidor';
import useSeleccion from '../hooks/useSeleccion';
import { inventarioApi } from '../services/inventarioApi';
import { limpiarCacheOpciones } from '../services/cacheOpciones';

const POR_PAGINA = 10;
const FILTROS_VACIOS = { nombre: '', grupo: '' };

const mensajeExito = (titulo, mensaje) => ({ tipo: 'exito', titulo, mensaje });
const mensajeError = (mensaje) => ({ tipo: 'error', titulo: 'Error', mensaje });

/* Precarga las listas del formulario para que "Nuevo producto" abra rápido. */
const precargarOpciones = () => inventarioApi.opciones().catch(() => {});

function InventarioPage() {
    const [mensaje, setMensaje] = useState(null);
    const [nombreEscrito, setNombreEscrito] = useState('');
    const [resumen, setResumen] = useState({ totales: {}, grupos: [] });
    const [contadorResumen, setContadorResumen] = useState(0);
    const [productosDetalle, setProductosDetalle] = useState(null);
    const [mostrarNuevo, setMostrarNuevo] = useState(false);
    const [productoEditar, setProductoEditar] = useState(null);
    const [productoEliminar, setProductoEliminar] = useState(null);
    const seleccion = useSeleccion();

    const listado = useListadoServidor(inventarioApi.listar, {
        porPagina: POR_PAGINA,
        filtrosIniciales: FILTROS_VACIOS,
        alFallar: () => setMensaje(mensajeError('Ocurrió un error al buscar los productos.'))
    });

    useEffect(() => { precargarOpciones(); }, []);

    useEffect(() => {
        inventarioApi.resumen()
            .then(setResumen)
            .catch((error) => console.error(error));
    }, [contadorResumen]);

    const filtrar = (cambios) => {
        seleccion.limpiar();
        listado.aplicarFiltros(cambios);
    };

    const restaurarFiltros = () => {
        setNombreEscrito('');
        seleccion.limpiar();
        listado.reemplazarFiltros(FILTROS_VACIOS);
    };

    const abrirDetalle = async (ids) => {
        try {
            setProductosDetalle(await inventarioApi.detalle(ids));
        } catch (error) {
            console.error(error);
            setMensaje(mensajeError('No se pudo cargar el detalle del producto.'));
        }
    };

    /* Después de un cambio: tabla, tarjetas y listas de los formularios al día. */
    const recargarTodo = () => {
        seleccion.limpiar();
        limpiarCacheOpciones();
        precargarOpciones();
        listado.recargar();
        setContadorResumen((contador) => contador + 1);
    };

    const productoCreado = (respuesta) => {
        setMostrarNuevo(false);
        const nombreNuevo = respuesta?.inventario?.Producto;
        if (nombreNuevo) {
            setNombreEscrito(nombreNuevo);
            listado.reemplazarFiltros({ ...FILTROS_VACIOS, nombre: nombreNuevo });
        }
        recargarTodo();
        setMensaje(mensajeExito('Producto creado', 'El producto se creó correctamente y se muestra en la tabla.'));
    };

    const productoActualizado = () => {
        setProductoEditar(null);
        recargarTodo();
        setMensaje(mensajeExito('Producto actualizado', 'El producto se actualizó correctamente.'));
    };

    const productoEliminado = () => {
        setProductoEliminar(null);
        recargarTodo();
        setMensaje(mensajeExito('Producto eliminado', 'El producto se eliminó correctamente.'));
    };

    return (
        <div>
            <EncabezadoPagina
                icono={Package}
                titulo="Inventario"
                descripcion="Consulta y administra los productos registrados en Wide World Importers."
            />

            <div className="stats-row">
                <StatCard icon={Package} color="blue" label="Total de productos" value={resumen.totales?.Total_Productos ?? 0} />
                <StatCard icon={Layers} color="green" label="Grupos" value={resumen.totales?.Total_Grupos ?? 0} />
                <StatCard icon={CheckCircle2} color="yellow" label="Resultados actuales" value={listado.paginacion.Total_Registros} />
            </div>

            <div className="table-card">
                <div className="toolbar">
                    <BuscadorSugerencias
                        valor={nombreEscrito}
                        onCambiar={setNombreEscrito}
                        onBuscar={(texto) => filtrar({ nombre: texto })}
                        cargarSugerencias={inventarioApi.sugerir}
                        placeholder="Nombre del producto"
                        etiqueta="Buscar por nombre del producto"
                    />
                    <select value={listado.filtros.grupo} onChange={(evento) => filtrar({ grupo: evento.target.value })}>
                        <option value="">Grupos</option>
                        {resumen.grupos.map((grupo) => (
                            <option key={grupo.ID} value={grupo.Nombre}>{grupo.Nombre}</option>
                        ))}
                    </select>
                    <button className="btn-restaurar" onClick={restaurarFiltros}>Restaurar filtros</button>
                    <BotonVerSeleccionados
                        cantidad={seleccion.seleccionados.length}
                        onClick={() => abrirDetalle(seleccion.seleccionados)}
                    />
                    <button className="btn-nuevo" onClick={() => setMostrarNuevo(true)}>
                        <Plus size={16} />
                        Nuevo Producto
                    </button>
                </div>

                <div style={{ opacity: listado.cargando ? 0.5 : 1, transition: 'opacity .15s' }}>
                    <InventariosTabla
                        productos={listado.filas}
                        seleccionados={seleccion.seleccionados}
                        onAlternar={seleccion.alternar}
                        onVer={abrirDetalle}
                        onEditar={setProductoEditar}
                        onEliminar={setProductoEliminar}
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

            <InventarioDetalleModal registros={productosDetalle} onCerrar={() => setProductosDetalle(null)} />

            {mostrarNuevo && (
                <InventarioNuevoModal
                    onCerrar={() => setMostrarNuevo(false)}
                    onInventarioCreado={productoCreado}
                    onMostrarMensaje={setMensaje}
                />
            )}
            {productoEditar && (
                <InventarioEditarModal
                    inventario={productoEditar}
                    onCerrar={() => setProductoEditar(null)}
                    onInventarioActualizado={productoActualizado}
                    onMostrarMensaje={setMensaje}
                />
            )}
            {productoEliminar && (
                <InventarioEliminarModal
                    inventario={productoEliminar}
                    onCerrar={() => setProductoEliminar(null)}
                    onEliminado={productoEliminado}
                />
            )}

            <VentanaMensaje mensaje={mensaje} onCerrar={() => setMensaje(null)} />
        </div>
    );
}

export default InventarioPage;
