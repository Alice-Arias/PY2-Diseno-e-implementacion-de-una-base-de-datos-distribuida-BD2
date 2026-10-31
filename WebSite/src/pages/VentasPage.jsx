/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Pagina de ventas (VentasPage)
*
* DESCRIPCION: Componente de pagina que gestiona las ventas registradas en Wide World
* Importers. Carga y lista las ventas con filtros, las ordena por nombre de cliente,
* calcula estadisticas (cantidad de ventas, monto total y clientes distintos), muestra
* los resultados en una tabla paginada de 10 registros por pagina y administra los
* modales de detalle, creacion, edicion y eliminacion de ventas. Tambien muestra
* mensajes de exito o error en un modal de notificacion.
*
* ENTRADA: Filtros de busqueda ingresados desde VentasFiltro, acciones del usuario sobre
* la tabla (ver detalle, editar, eliminar), y datos devueltos por las funciones
* listarVentas, obtenerDetalleVenta y obtenerOpcionesVentas del servicio api.
*
* SALIDA: Interfaz con encabezado, tarjetas de estadisticas, tabla de ventas con
* paginacion, modales de operaciones y mensajes de confirmacion o error.
*
* RESTRICCIONES: Requiere que el servicio api este disponible y que existan los
* componentes VentasFiltro, VentasTabla, VentaDetalleModal, VentaNuevoModal,
* VentaEditarModal, VentaEliminarModal y StatCard en las rutas indicadas. Las ventas
* deben incluir los campos Nombre_Cliente y Monto para ordenar y calcular totales.
*
* OBJETIVO: Permitir consultar, crear, modificar y eliminar ventas desde una unica
* pantalla, mostrando informacion resumida y actualizada.
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
    Receipt,
    DollarSign,
    FileText,
    Sun
} from 'lucide-react';


// ============================================================
// COMPONENTES
// ============================================================

import VentasFiltro from '../components/ventas/VentasFiltro';
import VentasTabla from '../components/ventas/VentasTabla';
import VentaDetalleModal from '../components/ventas/VentaDetalleModal';
import VentaNuevoModal from '../components/ventas/VentaNuevoModal';
import VentaEditarModal from '../components/ventas/VentaEditarModal';
import VentaEliminarModal from '../components/ventas/VentaEliminarModal';
import StatCard from '../components/StatCard';


// ============================================================
// FUNCIONES QUE SE COMUNICAN CON LA API
// ============================================================

import {
    listarVentas,
    obtenerDetalleVenta,
    obtenerOpcionesVentas
} from '../services/api';


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: POR_PAGINA
*
* DESCRIPCION: Constante que define la cantidad de ventas que se muestran por pagina
* en la tabla.
*
* ENTRADA: Ninguna.
*
* SALIDA: Valor numerico 10.
*
* RESTRICCIONES: Debe ser un numero entero mayor que cero.
*
* OBJETIVO: Controlar el tamano de la paginacion de la tabla de ventas.
*
*---------------------------------------------------------------------------------------*/

const POR_PAGINA = 10;


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: VentasPage
*
* DESCRIPCION: Componente principal de la pagina de ventas. Define los estados de la
* pantalla, las funciones de carga de datos, los manejadores de eventos de los modales
* y los calculos de estadisticas y paginacion, y retorna la interfaz completa.
*
* ENTRADA: Ninguna (no recibe props).
*
* SALIDA: Elemento JSX con la pagina de ventas.
*
* RESTRICCIONES: Debe renderizarse dentro de la aplicacion con acceso a la API.
*
* OBJETIVO: Centralizar la gestion de ventas en una sola vista.
*
*---------------------------------------------------------------------------------------*/

function VentasPage() {

    // ============================================================
    // ESTADOS
    // ============================================================

    const [ventas, setVentas] = useState([]);
    const [metodosEntrega, setMetodosEntrega] = useState([]);

    // Modal de detalle (solo lectura)
    const [ventaDetalle, setVentaDetalle] = useState(null);

    // Modal de nueva venta
    const [mostrarNuevo, setMostrarNuevo] = useState(false);

    // Venta a editar (null = modal cerrado)
    const [ventaEditar, setVentaEditar] = useState(null);

    // Venta a eliminar (null = modal cerrado)
    const [ventaEliminar, setVentaEliminar] = useState(null);

    const [cargando, setCargando] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [mensaje, setMensaje] = useState(null);


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: ordenarPorCliente
    *
    * DESCRIPCION: Devuelve una copia de la lista de ventas ordenada alfabeticamente por
    * el nombre del cliente, usando la configuracion regional en espanol e ignorando
    * mayusculas y acentos.
    *
    * ENTRADA: lista - arreglo de ventas.
    *
    * SALIDA: Nuevo arreglo de ventas ordenado por Nombre_Cliente.
    *
    * RESTRICCIONES: Los elementos deben ser objetos; si Nombre_Cliente no existe se
    * trata como texto vacio.
    *
    * OBJETIVO: Presentar las ventas ordenadas por cliente en la tabla.
    *
    *-----------------------------------------------------------------------------------*/

    const ordenarPorCliente = (lista) => {

        return [...lista].sort((a, b) =>

            (a.Nombre_Cliente || '').localeCompare(
                b.Nombre_Cliente || '',
                'es',
                { sensitivity: 'base' }
            )
        );
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: cargarVentas
    *
    * DESCRIPCION: Consulta las ventas a la API aplicando los filtros recibidos, las
    * ordena por cliente, reinicia la paginacion a la primera pagina y controla el
    * indicador de carga. Si ocurre un error muestra un mensaje de error.
    *
    * ENTRADA: filtros - objeto con los criterios de busqueda (por defecto vacio).
    *
    * SALIDA: Actualiza los estados ventas, cargando, pagina y mensaje.
    *
    * RESTRICCIONES: Requiere conexion con la API mediante listarVentas.
    *
    * OBJETIVO: Obtener y mostrar el listado de ventas segun los filtros indicados.
    *
    *-----------------------------------------------------------------------------------*/

    const cargarVentas = async (filtros = {}) => {

        setCargando(true);
        setPagina(1);

        try {

            const datos = await listarVentas(filtros);
            setVentas(ordenarPorCliente(datos));

        } catch (err) {

            console.error(err);

            setMensaje({
                tipo: 'error',
                titulo: 'Error',
                mensaje: 'Ocurrió un error al buscar las ventas.'
            });

        } finally {

            setCargando(false);
        }
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: cargarMetodosEntrega
    *
    * DESCRIPCION: Obtiene desde la API las opciones disponibles para ventas y guarda
    * la lista de metodos de entrega en el estado.
    *
    * ENTRADA: Ninguna.
    *
    * SALIDA: Actualiza el estado metodosEntrega.
    *
    * RESTRICCIONES: Requiere conexion con la API mediante obtenerOpcionesVentas. Si
    * falla, el error solo se registra en consola.
    *
    * OBJETIVO: Proveer los metodos de entrega al componente de filtros.
    *
    *-----------------------------------------------------------------------------------*/

    const cargarMetodosEntrega = () => {

        obtenerOpcionesVentas()
            .then((data) => {
                setMetodosEntrega(data.metodosEntrega || []);
            })
            .catch((err) => {
                console.error(err);
            });
    };


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: useEffect de carga inicial
    *
    * DESCRIPCION: Al montar el componente carga el listado de ventas y los metodos de
    * entrega una sola vez.
    *
    * ENTRADA: Arreglo de dependencias vacio.
    *
    * SALIDA: Ejecucion de cargarVentas y cargarMetodosEntrega.
    *
    * RESTRICCIONES: Se ejecuta unicamente en el montaje del componente.
    *
    * OBJETIVO: Inicializar los datos de la pantalla.
    *
    *-----------------------------------------------------------------------------------*/

    useEffect(() => {

        cargarVentas();
        cargarMetodosEntrega();

    }, []);


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: verDetalle
    *
    * DESCRIPCION: Solicita a la API el detalle de una venta y lo guarda en el estado
    * para abrir el modal de detalle. Si ocurre un error muestra un mensaje.
    *
    * ENTRADA: invoiceId - identificador de la factura de la venta.
    *
    * SALIDA: Actualiza los estados ventaDetalle o mensaje.
    *
    * RESTRICCIONES: Requiere un identificador valido y conexion con la API.
    *
    * OBJETIVO: Mostrar la informacion completa de una venta en modo lectura.
    *
    *-----------------------------------------------------------------------------------*/

    const verDetalle = async (invoiceId) => {

        try {

            const detalle = await obtenerDetalleVenta(invoiceId);
            setVentaDetalle(detalle);

        } catch (err) {

            console.error(err);

            setMensaje({
                tipo: 'error',
                titulo: 'Error',
                mensaje: 'No se pudo cargar el detalle de la venta.'
            });
        }
    };


    // ============================================================
    // VENTA CREADA
    // ============================================================

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: ventaCreada
    *
    * DESCRIPCION: Se ejecuta cuando el modal de nueva venta termina con exito. Cierra
    * el modal, recarga el listado y muestra un mensaje de confirmacion.
    *
    * ENTRADA: Ninguna.
    *
    * SALIDA: Actualiza los estados mostrarNuevo, ventas y mensaje.
    *
    * RESTRICCIONES: Debe invocarse solo despues de crear la venta correctamente.
    *
    * OBJETIVO: Reflejar la nueva venta en la tabla y notificar al usuario.
    *
    *-----------------------------------------------------------------------------------*/

    const ventaCreada = async () => {

        setMostrarNuevo(false);

        await cargarVentas();

        setMensaje({
            tipo: 'exito',
            titulo: 'Venta creada',
            mensaje: 'La venta se creó correctamente.'
        });
    };


    // ============================================================
    // VENTA ACTUALIZADA
    // ============================================================

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: ventaActualizada
    *
    * DESCRIPCION: Se ejecuta cuando el modal de edicion termina con exito. Cierra el
    * modal, recarga el listado y muestra un mensaje de confirmacion.
    *
    * ENTRADA: Ninguna.
    *
    * SALIDA: Actualiza los estados ventaEditar, ventas y mensaje.
    *
    * RESTRICCIONES: Debe invocarse solo despues de actualizar la venta correctamente.
    *
    * OBJETIVO: Reflejar los cambios de la venta en la tabla y notificar al usuario.
    *
    *-----------------------------------------------------------------------------------*/

    const ventaActualizada = async () => {

        setVentaEditar(null);

        await cargarVentas();

        setMensaje({
            tipo: 'exito',
            titulo: 'Venta actualizada',
            mensaje: 'La venta se actualizó correctamente.'
        });
    };


    // ============================================================
    // VENTA ELIMINADA
    // ============================================================

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: ventaEliminada
    *
    * DESCRIPCION: Se ejecuta cuando el modal de eliminacion termina con exito. Cierra
    * el modal, recarga el listado y muestra un mensaje de confirmacion.
    *
    * ENTRADA: Ninguna.
    *
    * SALIDA: Actualiza los estados ventaEliminar, ventas y mensaje.
    *
    * RESTRICCIONES: Debe invocarse solo despues de eliminar la venta correctamente.
    *
    * OBJETIVO: Quitar la venta eliminada de la tabla y notificar al usuario.
    *
    *-----------------------------------------------------------------------------------*/

    const ventaEliminada = async () => {

        setVentaEliminar(null);

        await cargarVentas();

        setMensaje({
            tipo: 'exito',
            titulo: 'Venta eliminada',
            mensaje: 'La venta se eliminó correctamente.'
        });
    };


    // ============================================================
    // ESTADISTICAS Y PAGINACION
    // ============================================================

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: Calculo de estadisticas
    *
    * DESCRIPCION: Calcula la cantidad total de ventas, la suma de los montos y la
    * cantidad de clientes distintos a partir de la lista de ventas cargada.
    *
    * ENTRADA: Estado ventas.
    *
    * SALIDA: Variables totalVentas, montoTotal y clientesUnicos.
    *
    * RESTRICCIONES: El campo Monto se convierte a numero; si no es valido cuenta como 0.
    *
    * OBJETIVO: Alimentar las tarjetas de estadisticas de la pantalla.
    *
    *-----------------------------------------------------------------------------------*/

    const totalVentas = ventas.length;

    const montoTotal = ventas.reduce(
        (acc, v) => acc + (Number(v.Monto) || 0),
        0
    );

    const clientesUnicos = new Set(
        ventas.map((v) => v.Nombre_Cliente)
    ).size;


    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: Calculo de paginacion
    *
    * DESCRIPCION: Calcula el total de paginas y obtiene el subconjunto de ventas que
    * corresponde a la pagina actual.
    *
    * ENTRADA: Estados ventas y pagina, constante POR_PAGINA.
    *
    * SALIDA: Variables totalPaginas y ventasPagina.
    *
    * RESTRICCIONES: El total de paginas es como minimo 1.
    *
    * OBJETIVO: Mostrar las ventas divididas en paginas.
    *
    *-----------------------------------------------------------------------------------*/

    const totalPaginas = Math.max(
        1,
        Math.ceil(ventas.length / POR_PAGINA)
    );

    const ventasPagina = ventas.slice(
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
            inicio = totalPaginas - maxBotones + 1;
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

    const fechaTexto = ahora.toLocaleDateString('es-CR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const horaTexto = ahora.toLocaleTimeString('es-CR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });


    // ============================================================
    // INTERFAZ
    // ============================================================

    return (

        <div>

            <div className="page-header">

                <div className="title-block">

                    <div className="icon-box">
                        <Receipt size={22} />
                    </div>

                    <div>
                        <h1>Ventas</h1>
                        <p>
                            Gestiona las ventas registradas en
                            Wide World Importers.
                        </p>
                    </div>

                </div>

                <div className="header-right">

                    <span>{fechaTexto} | {horaTexto}</span>

                    <div className="sun-icon">
                        <Sun size={16} />
                    </div>

                </div>

            </div>


            <div className="stats-row">

                <StatCard
                    icon={Receipt}
                    color="blue"
                    label="Ventas encontradas"
                    value={totalVentas}
                />

                <StatCard
                    icon={DollarSign}
                    color="green"
                    label="Monto total"
                    value={montoTotal.toLocaleString('es-CR', {
                        style: 'currency',
                        currency: 'USD'
                    })}
                />

                <StatCard
                    icon={FileText}
                    color="yellow"
                    label="Clientes distintos"
                    value={clientesUnicos}
                />

            </div>


            <div className="table-card">

                <VentasFiltro
                    metodosEntrega={metodosEntrega}
                    onBuscar={cargarVentas}
                    onRestaurar={() => cargarVentas()}
                    onNuevo={() => setMostrarNuevo(true)}
                />

                {cargando ? (

                    <p style={{ padding: '1rem' }}>
                        Cargando...
                    </p>

                ) : (

                    <>

                        <VentasTabla
                            ventas={ventasPagina}
                            onVerUna={verDetalle}
                            onEditar={(v) => setVentaEditar(v)}
                            onEliminar={(v) => setVentaEliminar(v)}
                        />

                        <div className="paginacion">

                            <span>

                                Mostrando{' '}
                                {ventas.length === 0
                                    ? 0
                                    : (pagina - 1) * POR_PAGINA + 1}
                                {' - '}
                                {Math.min(pagina * POR_PAGINA, ventas.length)}
                                {' de '}
                                {ventas.length}
                                {' resultados'}

                            </span>

                            <div className="paginas">

                                <button
                                    disabled={pagina === 1}
                                    onClick={() =>
                                        setPagina((p) => Math.max(1, p - 1))
                                    }
                                >
                                    ‹
                                </button>

                                {numerosPagina.map((n) => (
                                    <button
                                        key={n}
                                        className={pagina === n ? 'activo' : ''}
                                        onClick={() => setPagina(n)}
                                    >
                                        {n}
                                    </button>
                                ))}

                                <button
                                    disabled={pagina === totalPaginas}
                                    onClick={() =>
                                        setPagina((p) =>
                                            Math.min(totalPaginas, p + 1)
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


            {/* Detalle de solo lectura */}
            <VentaDetalleModal
                venta={ventaDetalle}
                onCerrar={() => setVentaDetalle(null)}
            />


            {/* Nueva venta */}
            {mostrarNuevo && (

                <VentaNuevoModal
                    onCerrar={() => setMostrarNuevo(false)}
                    onVentaCreada={ventaCreada}
                    onMostrarMensaje={(m) => setMensaje(m)}
                />

            )}


            {/* Editar venta */}
            {ventaEditar && (

                <VentaEditarModal
                    venta={ventaEditar}
                    onCerrar={() => setVentaEditar(null)}
                    onVentaActualizada={ventaActualizada}
                    onMostrarMensaje={(m) => setMensaje(m)}
                />

            )}


            {/* Eliminar venta */}
            {ventaEliminar && (

                <VentaEliminarModal
                    venta={ventaEliminar}
                    onCerrar={() => setVentaEliminar(null)}
                    onEliminado={ventaEliminada}
                />

            )}


            {mensaje && (

                <div className="modal-overlay">

                    <div className={`mensaje-modal ${mensaje.tipo}`}>

                        <h2>{mensaje.titulo}</h2>
                        <p>{mensaje.mensaje}</p>

                        <button
                            className="btn-aceptar"
                            onClick={() => setMensaje(null)}
                        >
                            Aceptar
                        </button>

                    </div>

                </div>

            )}

        </div>

    );
}


export default VentasPage;