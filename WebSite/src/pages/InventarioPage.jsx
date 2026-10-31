/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Pagina de inventario (InventariosPage)
*
* DESCRIPCION: Componente de pagina que gestiona los productos de inventario registrados
* en Wide World Importers. Carga y lista los productos, permite filtrarlos por nombre y
* grupo, seleccionarlos con checkbox, consultar el detalle de uno o varios productos, y
* crear, modificar y eliminar productos mediante modales. Calcula estadisticas, muestra
* los resultados en una tabla paginada de 10 registros por pagina y presenta mensajes de
* exito o error en un modal de notificacion.
*
* ENTRADA: Filtros ingresados por el usuario (nombre y grupo), acciones sobre la tabla
* (ver, editar, eliminar, seleccionar) y datos devueltos por las funciones
* listarInventarios y obtenerDetalleInventarios del servicio api.
*
* SALIDA: Interfaz con encabezado, tarjetas de estadisticas, barra de herramientas,
* tabla de productos con paginacion, modales de operaciones y mensajes de confirmacion
* o error.
*
* RESTRICCIONES: Requiere que el servicio api este disponible y que existan los
* componentes InventariosTabla, InventarioDetalleModal, InventarioNuevoModal,
* InventarioEditarModal, InventarioEliminarModal y StatCard en las rutas indicadas. Los
* productos deben incluir el campo Grupo (valores unidos por comas) para generar las
* opciones del filtro.
*
* OBJETIVO: Permitir consultar, crear, modificar y eliminar productos de inventario
* desde una unica pantalla, mostrando informacion resumida y actualizada.
*
*---------------------------------------------------------------------------------------*/

// ============================================================
// IMPORTACIONES DE REACT
// ============================================================

import { useEffect, useState } from 'react';


// ============================================================
// ICONOS
// ============================================================

import {
    Package,
    Layers,
    CheckCircle2,
    Search,
    Plus,
    Sun,
    Eye
} from 'lucide-react';


// ============================================================
// COMPONENTES
// ============================================================

import InventariosTabla from '../components/inventario/InventariosTabla';
import InventarioDetalleModal from '../components/inventario/InventarioDetalleModal';
import InventarioNuevoModal from '../components/inventario/InventarioNuevoModal';
import InventarioEditarModal from '../components/inventario/InventarioEditarModal';
import InventarioEliminarModal from '../components/inventario/InventarioEliminarModal';
import StatCard from '../components/StatCard';


// ============================================================
// FUNCIONES QUE SE COMUNICAN CON LA API
// ============================================================

import {
    listarInventarios,
    obtenerDetalleInventarios
} from '../services/api';


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: POR_PAGINA
*
* DESCRIPCION: Constante que define la cantidad maxima de productos que se muestran por
* pagina en la tabla.
*
* ENTRADA: Ninguna.
*
* SALIDA: Valor numerico 10.
*
* RESTRICCIONES: Debe ser un numero entero mayor que cero.
*
* OBJETIVO: Controlar el tamano de la paginacion de la tabla de inventario.
*
*---------------------------------------------------------------------------------------*/

const POR_PAGINA = 10;


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: InventariosPage
*
* DESCRIPCION: Componente principal de la pagina de inventario. Define los estados de la
* pantalla, las funciones de carga de datos, los manejadores de filtros, seleccion y
* modales, y los calculos de estadisticas y paginacion, y retorna la interfaz completa.
*
* ENTRADA: Ninguna (no recibe props).
*
* SALIDA: Elemento JSX con la pagina de inventario.
*
* RESTRICCIONES: Debe renderizarse dentro de la aplicacion con acceso a la API.
*
* OBJETIVO: Centralizar la gestion de productos de inventario en una sola vista.
*
*---------------------------------------------------------------------------------------*/

function InventariosPage() {

    // ============================================================
    // INVENTARIOS
    // ============================================================

    // Productos que actualmente se estan mostrando.
    const [inventarios, setInventarios] = useState([]);

    // Guarda todos los productos sin filtrar.
    //
    // Se utiliza para obtener los grupos disponibles
    // y para calcular las estadisticas.
    const [todosInventarios, setTodosInventarios] = useState([]);


    // ============================================================
    // FILTROS
    // ============================================================

    // Texto escrito en el filtro de nombre.
    const [nombre, setNombre] = useState('');

    // Grupo seleccionado.
    const [grupo, setGrupo] = useState('');


    // ============================================================
    // SELECCION DE PRODUCTOS
    // ============================================================

    // Guarda los StockItemID seleccionados.
    const [seleccionados, setSeleccionados] = useState([]);


    // ============================================================
    // MODAL DE DETALLE
    // ============================================================

    // Guarda los productos que se mostraran en el modal.
    //
    // null significa que el modal esta cerrado.
    const [inventariosModal, setInventariosModal] =
        useState(null);


    // ============================================================
    // ESTADO DE CARGA
    // ============================================================

    const [cargando, setCargando] = useState(false);


    // ============================================================
    // PAGINACION
    // ============================================================

    const [pagina, setPagina] = useState(1);


    // ============================================================
    // MODAL NUEVO INVENTARIO
    // ============================================================

    const [mostrarNuevo, setMostrarNuevo] = useState(false);


    // ============================================================
    // PRODUCTO PARA EDITAR
    // ============================================================

    const [inventarioEditar, setInventarioEditar] =
        useState(null);


    // ============================================================
    // PRODUCTO PARA ELIMINAR
    // ============================================================

    const [inventarioEliminar, setInventarioEliminar] =
        useState(null);


    // ============================================================
    // MENSAJES
    // ============================================================

    const [mensaje, setMensaje] = useState(null);


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: cargarInventarios
    *
    * DESCRIPCION: Consulta los productos a la API con los filtros recibidos, reinicia la
    * paginacion a la primera pagina y controla el indicador de carga. Si ocurre un error
    * muestra un mensaje de error.
    *
    * ENTRADA: filtros - objeto con los criterios de busqueda (por defecto vacio).
    *
    * SALIDA: Actualiza los estados inventarios, cargando, pagina y mensaje.
    *
    * RESTRICCIONES: Requiere conexion con la API mediante listarInventarios.
    *
    * OBJETIVO: Obtener y mostrar el listado de productos segun los filtros indicados.
    *
    *-----------------------------------------------------------------------------------*/

    const cargarInventarios = async (filtros = {}) => {

        setCargando(true);
        setPagina(1);

        try {

            const datos =
                await listarInventarios(filtros);

            setInventarios(datos);

        } catch (err) {

            console.error(err);

            setMensaje({
                tipo: 'error',
                titulo: 'Error',
                mensaje:
                    'Ocurrió un error al buscar los productos.'
            });

        } finally {

            setCargando(false);
        }
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: cargarTodosInventarios
    *
    * DESCRIPCION: Recarga la lista completa de productos sin filtros y actualiza tanto
    * la lista mostrada como la lista general. Se usa despues de insertar, modificar o
    * eliminar un producto. Si ocurre un error muestra un mensaje.
    *
    * ENTRADA: Ninguna.
    *
    * SALIDA: Actualiza los estados todosInventarios, inventarios, pagina y mensaje.
    *
    * RESTRICCIONES: Requiere conexion con la API mediante listarInventarios.
    *
    * OBJETIVO: Mantener la tabla y las estadisticas sincronizadas con los cambios.
    *
    *-----------------------------------------------------------------------------------*/

    const cargarTodosInventarios = async () => {

        try {

            const datos =
                await listarInventarios();

            setTodosInventarios(datos);
            setInventarios(datos);

            // Despues de actualizar la lista volvemos
            // a la primera pagina.
            setPagina(1);

        } catch (err) {

            console.error(err);

            setMensaje({
                tipo: 'error',
                titulo: 'Error',
                mensaje:
                    'No se pudieron cargar los productos.'
            });
        }
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: useEffect de carga inicial
    *
    * DESCRIPCION: Al montar el componente carga el listado de productos y la lista
    * completa sin filtrar, que se usa para las estadisticas y las opciones del filtro
    * de grupo.
    *
    * ENTRADA: Arreglo de dependencias vacio.
    *
    * SALIDA: Ejecucion de cargarInventarios y actualizacion del estado
    * todosInventarios.
    *
    * RESTRICCIONES: Se ejecuta unicamente en el montaje del componente. Si la carga de
    * la lista completa falla, el error solo se registra en consola.
    *
    * OBJETIVO: Inicializar los datos de la pantalla.
    *
    *-----------------------------------------------------------------------------------*/

    useEffect(() => {

        cargarInventarios();

        listarInventarios()
            .then((datos) => {
                setTodosInventarios(datos);
            })
            .catch((err) => {
                console.error(err);
            });

    }, []);


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: aplicarFiltros
    *
    * DESCRIPCION: Combina los cambios recibidos con los filtros actuales (nombre y
    * grupo), guarda los valores usados, limpia la seleccion y ejecuta la busqueda. Los
    * filtros que no vienen en los cambios conservan su valor actual.
    *
    * ENTRADA: cambios - objeto con los filtros modificados (por defecto vacio).
    *
    * SALIDA: Actualiza los estados nombre, grupo y seleccionados, y ejecuta
    * cargarInventarios con el conjunto completo de filtros.
    *
    * RESTRICCIONES: Los cambios solo deben contener las llaves nombre o grupo.
    *
    * OBJETIVO: Aplicar los filtros sin perder los que ya estaban seleccionados.
    *
    *-----------------------------------------------------------------------------------*/

    const aplicarFiltros = (cambios = {}) => {

        const filtros = {

            nombre:
                cambios.nombre !== undefined
                    ? cambios.nombre
                    : nombre,

            grupo:
                cambios.grupo !== undefined
                    ? cambios.grupo
                    : grupo
        };

        // Guardamos los valores utilizados para la busqueda.
        setNombre(filtros.nombre);
        setGrupo(filtros.grupo);

        setSeleccionados([]);

        cargarInventarios(filtros);
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: restaurarFiltros
    *
    * DESCRIPCION: Limpia los filtros y la seleccion de productos y vuelve a cargar el
    * listado completo.
    *
    * ENTRADA: Ninguna.
    *
    * SALIDA: Actualiza los estados nombre, grupo y seleccionados, y ejecuta
    * cargarInventarios sin filtros.
    *
    * RESTRICCIONES: Requiere conexion con la API mediante listarInventarios.
    *
    * OBJETIVO: Volver a la vista sin filtros.
    *
    *-----------------------------------------------------------------------------------*/

    const restaurarFiltros = () => {

        setNombre('');
        setGrupo('');

        setSeleccionados([]);

        cargarInventarios();
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: toggleSeleccion
    *
    * DESCRIPCION: Agrega un StockItemID a la lista de seleccionados si no estaba, o lo
    * quita si ya estaba.
    *
    * ENTRADA: id - identificador del producto (StockItemID).
    *
    * SALIDA: Actualiza el estado seleccionados.
    *
    * RESTRICCIONES: El id debe corresponder a un producto existente.
    *
    * OBJETIVO: Controlar los productos marcados con checkbox en la tabla.
    *
    *-----------------------------------------------------------------------------------*/

    const toggleSeleccion = (id) => {

        setSeleccionados((prev) =>

            prev.includes(id)

                ? prev.filter((x) => x !== id)

                : [...prev, id]
        );
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: verUno
    *
    * DESCRIPCION: Solicita a la API el detalle de un producto y lo guarda en el estado
    * para abrir el modal de detalle. Si ocurre un error muestra un mensaje.
    *
    * ENTRADA: id - identificador del producto.
    *
    * SALIDA: Actualiza los estados inventariosModal o mensaje.
    *
    * RESTRICCIONES: Requiere un identificador valido y conexion con la API.
    *
    * OBJETIVO: Mostrar la informacion completa de un producto.
    *
    *-----------------------------------------------------------------------------------*/

    const verUno = async (id) => {

        try {

            const detalle =
                await obtenerDetalleInventarios(id);

            setInventariosModal(detalle);

        } catch (err) {

            console.error(err);

            setMensaje({
                tipo: 'error',
                titulo: 'Error',
                mensaje:
                    'No se pudo cargar el detalle del producto.'
            });
        }
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: verSeleccionados
    *
    * DESCRIPCION: Solicita a la API el detalle de todos los productos marcados con
    * checkbox y lo guarda en el estado para abrir el modal de detalle. Si no hay
    * productos seleccionados no hace nada. Si ocurre un error muestra un mensaje.
    *
    * ENTRADA: Ninguna (usa el estado seleccionados).
    *
    * SALIDA: Actualiza los estados inventariosModal o mensaje.
    *
    * RESTRICCIONES: Debe haber al menos un producto seleccionado. Requiere conexion con
    * la API.
    *
    * OBJETIVO: Consultar en un solo modal el detalle de varios productos.
    *
    *-----------------------------------------------------------------------------------*/

    const verSeleccionados = async () => {

        if (seleccionados.length === 0) {
            return;
        }

        try {

            const detalle =
                await obtenerDetalleInventarios(
                    seleccionados
                );

            setInventariosModal(detalle);

        } catch (err) {

            console.error(err);

            setMensaje({
                tipo: 'error',
                titulo: 'Error',
                mensaje:
                    'No se pudo cargar el detalle de los productos seleccionados.'
            });
        }
    };


    // ============================================================
    // INVENTARIO CREADO
    // ============================================================

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: inventarioCreado
    *
    * DESCRIPCION: Se ejecuta cuando el modal de nuevo producto termina con exito. Cierra
    * el modal, limpia la seleccion, recarga el listado completo y muestra un mensaje de
    * confirmacion.
    *
    * ENTRADA: Ninguna.
    *
    * SALIDA: Actualiza los estados mostrarNuevo, seleccionados, inventarios y mensaje.
    *
    * RESTRICCIONES: Debe invocarse solo despues de crear el producto correctamente.
    *
    * OBJETIVO: Reflejar el nuevo producto en la tabla y notificar al usuario.
    *
    *-----------------------------------------------------------------------------------*/

    const inventarioCreado = async () => {

        setMostrarNuevo(false);
        setSeleccionados([]);

        await cargarTodosInventarios();

        setMensaje({
            tipo: 'exito',
            titulo: 'Producto creado',
            mensaje:
                'El producto se creó correctamente.'
        });
    };


    // ============================================================
    // INVENTARIO ACTUALIZADO
    // ============================================================

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: inventarioActualizado
    *
    * DESCRIPCION: Se ejecuta cuando el modal de edicion termina con exito. Cierra el
    * modal, limpia la seleccion, recarga el listado completo y muestra un mensaje de
    * confirmacion.
    *
    * ENTRADA: Ninguna.
    *
    * SALIDA: Actualiza los estados inventarioEditar, seleccionados, inventarios y
    * mensaje.
    *
    * RESTRICCIONES: Debe invocarse solo despues de actualizar el producto
    * correctamente.
    *
    * OBJETIVO: Reflejar los cambios del producto en la tabla y notificar al usuario.
    *
    *-----------------------------------------------------------------------------------*/

    const inventarioActualizado = async () => {

        setInventarioEditar(null);
        setSeleccionados([]);

        await cargarTodosInventarios();

        setMensaje({
            tipo: 'exito',
            titulo: 'Producto actualizado',
            mensaje:
                'El producto se actualizó correctamente.'
        });
    };


    // ============================================================
    // INVENTARIO ELIMINADO
    // ============================================================

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: inventarioEliminado
    *
    * DESCRIPCION: Se ejecuta cuando el modal de eliminacion termina con exito. Cierra el
    * modal, limpia la seleccion, recarga el listado completo y muestra un mensaje de
    * confirmacion.
    *
    * ENTRADA: Ninguna.
    *
    * SALIDA: Actualiza los estados inventarioEliminar, seleccionados, inventarios y
    * mensaje.
    *
    * RESTRICCIONES: Debe invocarse solo despues de eliminar el producto correctamente.
    *
    * OBJETIVO: Quitar el producto eliminado de la tabla y notificar al usuario.
    *
    *-----------------------------------------------------------------------------------*/

    const inventarioEliminado = async () => {

        setInventarioEliminar(null);
        setSeleccionados([]);

        await cargarTodosInventarios();

        setMensaje({
            tipo: 'exito',
            titulo: 'Producto eliminado',
            mensaje:
                'El producto se eliminó correctamente.'
        });
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: gruposDisponibles
    *
    * DESCRIPCION: Genera la lista de grupos disponibles a partir de todos los productos.
    * El procedimiento almacenado devuelve los grupos unidos mediante STRING_AGG, por
    * ejemplo "Beverages, Chocolate", por lo que se separan nuevamente por coma, se
    * eliminan espacios y vacios, se quitan repetidos con new Set() y se ordenan.
    *
    * ENTRADA: Estado todosInventarios.
    *
    * SALIDA: Arreglo ordenado de grupos unicos.
    *
    * RESTRICCIONES: Usa el campo Grupo de cada producto; si no existe se trata como
    * texto vacio.
    *
    * OBJETIVO: Llenar la lista desplegable del filtro de grupo y la estadistica de
    * grupos.
    *
    *-----------------------------------------------------------------------------------*/

    const gruposDisponibles = [
        ...new Set(

            todosInventarios.flatMap((p) =>

                (p.Grupo || '')
                    .split(',')
                    .map((g) => g.trim())
                    .filter(Boolean)
            )
        )
    ].sort();


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: Calculo de paginacion
    *
    * DESCRIPCION: Calcula el total de paginas y obtiene el subconjunto de productos que
    * corresponde a la pagina actual.
    *
    * ENTRADA: Estados inventarios y pagina, constante POR_PAGINA.
    *
    * SALIDA: Variables totalPaginas e inventariosPagina.
    *
    * RESTRICCIONES: El total de paginas es como minimo 1.
    *
    * OBJETIVO: Mostrar los productos divididos en paginas.
    *
    *-----------------------------------------------------------------------------------*/

    const totalPaginas = Math.max(
        1,
        Math.ceil(
            inventarios.length / POR_PAGINA
        )
    );


    const inventariosPagina =
        inventarios.slice(
            (pagina - 1) * POR_PAGINA,
            pagina * POR_PAGINA
        );


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: numerosPagina
    *
    * DESCRIPCION: Calcula los numeros de pagina que se muestran como botones, con un
    * maximo de 5 botones centrados en la pagina actual y ajustados a los limites.
    *
    * ENTRADA: Estados pagina y totalPaginas.
    *
    * SALIDA: Arreglo de numeros de pagina visibles.
    *
    * RESTRICCIONES: Maximo 5 botones; si hay menos paginas se muestran todas.
    *
    * OBJETIVO: Generar los botones de navegacion de la paginacion.
    *
    *-----------------------------------------------------------------------------------*/

    const numerosPagina = (() => {

        const maxBotones = 5;

        if (totalPaginas <= maxBotones) {

            return Array.from(
                { length: totalPaginas },
                (_, i) => i + 1
            );
        }

        let inicio = pagina - 2;
        let fin = pagina + 2;

        if (inicio < 1) {

            inicio = 1;
            fin = maxBotones;
        }

        if (fin > totalPaginas) {

            fin = totalPaginas;
            inicio =
                totalPaginas - maxBotones + 1;
        }

        return Array.from(
            { length: fin - inicio + 1 },
            (_, i) => inicio + i
        );

    })();


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: Fecha y hora actuales
    *
    * DESCRIPCION: Obtiene la fecha y la hora del momento del renderizado y las formatea
    * con la configuracion regional es-CR (hora en formato de 24 horas).
    *
    * ENTRADA: Fecha actual del sistema.
    *
    * SALIDA: Variables fechaTexto y horaTexto.
    *
    * RESTRICCIONES: Los valores se calculan en cada renderizado y no se actualizan solos.
    *
    * OBJETIVO: Mostrar la fecha y la hora en el encabezado de la pagina.
    *
    *-----------------------------------------------------------------------------------*/

    const ahora = new Date();

    const fechaTexto =
        ahora.toLocaleDateString(
            'es-CR',
            {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }
        );

    const horaTexto =
        ahora.toLocaleTimeString(
            'es-CR',
            {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }
        );


    // ============================================================
    // INTERFAZ
    // ============================================================

    return (

        <div>

            {/* ====================================================
                ENCABEZADO
                ==================================================== */}

            <div className="page-header">

                <div className="title-block">

                    <div className="icon-box">
                        <Package size={22} />
                    </div>

                    <div>

                        <h1>
                            Inventario
                        </h1>

                        <p>
                            Consulta y administra los productos
                            registrados en Wide World Importers.
                        </p>

                    </div>

                </div>


                <div className="header-right">

                    <span>
                        {fechaTexto} | {horaTexto}
                    </span>

                    <div className="sun-icon">
                        <Sun size={16} />
                    </div>

                </div>

            </div>


            {/* ====================================================
                ESTADISTICAS
                ==================================================== */}

            <div className="stats-row">

                <StatCard
                    icon={Package}
                    color="blue"
                    label="Total de productos"
                    value={todosInventarios.length}
                />

                <StatCard
                    icon={Layers}
                    color="green"
                    label="Grupos"
                    value={gruposDisponibles.length}
                />

                <StatCard
                    icon={CheckCircle2}
                    color="yellow"
                    label="Resultados actuales"
                    value={inventarios.length}
                />

            </div>


            {/* ====================================================
                TABLA
                ==================================================== */}

            <div className="table-card">

                {/* ==================================================
                    BARRA DE HERRAMIENTAS
                    ================================================== */}

                <div className="toolbar">


                    {/* BUSCADOR */}

                    <div className="search-box">

                        <Search size={16} />

                        <input
                            placeholder="Buscar por nombre..."
                            value={nombre}
                            onChange={(e) =>
                                setNombre(e.target.value)
                            }
                            onKeyDown={(e) => {

                                if (e.key === 'Enter') {

                                    aplicarFiltros({
                                        nombre:
                                            e.target.value
                                    });
                                }
                            }}
                        />

                    </div>


                    {/* FILTRO GRUPO */}

                    <select
                        value={grupo}
                        onChange={(e) => {

                            const valor =
                                e.target.value;

                            setGrupo(valor);

                            aplicarFiltros({
                                grupo: valor
                            });
                        }}
                    >

                        <option value="">
                            Todos los grupos
                        </option>

                        {gruposDisponibles.map((g) => (

                            <option
                                key={g}
                                value={g}
                            >
                                {g}
                            </option>

                        ))}

                    </select>


                    {/* RESTAURAR FILTROS */}

                    <button
                        className="btn-restaurar"
                        onClick={restaurarFiltros}
                    >
                        Restaurar filtros
                    </button>


                    {/* VER SELECCIONADOS */}

                    <button
                        className="btn-filtros"
                        disabled={
                            seleccionados.length === 0
                        }
                        onClick={verSeleccionados}
                        style={{
                            opacity:
                                seleccionados.length === 0
                                    ? 0.5
                                    : 1,

                            cursor:
                                seleccionados.length === 0
                                    ? 'not-allowed'
                                    : 'pointer'
                        }}
                    >

                        <Eye size={16} />

                        Ver seleccionados (
                        {seleccionados.length}
                        )

                    </button>


                    {/* NUEVO PRODUCTO */}

                    <button
                        className="btn-nuevo"
                        onClick={() =>
                            setMostrarNuevo(true)
                        }
                    >

                        <Plus size={16} />

                        Nuevo Producto

                    </button>

                </div>


                {/* ==================================================
                    CARGANDO / TABLA
                    ================================================== */}

                {cargando ? (

                    <p style={{ padding: '1rem' }}>
                        Cargando...
                    </p>

                ) : (

                    <>

                        {/* TABLA DE INVENTARIOS */}

                        <InventariosTabla
                            inventarios={
                                inventariosPagina
                            }

                            seleccionados={
                                seleccionados
                            }

                            onToggleSeleccion={
                                toggleSeleccion
                            }

                            onVerUno={
                                verUno
                            }

                            onEditar={
                                (inventario) =>
                                    setInventarioEditar(
                                        inventario
                                    )
                            }

                            onEliminar={
                                (inventario) =>
                                    setInventarioEliminar(
                                        inventario
                                    )
                            }
                        />


                        {/* PAGINACION */}

                        <div className="paginacion">

                            <span>

                                Mostrando{' '}

                                {inventarios.length === 0
                                    ? 0
                                    : (pagina - 1) *
                                      POR_PAGINA + 1}

                                {' - '}

                                {Math.min(
                                    pagina * POR_PAGINA,
                                    inventarios.length
                                )}

                                {' de '}

                                {inventarios.length}

                                {' resultados'}

                            </span>


                            <div className="paginas">


                                {/* ANTERIOR */}

                                <button
                                    disabled={
                                        pagina === 1
                                    }
                                    onClick={() =>
                                        setPagina(
                                            (p) =>
                                                Math.max(
                                                    1,
                                                    p - 1
                                                )
                                        )
                                    }
                                >
                                    ‹
                                </button>


                                {/* NUMEROS */}

                                {numerosPagina.map((n) => (

                                    <button
                                        key={n}
                                        className={
                                            pagina === n
                                                ? 'activo'
                                                : ''
                                        }
                                        onClick={() =>
                                            setPagina(n)
                                        }
                                    >
                                        {n}
                                    </button>

                                ))}


                                {/* SIGUIENTE */}

                                <button
                                    disabled={
                                        pagina ===
                                        totalPaginas
                                    }
                                    onClick={() =>
                                        setPagina(
                                            (p) =>
                                                Math.min(
                                                    totalPaginas,
                                                    p + 1
                                                )
                                        )
                                    }
                                >
                                    ›
                                </button>

                            </div>

                        </div>

                    </>

                )}

            </div>


            {/* ====================================================
                MODAL DE DETALLE
                ==================================================== */}

            <InventarioDetalleModal
                inventarios={
                    inventariosModal
                }

                onCerrar={() =>
                    setInventariosModal(null)
                }
            />


            {/* ====================================================
                MODAL NUEVO
                ==================================================== */}

            {mostrarNuevo && (

                <InventarioNuevoModal

                    onCerrar={() =>
                        setMostrarNuevo(false)
                    }

                    onInventarioCreado={
                        inventarioCreado
                    }

                    onMostrarMensaje={
                        (nuevoMensaje) => {
                            setMensaje(
                                nuevoMensaje
                            );
                        }
                    }

                />

            )}


            {/* ====================================================
                MODAL EDITAR
                ==================================================== */}

            {inventarioEditar && (

                <InventarioEditarModal

                    inventario={
                        inventarioEditar
                    }

                    onCerrar={() =>
                        setInventarioEditar(null)
                    }

                    onInventarioActualizado={
                        inventarioActualizado
                    }

                    onMostrarMensaje={
                        (nuevoMensaje) => {
                            setMensaje(
                                nuevoMensaje
                            );
                        }
                    }

                />

            )}


            {/* ====================================================
                MODAL ELIMINAR
                ==================================================== */}

            {inventarioEliminar && (

                <InventarioEliminarModal

                    inventario={
                        inventarioEliminar
                    }

                    onCerrar={() =>
                        setInventarioEliminar(null)
                    }

                    onEliminado={
                        inventarioEliminado
                    }

                    onMostrarMensaje={
                        (nuevoMensaje) => {
                            setMensaje(
                                nuevoMensaje
                            );
                        }
                    }

                />

            )}


            {/* ====================================================
                MENSAJE
                ==================================================== */}

            {mensaje && (

                <div className="modal-overlay">

                    <div
                        className={`mensaje-modal ${mensaje.tipo}`}
                    >

                        <h2>
                            {mensaje.titulo}
                        </h2>

                        <p>
                            {mensaje.mensaje}
                        </p>

                        <button
                            className="btn-aceptar"
                            onClick={() =>
                                setMensaje(null)
                            }
                        >
                            Aceptar
                        </button>

                    </div>

                </div>

            )}

        </div>
    );
}


export default InventariosPage;