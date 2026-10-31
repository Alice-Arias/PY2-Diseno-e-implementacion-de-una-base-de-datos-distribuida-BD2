/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Pagina de proveedores (ProveedoresPage)
*
* DESCRIPCION: Componente de pagina que gestiona los proveedores registrados en Wide
* World Importers. Carga y lista los proveedores, permite filtrarlos por nombre,
* categoria y metodo de entrega, seleccionarlos con checkbox, consultar el detalle de
* uno o varios proveedores, y crear, modificar y eliminar proveedores mediante modales.
* Calcula estadisticas, muestra los resultados en una tabla paginada de 10 registros por
* pagina y presenta mensajes de exito o error en un modal de notificacion.
*
* ENTRADA: Filtros ingresados por el usuario (nombre, categoria y metodo de entrega),
* acciones sobre la tabla (ver, editar, eliminar, seleccionar) y datos devueltos por las
* funciones listarProveedores y obtenerDetalleProveedores del servicio api.
*
* SALIDA: Interfaz con encabezado, tarjetas de estadisticas, barra de herramientas,
* tabla de proveedores con paginacion, modales de operaciones y mensajes de
* confirmacion o error.
*
* RESTRICCIONES: Requiere que el servicio api este disponible y que existan los
* componentes ProveedoresTabla, ProveedorDetalleModal, ProveedorNuevoModal,
* ProveedorEditarModal, ProveedorEliminarModal y StatCard en las rutas indicadas. Los
* proveedores deben incluir los campos Categoria_Proveedor y Metodo_Entrega para generar
* las opciones de los filtros.
*
* OBJETIVO: Permitir consultar, crear, modificar y eliminar proveedores desde una unica
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
  Truck,
  CheckCircle2,
  Tag,
  Search,
  Plus,
  Sun,
  Eye
} from 'lucide-react';


// ============================================================
// COMPONENTES
// ============================================================

import ProveedoresTabla from '../components/proveedores/ProveedoresTabla';
import ProveedorDetalleModal from '../components/proveedores/ProveedorDetalleModal';
import ProveedorNuevoModal from '../components/proveedores/ProveedorNuevoModal';
import ProveedorEditarModal from '../components/proveedores/ProveedorEditarModal';
import ProveedorEliminarModal from '../components/proveedores/ProveedorEliminarModal';
import StatCard from '../components/StatCard';

// ============================================================
// FUNCIONES QUE SE COMUNICAN CON LA API
// ============================================================

import {
  listarProveedores,
  obtenerDetalleProveedores
} from '../services/api';


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: POR_PAGINA
*
* DESCRIPCION: Constante que define la cantidad maxima de proveedores que se muestran
* por pagina en la tabla.
*
* ENTRADA: Ninguna.
*
* SALIDA: Valor numerico 10.
*
* RESTRICCIONES: Debe ser un numero entero mayor que cero.
*
* OBJETIVO: Controlar el tamano de la paginacion de la tabla de proveedores.
*
*---------------------------------------------------------------------------------------*/

const POR_PAGINA = 10;


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: ProveedoresPage
*
* DESCRIPCION: Componente principal de la pagina de proveedores. Define los estados de
* la pantalla, las funciones de carga de datos, los manejadores de filtros, seleccion y
* modales, y los calculos de estadisticas y paginacion, y retorna la interfaz completa.
*
* ENTRADA: Ninguna (no recibe props).
*
* SALIDA: Elemento JSX con la pagina de proveedores.
*
* RESTRICCIONES: Debe renderizarse dentro de la aplicacion con acceso a la API.
*
* OBJETIVO: Centralizar la gestion de proveedores en una sola vista.
*
*---------------------------------------------------------------------------------------*/

function ProveedoresPage() {

  // ----------------------------------------------------------
  // PROVEEDORES
  // ----------------------------------------------------------

  // Proveedores que se estan mostrando (lista completa o filtrada).
  const [proveedores, setProveedores] = useState([]);

  // Todos los proveedores sin filtrar. Se usa para las
  // estadisticas y para las opciones de los filtros.
  const [todosProveedores, setTodosProveedores] = useState([]);


  // ----------------------------------------------------------
  // FILTROS
  // ----------------------------------------------------------

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [metodoEntrega, setMetodoEntrega] = useState('');


  // ----------------------------------------------------------
  // SELECCION (guarda los SupplierID marcados con checkbox)
  // ----------------------------------------------------------

  const [seleccionados, setSeleccionados] = useState([]);


  // ----------------------------------------------------------
  // MODAL DE DETALLE (null = cerrado)
  // ----------------------------------------------------------

  const [proveedoresModal, setProveedoresModal] = useState(null);


  // ----------------------------------------------------------
  // ESTADO DE CARGA Y PAGINACION
  // ----------------------------------------------------------

  const [cargando, setCargando] = useState(false);
  const [pagina, setPagina] = useState(1);


  // ----------------------------------------------------------
  // MODALES DE NUEVO / EDITAR / ELIMINAR
  // ----------------------------------------------------------

  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [proveedorEditar, setProveedorEditar] = useState(null);
  const [proveedorEliminar, setProveedorEliminar] = useState(null);


  // ----------------------------------------------------------
  // MENSAJE (exito o error)
  // ----------------------------------------------------------

  const [mensaje, setMensaje] = useState(null);


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: cargarProveedores
  *
  * DESCRIPCION: Consulta los proveedores a la API con los filtros recibidos, reinicia la
  * paginacion a la primera pagina y controla el indicador de carga. Si ocurre un error
  * muestra un mensaje de error.
  *
  * ENTRADA: filtros - objeto con los criterios de busqueda (por defecto vacio).
  *
  * SALIDA: Actualiza los estados proveedores, cargando, pagina y mensaje.
  *
  * RESTRICCIONES: Requiere conexion con la API mediante listarProveedores.
  *
  * OBJETIVO: Obtener y mostrar el listado de proveedores segun los filtros indicados.
  *
  *-----------------------------------------------------------------------------------*/

  const cargarProveedores = async (filtros = {}) => {

    setCargando(true);

    // Cada nueva busqueda comienza en la pagina 1.
    setPagina(1);

    try {

      const datos = await listarProveedores(filtros);

      setProveedores(datos);

    } catch (err) {

      console.error(err);

      setMensaje({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'Ocurrió un error al buscar los proveedores.'
      });

    } finally {

      setCargando(false);

    }
  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: cargarTodosProveedores
  *
  * DESCRIPCION: Recarga la lista completa de proveedores sin filtros y actualiza tanto
  * la lista mostrada como la lista general. Se usa despues de insertar, modificar o
  * eliminar un proveedor.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados todosProveedores, proveedores y pagina.
  *
  * RESTRICCIONES: Requiere conexion con la API mediante listarProveedores. Si falla, el
  * error solo se registra en consola.
  *
  * OBJETIVO: Mantener la tabla y las estadisticas sincronizadas con los cambios.
  *
  *-----------------------------------------------------------------------------------*/

  const cargarTodosProveedores = async () => {

    try {

      const datos = await listarProveedores();

      setTodosProveedores(datos);

      setProveedores(datos);

      setPagina(1);

    } catch (err) {

      console.error(err);

    }

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: useEffect de carga inicial
  *
  * DESCRIPCION: Al montar el componente carga el listado de proveedores y la lista
  * completa sin filtrar, que se usa para las estadisticas y las opciones de los filtros.
  *
  * ENTRADA: Arreglo de dependencias vacio.
  *
  * SALIDA: Ejecucion de cargarProveedores y actualizacion del estado todosProveedores.
  *
  * RESTRICCIONES: Se ejecuta unicamente en el montaje del componente. Si la carga de la
  * lista completa falla, el error se ignora.
  *
  * OBJETIVO: Inicializar los datos de la pantalla.
  *
  *-----------------------------------------------------------------------------------*/

  useEffect(() => {

    cargarProveedores();

    listarProveedores()
      .then((datos) => setTodosProveedores(datos))
      .catch(() => { });

  }, []);


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: aplicarFiltros
  *
  * DESCRIPCION: Combina los cambios recibidos con los filtros actuales (nombre,
  * categoria y metodo de entrega) y ejecuta la busqueda. Los filtros que no vienen en
  * los cambios conservan su valor actual.
  *
  * ENTRADA: cambios - objeto con los filtros modificados (por defecto vacio).
  *
  * SALIDA: Ejecucion de cargarProveedores con el conjunto completo de filtros.
  *
  * RESTRICCIONES: Los cambios solo deben contener las llaves nombre, categoria o
  * metodoEntrega.
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

      categoria:
        cambios.categoria !== undefined
          ? cambios.categoria
          : categoria,

      metodoEntrega:
        cambios.metodoEntrega !== undefined
          ? cambios.metodoEntrega
          : metodoEntrega

    };

    cargarProveedores(filtros);

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: restaurarFiltros
  *
  * DESCRIPCION: Limpia los filtros y la seleccion de proveedores y vuelve a cargar el
  * listado completo.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados nombre, categoria, metodoEntrega y seleccionados, y
  * ejecuta cargarProveedores sin filtros.
  *
  * RESTRICCIONES: Requiere conexion con la API mediante listarProveedores.
  *
  * OBJETIVO: Volver a la vista sin filtros.
  *
  *-----------------------------------------------------------------------------------*/

  const restaurarFiltros = () => {

    setNombre('');
    setCategoria('');
    setMetodoEntrega('');
    setSeleccionados([]);

    cargarProveedores();

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: toggleSeleccion
  *
  * DESCRIPCION: Agrega un SupplierID a la lista de seleccionados si no estaba, o lo
  * quita si ya estaba.
  *
  * ENTRADA: id - identificador del proveedor (SupplierID).
  *
  * SALIDA: Actualiza el estado seleccionados.
  *
  * RESTRICCIONES: El id debe corresponder a un proveedor existente.
  *
  * OBJETIVO: Controlar los proveedores marcados con checkbox en la tabla.
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
  * DESCRIPCION: Solicita a la API el detalle de un proveedor (boton del ojo) y lo
  * guarda en el estado para abrir el modal de detalle. Si ocurre un error muestra un
  * mensaje.
  *
  * ENTRADA: id - identificador del proveedor.
  *
  * SALIDA: Actualiza los estados proveedoresModal o mensaje.
  *
  * RESTRICCIONES: Requiere un identificador valido y conexion con la API.
  *
  * OBJETIVO: Mostrar la informacion completa de un proveedor.
  *
  *-----------------------------------------------------------------------------------*/

  const verUno = async (id) => {

    try {

      const detalle = await obtenerDetalleProveedores(id);

      setProveedoresModal(detalle);

    } catch (err) {

      console.error(err);

      setMensaje({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'No se pudo cargar el detalle del proveedor.'
      });

    }

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: verSeleccionados
  *
  * DESCRIPCION: Solicita a la API el detalle de todos los proveedores marcados con
  * checkbox y lo guarda en el estado para abrir el modal de detalle. Si ocurre un error
  * muestra un mensaje.
  *
  * ENTRADA: Ninguna (usa el estado seleccionados).
  *
  * SALIDA: Actualiza los estados proveedoresModal o mensaje.
  *
  * RESTRICCIONES: Debe haber al menos un proveedor seleccionado; el boton se deshabilita
  * en caso contrario. Requiere conexion con la API.
  *
  * OBJETIVO: Consultar en un solo modal el detalle de varios proveedores.
  *
  *-----------------------------------------------------------------------------------*/

  const verSeleccionados = async () => {

    try {

      const detalle = await obtenerDetalleProveedores(seleccionados);

      setProveedoresModal(detalle);

    } catch (err) {

      console.error(err);

      setMensaje({
        tipo: 'error',
        titulo: 'Error',
        mensaje:
          'No se pudo cargar el detalle de los proveedores seleccionados.'
      });

    }

  };


  // ============================================================
  // CALLBACKS DE LOS MODALES
  // ============================================================

  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: proveedorCreado
  *
  * DESCRIPCION: Se ejecuta cuando el modal de nuevo proveedor termina con exito. Cierra
  * el modal, limpia la seleccion, recarga el listado completo y muestra un mensaje de
  * confirmacion.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados mostrarNuevo, seleccionados, proveedores y mensaje.
  *
  * RESTRICCIONES: Debe invocarse solo despues de crear el proveedor correctamente.
  *
  * OBJETIVO: Reflejar el nuevo proveedor en la tabla y notificar al usuario.
  *
  *-----------------------------------------------------------------------------------*/

  const proveedorCreado = async () => {

    setMostrarNuevo(false);
    setSeleccionados([]);

    await cargarTodosProveedores();

    setMensaje({
      tipo: 'exito',
      titulo: 'Proveedor creado',
      mensaje: 'El proveedor se creó correctamente.'
    });

  };

  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: proveedorActualizado
  *
  * DESCRIPCION: Se ejecuta cuando el modal de edicion termina con exito. Cierra el
  * modal, limpia la seleccion, recarga el listado completo y muestra un mensaje de
  * confirmacion.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados proveedorEditar, seleccionados, proveedores y mensaje.
  *
  * RESTRICCIONES: Debe invocarse solo despues de actualizar el proveedor correctamente.
  *
  * OBJETIVO: Reflejar los cambios del proveedor en la tabla y notificar al usuario.
  *
  *-----------------------------------------------------------------------------------*/

  const proveedorActualizado = async () => {

    setProveedorEditar(null);
    setSeleccionados([]);

    await cargarTodosProveedores();

    setMensaje({
      tipo: 'exito',
      titulo: 'Proveedor actualizado',
      mensaje: 'El proveedor se actualizó correctamente.'
    });

  };

  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: proveedorEliminado
  *
  * DESCRIPCION: Se ejecuta cuando el modal de eliminacion termina con exito. Cierra el
  * modal, limpia la seleccion, recarga el listado completo y muestra un mensaje de
  * confirmacion.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados proveedorEliminar, seleccionados, proveedores y
  * mensaje.
  *
  * RESTRICCIONES: Debe invocarse solo despues de eliminar el proveedor correctamente.
  *
  * OBJETIVO: Quitar el proveedor eliminado de la tabla y notificar al usuario.
  *
  *-----------------------------------------------------------------------------------*/

  const proveedorEliminado = async () => {

    setProveedorEliminar(null);
    setSeleccionados([]);

    await cargarTodosProveedores();

    setMensaje({
      tipo: 'exito',
      titulo: 'Proveedor eliminado',
      mensaje: 'El proveedor se eliminó correctamente.'
    });

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: Opciones de los filtros
  *
  * DESCRIPCION: Genera las listas de categorias y metodos de entrega disponibles a
  * partir de todos los proveedores. new Set() elimina repetidos, filter(Boolean)
  * elimina vacios y sort() ordena alfabeticamente.
  *
  * ENTRADA: Estado todosProveedores.
  *
  * SALIDA: Variables categoriasDisponibles y metodosDisponibles.
  *
  * RESTRICCIONES: Usa los campos Categoria_Proveedor y Metodo_Entrega de cada
  * proveedor.
  *
  * OBJETIVO: Llenar las listas desplegables de los filtros y la estadistica de
  * categorias.
  *
  *-----------------------------------------------------------------------------------*/

  const categoriasDisponibles = [
    ...new Set(todosProveedores.map((p) => p.Categoria_Proveedor))
  ]
    .filter(Boolean)
    .sort();

  const metodosDisponibles = [
    ...new Set(todosProveedores.map((p) => p.Metodo_Entrega))
  ]
    .filter(Boolean)
    .sort();


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: Calculo de paginacion
  *
  * DESCRIPCION: Calcula el total de paginas y obtiene el subconjunto de proveedores que
  * corresponde a la pagina actual.
  *
  * ENTRADA: Estados proveedores y pagina, constante POR_PAGINA.
  *
  * SALIDA: Variables totalPaginas y proveedoresPagina.
  *
  * RESTRICCIONES: El total de paginas es como minimo 1.
  *
  * OBJETIVO: Mostrar los proveedores divididos en paginas.
  *
  *-----------------------------------------------------------------------------------*/

  const totalPaginas = Math.max(
    1,
    Math.ceil(proveedores.length / POR_PAGINA)
  );

  const proveedoresPagina = proveedores.slice(
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
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
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

      {/* ENCABEZADO */}

      <div className="page-header">

        <div className="title-block">

          <div className="icon-box">
            <Truck size={22} />
          </div>

          <div>
            <h1>Proveedores</h1>
            <p>
              Consulta y busca proveedores registrados
              en Wide World Importers.
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


      {/* ESTADISTICAS */}

      <div className="stats-row">

        <StatCard
          icon={Truck}
          color="blue"
          label="Total de proveedores"
          value={todosProveedores.length}
        />

        <StatCard
          icon={Tag}
          color="green"
          label="Categorías"
          value={categoriasDisponibles.length}
        />

        <StatCard
          icon={CheckCircle2}
          color="yellow"
          label="Resultados actuales"
          value={proveedores.length}
        />

      </div>


      {/* TABLA */}

      <div className="table-card">

        {/* BARRA DE HERRAMIENTAS */}

        <div className="toolbar">

          {/* Buscador: busca al presionar Enter */}

          <div className="search-box">

            <Search size={16} />

            <input
              placeholder="Buscar por nombre..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                aplicarFiltros({ nombre: e.target.value })
              }
            />

          </div>

          {/* Filtro por categoria */}

          <select
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              aplicarFiltros({ categoria: e.target.value });
            }}
          >
            <option value="">Todas las categorías</option>

            {categoriasDisponibles.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Filtro por metodo de entrega */}

          <select
            value={metodoEntrega}
            onChange={(e) => {
              setMetodoEntrega(e.target.value);
              aplicarFiltros({ metodoEntrega: e.target.value });
            }}
          >
            <option value="">Todos los métodos</option>

            {metodosDisponibles.map((met) => (
              <option key={met} value={met}>{met}</option>
            ))}
          </select>

          <button className="btn-restaurar" onClick={restaurarFiltros}>
            Restaurar filtros
          </button>

          <button
            className="btn-filtros"
            disabled={seleccionados.length === 0}
            onClick={verSeleccionados}
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


        {/* CARGANDO / TABLA */}

        {cargando ? (

          <p style={{ padding: '1rem' }}>Cargando...</p>

        ) : (

          <>

            <ProveedoresTabla
              proveedores={proveedoresPagina}
              seleccionados={seleccionados}
              onToggleSeleccion={toggleSeleccion}
              onVerUno={verUno}
              onEditar={(proveedor) => setProveedorEditar(proveedor)}
              onEliminar={(proveedor) => setProveedorEliminar(proveedor)}
            />

            {/* PAGINACION */}

            <div className="paginacion">

              <span>
                Mostrando{' '}
                {proveedores.length === 0
                  ? 0
                  : (pagina - 1) * POR_PAGINA + 1}
                {' - '}
                {Math.min(pagina * POR_PAGINA, proveedores.length)}
                {' de '}
                {proveedores.length}
                {' resultados'}
              </span>

              <div className="paginas">

                <button
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
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
                    setPagina((p) => Math.min(totalPaginas, p + 1))
                  }
                >
                  ›
                </button>

              </div>

            </div>

          </>

        )}

      </div>


      {/* MODAL DE DETALLE */}

      <ProveedorDetalleModal
        proveedores={proveedoresModal}
        onCerrar={() => setProveedoresModal(null)}
      />


      {/* MODAL NUEVO PROVEEDOR */}

      {mostrarNuevo && (
        <ProveedorNuevoModal
          onCerrar={() => setMostrarNuevo(false)}
          onProveedorCreado={proveedorCreado}
          onMostrarMensaje={(nuevoMensaje) => setMensaje(nuevoMensaje)}
        />
      )}


      {/* MODAL EDITAR PROVEEDOR */}

      {proveedorEditar && (
        <ProveedorEditarModal
          proveedor={proveedorEditar}
          onCerrar={() => setProveedorEditar(null)}
          onProveedorActualizado={proveedorActualizado}
          onMostrarMensaje={(nuevoMensaje) => setMensaje(nuevoMensaje)}
        />
      )}


      {/* MODAL ELIMINAR PROVEEDOR */}

      {proveedorEliminar && (
        <ProveedorEliminarModal
          proveedor={proveedorEliminar}
          onCerrar={() => setProveedorEliminar(null)}
          onEliminado={proveedorEliminado}
          onMostrarMensaje={(nuevoMensaje) => setMensaje(nuevoMensaje)}
        />
      )}


      {/* MENSAJE DE EXITO / ERROR */}

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


export default ProveedoresPage;