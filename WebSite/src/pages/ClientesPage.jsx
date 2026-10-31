/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Pagina de clientes (ClientesPage)
*
* DESCRIPCION: Componente de pagina que gestiona los clientes registrados en Wide World
* Importers. Carga y lista los clientes, permite filtrarlos por nombre, categoria y
* metodo de entrega, seleccionarlos con checkbox, consultar el detalle de uno o varios
* clientes, y crear, modificar y eliminar clientes mediante modales. Calcula
* estadisticas, muestra los resultados en una tabla paginada de 10 registros por pagina
* y presenta mensajes de exito o error en un modal de notificacion.
*
* ENTRADA: Filtros ingresados por el usuario (nombre, categoria y metodo de entrega),
* acciones sobre la tabla (ver, editar, eliminar, seleccionar) y datos devueltos por las
* funciones listarClientes y obtenerDetalleClientes del servicio api.
*
* SALIDA: Interfaz con encabezado, tarjetas de estadisticas, barra de herramientas,
* tabla de clientes con paginacion, modales de operaciones y mensajes de confirmacion o
* error.
*
* RESTRICCIONES: Requiere que el servicio api este disponible y que existan los
* componentes ClientesTabla, ClienteDetalleModal, ClienteNuevoModal, ClienteEditarModal,
* ClienteEliminarModal y StatCard en las rutas indicadas. Los clientes deben incluir los
* campos Categoria_Cliente y Metodo_Entrega para generar las opciones de los filtros.
* Las funciones insertarCliente, actualizarCliente, eliminarCliente y el icono
* AlertTriangle se importan pero no se usan directamente en este archivo.
*
* OBJETIVO: Permitir consultar, crear, modificar y eliminar clientes desde una unica
* pantalla, mostrando informacion resumida y actualizada.
*
*---------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';


// ============================================================
// ICONOS
// ============================================================

import {
    Users,
    CheckCircle2,
    Tag,
    Search,
    Plus,
    Sun,
    Eye,
    AlertTriangle
} from 'lucide-react';


// ============================================================
// COMPONENTES
// ============================================================

import ClientesTabla from '../components/ClientesTabla';
import ClienteDetalleModal from '../components/ClienteDetalleModal';
import ClienteNuevoModal from '../components/ClienteNuevoModal';
import ClienteEditarModal from '../components/ClienteEditarModal';
import ClienteEliminarModal from '../components/ClienteEliminarModal';
import StatCard from '../components/StatCard';


// ============================================================
// FUNCIONES QUE SE COMUNICAN CON LA API
// ============================================================

import {
    listarClientes,
    obtenerDetalleClientes,
    insertarCliente,
    actualizarCliente,
    eliminarCliente
} from '../services/api';


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: POR_PAGINA
*
* DESCRIPCION: Constante que define la cantidad maxima de clientes que se muestran por
* pagina en la tabla.
*
* ENTRADA: Ninguna.
*
* SALIDA: Valor numerico 10.
*
* RESTRICCIONES: Debe ser un numero entero mayor que cero.
*
* OBJETIVO: Controlar el tamano de la paginacion de la tabla de clientes.
*
*---------------------------------------------------------------------------------------*/

const POR_PAGINA = 10;


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: ClientesPage
*
* DESCRIPCION: Componente principal de la pagina de clientes. Define los estados de la
* pantalla, las funciones de carga de datos, los manejadores de filtros, seleccion y
* modales, y los calculos de estadisticas y paginacion, y retorna la interfaz completa.
*
* ENTRADA: Ninguna (no recibe props).
*
* SALIDA: Elemento JSX con la pagina de clientes.
*
* RESTRICCIONES: Debe renderizarse dentro de la aplicacion con acceso a la API.
*
* OBJETIVO: Centralizar la gestion de clientes en una sola vista.
*
*---------------------------------------------------------------------------------------*/

function ClientesPage() {


  // ============================================================
  // CLIENTES
  // ============================================================

  // Clientes que actualmente se estan mostrando.
  //
  // Puede ser la lista completa o una lista filtrada.

  const [clientes, setClientes] = useState([]);


  // Guarda todos los clientes sin filtrar.
  //
  // Se utiliza principalmente para obtener las categorias
  // y metodos de entrega disponibles.

  const [todosClientes, setTodosClientes] = useState([]);


  // ============================================================
  // FILTROS
  // ============================================================

  // Texto escrito en el filtro de nombre.

  const [nombre, setNombre] = useState('');


  // Categoria seleccionada.

  const [categoria, setCategoria] = useState('');


  // Metodo de entrega seleccionado.

  const [metodoEntrega, setMetodoEntrega] = useState('');


  // ============================================================
  // SELECCION DE CLIENTES
  // ============================================================

  // Guarda los CustomerID de los clientes seleccionados.

  const [seleccionados, setSeleccionados] = useState([]);


  // ============================================================
  // MODAL DE DETALLE
  // ============================================================

  // Guarda los clientes que se mostraran dentro del modal.
  //
  // null significa que el modal esta cerrado.

  const [clientesModal, setClientesModal] = useState(null);


  // ============================================================
  // ESTADO DE CARGA
  // ============================================================

  // Indica si actualmente se estan cargando clientes.

  const [cargando, setCargando] = useState(false);


  // ============================================================
  // PAGINACION
  // ============================================================

  // Numero de pagina actual.

  const [pagina, setPagina] = useState(1);


  // ============================================================
  // MODAL NUEVO CLIENTE
  // ============================================================

  // true  = muestra el formulario.
  // false = formulario cerrado.

  const [mostrarNuevo, setMostrarNuevo] = useState(false);


  // ============================================================
  // CLIENTE PARA EDITAR
  // ============================================================

  // Guarda el cliente que se selecciono con el lapiz.
  //
  // null significa que no hay cliente seleccionado.

  const [clienteEditar, setClienteEditar] = useState(null);


  // ============================================================
  // CLIENTE PARA ELIMINAR
  // ============================================================

  // Guarda el cliente que se selecciono con el basurero.
  //
  // null significa que no hay cliente seleccionado.

  const [clienteEliminar, setClienteEliminar] = useState(null);


  // ============================================================
  // MENSAJES
  // ============================================================

  // Guarda un mensaje que puede mostrarse despues de
  // crear, modificar o eliminar un cliente.

  const [mensaje, setMensaje] = useState(null);


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: cargarClientes
  *
  * DESCRIPCION: Consulta los clientes a la API con los filtros recibidos, reinicia la
  * paginacion a la primera pagina y controla el indicador de carga. Si ocurre un error
  * muestra un mensaje de error.
  *
  * ENTRADA: filtros - objeto con los criterios de busqueda (por defecto vacio).
  *
  * SALIDA: Actualiza los estados clientes, cargando, pagina y mensaje.
  *
  * RESTRICCIONES: Requiere conexion con la API mediante listarClientes.
  *
  * OBJETIVO: Obtener y mostrar el listado de clientes segun los filtros indicados.
  *
  *-----------------------------------------------------------------------------------*/

  const cargarClientes = async (filtros = {}) => {

    // Activamos el estado de carga.

    setCargando(true);


    // Cada nueva busqueda comienza desde la pagina 1.

    setPagina(1);


    try {

      // Consultamos la API.

      const datos = await listarClientes(filtros);


      // Guardamos los clientes obtenidos.

      setClientes(datos);

    } catch (err) {

      // Mostramos el error en la consola.

      console.error(err);


      // Informamos al usuario.

      setMensaje({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'Ocurrió un error al buscar los clientes.'
      });

    } finally {

      // Terminamos el estado de carga,
      // haya ocurrido un error o no.

      setCargando(false);

    }
  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: cargarTodosClientes
  *
  * DESCRIPCION: Recarga la lista completa de clientes sin filtros y actualiza tanto la
  * lista mostrada como la lista general. Se usa despues de insertar, modificar o
  * eliminar un cliente.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados todosClientes y clientes.
  *
  * RESTRICCIONES: Requiere conexion con la API mediante listarClientes. Si falla, el
  * error solo se registra en consola.
  *
  * OBJETIVO: Mantener la tabla y las estadisticas sincronizadas con los cambios.
  *
  *-----------------------------------------------------------------------------------*/

  const cargarTodosClientes = async () => {

    try {

      const datos = await listarClientes();

      setTodosClientes(datos);

      setClientes(datos);

    } catch (err) {

      console.error(err);

    }

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: useEffect de carga inicial
  *
  * DESCRIPCION: Al montar el componente carga el listado de clientes y la lista
  * completa sin filtrar, que se usa para las estadisticas y las opciones de los
  * filtros.
  *
  * ENTRADA: Arreglo de dependencias vacio.
  *
  * SALIDA: Ejecucion de cargarClientes y actualizacion del estado todosClientes.
  *
  * RESTRICCIONES: Se ejecuta unicamente en el montaje del componente. Si la carga de la
  * lista completa falla, el error se ignora.
  *
  * OBJETIVO: Inicializar los datos de la pantalla.
  *
  *-----------------------------------------------------------------------------------*/

  useEffect(() => {

    // Cargamos inicialmente los clientes.

    cargarClientes();


    // Tambien obtenemos todos los clientes para utilizarlos
    // en las estadisticas y en las opciones de los filtros.

    listarClientes()
      .then((datos) => setTodosClientes(datos))
      .catch(() => { });

  }, []);


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: aplicarFiltros
  *
  * DESCRIPCION: Recibe los cambios realizados en los filtros y los combina con los
  * filtros que ya estaban seleccionados (nombre, categoria y metodo de entrega). Los
  * filtros que no vienen en los cambios conservan su valor actual. Luego ejecuta la
  * busqueda.
  *
  * ENTRADA: cambios - objeto con los filtros modificados (por defecto vacio).
  *
  * SALIDA: Ejecucion de cargarClientes con el conjunto completo de filtros.
  *
  * RESTRICCIONES: Los cambios solo deben contener las llaves nombre, categoria o
  * metodoEntrega.
  *
  * OBJETIVO: Aplicar los filtros sin perder los que ya estaban seleccionados.
  *
  *-----------------------------------------------------------------------------------*/

  const aplicarFiltros = (cambios = {}) => {

    const filtros = {

      // Si "cambios" trae un nombre nuevo,
      // usamos ese nombre.
      //
      // Si no, conservamos el nombre actual.

      nombre:
        cambios.nombre !== undefined
          ? cambios.nombre
          : nombre,


      // Lo mismo para la categoria.

      categoria:
        cambios.categoria !== undefined
          ? cambios.categoria
          : categoria,


      // Lo mismo para el metodo de entrega.

      metodoEntrega:
        cambios.metodoEntrega !== undefined
          ? cambios.metodoEntrega
          : metodoEntrega,

    };


    // Ejecutamos la busqueda con los filtros construidos.

    cargarClientes(filtros);

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: restaurarFiltros
  *
  * DESCRIPCION: Limpia todos los filtros y la seleccion de clientes y vuelve a cargar
  * el listado completo.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados nombre, categoria, metodoEntrega y seleccionados, y
  * ejecuta cargarClientes sin filtros.
  *
  * RESTRICCIONES: Requiere conexion con la API mediante listarClientes.
  *
  * OBJETIVO: Volver a la vista sin filtros.
  *
  *-----------------------------------------------------------------------------------*/

  const restaurarFiltros = () => {

    setNombre('');

    setCategoria('');

    setMetodoEntrega('');

    setSeleccionados([]);

    cargarClientes();

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: toggleSeleccion
  *
  * DESCRIPCION: Selecciona o deselecciona un cliente. Si el CustomerID ya estaba en la
  * lista de seleccionados lo quita, y si no estaba lo agrega.
  *
  * ENTRADA: id - identificador del cliente (CustomerID).
  *
  * SALIDA: Actualiza el estado seleccionados.
  *
  * RESTRICCIONES: El id debe corresponder a un cliente existente.
  *
  * OBJETIVO: Controlar los clientes marcados con checkbox en la tabla.
  *
  *-----------------------------------------------------------------------------------*/

  const toggleSeleccion = (id) => {

    setSeleccionados((prev) =>

      // Preguntamos si el ID ya esta seleccionado.

      prev.includes(id)

        ?

        // Si ya esta seleccionado:
        // lo eliminamos de la lista.

        prev.filter((x) => x !== id)

        :

        // Si no esta seleccionado:
        // lo agregamos a la lista.

        [...prev, id]

    );

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: verUno
  *
  * DESCRIPCION: Se ejecuta al presionar el boton del ojo. Solicita a la API el detalle
  * de un solo cliente y lo guarda en el estado para abrir el modal de detalle. Si
  * ocurre un error muestra un mensaje.
  *
  * ENTRADA: id - identificador del cliente (CustomerID).
  *
  * SALIDA: Actualiza los estados clientesModal o mensaje.
  *
  * RESTRICCIONES: Requiere un identificador valido y conexion con la API.
  *
  * OBJETIVO: Mostrar la informacion completa de un cliente.
  *
  *-----------------------------------------------------------------------------------*/

  const verUno = async (id) => {

    try {

      // Consultamos la API utilizando el CustomerID.

      const detalle = await obtenerDetalleClientes(id);


      // Guardamos los datos para mostrarlos en el modal.

      setClientesModal(detalle);

    } catch (err) {

      console.error(err);

      setMensaje({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'No se pudo cargar el detalle del cliente.'
      });

    }

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: verSeleccionados
  *
  * DESCRIPCION: Solicita a la API el detalle de todos los clientes marcados con
  * checkbox y lo guarda en el estado para abrir el modal de detalle. Si ocurre un error
  * muestra un mensaje.
  *
  * ENTRADA: Ninguna (usa el estado seleccionados).
  *
  * SALIDA: Actualiza los estados clientesModal o mensaje.
  *
  * RESTRICCIONES: Debe haber al menos un cliente seleccionado; el boton se deshabilita
  * en caso contrario. Requiere conexion con la API.
  *
  * OBJETIVO: Consultar en un solo modal el detalle de varios clientes.
  *
  *-----------------------------------------------------------------------------------*/

  const verSeleccionados = async () => {

    try {

      // Enviamos la lista de CustomerID seleccionados.

      const detalle =
        await obtenerDetalleClientes(seleccionados);


      // Guardamos los resultados para el modal.

      setClientesModal(detalle);

    } catch (err) {

      console.error(err);

      setMensaje({
        tipo: 'error',
        titulo: 'Error',
        mensaje:
          'No se pudo cargar el detalle de los clientes seleccionados.'
      });

    }

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: clienteCreado
  *
  * DESCRIPCION: Se ejecuta cuando ClienteNuevoModal termina con exito. Cierra el
  * formulario, limpia la seleccion, recarga el listado completo y muestra un mensaje de
  * confirmacion.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados mostrarNuevo, seleccionados, clientes y mensaje.
  *
  * RESTRICCIONES: Debe invocarse solo despues de crear el cliente correctamente.
  *
  * OBJETIVO: Reflejar el nuevo cliente en la tabla y notificar al usuario.
  *
  *-----------------------------------------------------------------------------------*/

  const clienteCreado = async () => {

    // Cerramos el formulario.

    setMostrarNuevo(false);


    // Quitamos cualquier seleccion anterior.

    setSeleccionados([]);


    // Volvemos a cargar la informacion.

    await cargarTodosClientes();


    // Mostramos mensaje de exito.

    setMensaje({
      tipo: 'exito',
      titulo: 'Cliente creado',
      mensaje: 'El cliente se creó correctamente.'
    });

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: clienteActualizado
  *
  * DESCRIPCION: Se ejecuta cuando ClienteEditarModal termina con exito. Cierra el
  * formulario de edicion, limpia la seleccion, recarga el listado completo y muestra un
  * mensaje de confirmacion.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados clienteEditar, seleccionados, clientes y mensaje.
  *
  * RESTRICCIONES: Debe invocarse solo despues de actualizar el cliente correctamente.
  *
  * OBJETIVO: Reflejar los cambios del cliente en la tabla y notificar al usuario.
  *
  *-----------------------------------------------------------------------------------*/

  const clienteActualizado = async () => {

    // Cerramos el formulario de edicion.

    setClienteEditar(null);


    // Quitamos selecciones anteriores.

    setSeleccionados([]);


    // Volvemos a cargar la tabla.

    await cargarTodosClientes();


    // Mostramos mensaje de exito.

    setMensaje({
      tipo: 'exito',
      titulo: 'Cliente actualizado',
      mensaje: 'El cliente se actualizó correctamente.'
    });

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: clienteEliminado
  *
  * DESCRIPCION: Se ejecuta cuando ClienteEliminarModal termina con exito. Cierra el
  * modal, limpia la seleccion, recarga el listado completo y muestra un mensaje de
  * confirmacion.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados clienteEliminar, seleccionados, clientes y mensaje.
  *
  * RESTRICCIONES: Debe invocarse solo despues de eliminar el cliente correctamente.
  *
  * OBJETIVO: Quitar el cliente eliminado de la tabla y notificar al usuario.
  *
  *-----------------------------------------------------------------------------------*/

  const clienteEliminado = async () => {

    // Cerramos el modal.

    setClienteEliminar(null);


    // Quitamos selecciones anteriores.

    setSeleccionados([]);


    // Volvemos a cargar los clientes.

    await cargarTodosClientes();


    // Mostramos mensaje de exito.

    setMensaje({
      tipo: 'exito',
      titulo: 'Cliente eliminado',
      mensaje: 'El cliente se eliminó correctamente.'
    });

  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: categoriasDisponibles
  *
  * DESCRIPCION: Obtiene las categorias existentes en todos los clientes. new Set()
  * elimina valores repetidos, filter(Boolean) elimina valores vacios y sort() ordena
  * alfabeticamente.
  *
  * ENTRADA: Estado todosClientes.
  *
  * SALIDA: Arreglo ordenado de categorias unicas.
  *
  * RESTRICCIONES: Usa el campo Categoria_Cliente de cada cliente.
  *
  * OBJETIVO: Llenar la lista desplegable del filtro de categoria y la estadistica de
  * categorias.
  *
  *-----------------------------------------------------------------------------------*/

  const categoriasDisponibles = [

    ...new Set(

      todosClientes.map(

        (c) => c.Categoria_Cliente

      )

    )

  ]

    .filter(Boolean)

    .sort();


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: metodosDisponibles
  *
  * DESCRIPCION: Obtiene los metodos de entrega existentes en todos los clientes,
  * eliminando repetidos y vacios y ordenandolos alfabeticamente.
  *
  * ENTRADA: Estado todosClientes.
  *
  * SALIDA: Arreglo ordenado de metodos de entrega unicos.
  *
  * RESTRICCIONES: Usa el campo Metodo_Entrega de cada cliente.
  *
  * OBJETIVO: Llenar la lista desplegable del filtro de metodo de entrega.
  *
  *-----------------------------------------------------------------------------------*/

  const metodosDisponibles = [

    ...new Set(

      todosClientes.map(

        (c) => c.Metodo_Entrega

      )

    )

  ]

    .filter(Boolean)

    .sort();


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: Calculo de paginacion
  *
  * DESCRIPCION: Calcula cuantas paginas existen y obtiene unicamente los clientes que
  * pertenecen a la pagina actual.
  *
  * ENTRADA: Estados clientes y pagina, constante POR_PAGINA.
  *
  * SALIDA: Variables totalPaginas y clientesPagina.
  *
  * RESTRICCIONES: El total de paginas es como minimo 1.
  *
  * OBJETIVO: Mostrar los clientes divididos en paginas.
  *
  *-----------------------------------------------------------------------------------*/

  // Calculamos cuantas paginas existen.
  const totalPaginas = Math.max(
    1,
    Math.ceil(clientes.length / POR_PAGINA)
  );

  // Obtenemos unicamente los clientes que pertenecen
  // a la pagina actual.
  const clientesPagina = clientes.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA
  );


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: numerosPagina
  *
  * DESCRIPCION: Calcula los numeros de pagina que se muestran como botones, con un
  * maximo de 5 botones centrados en la pagina actual y ajustados a los limites. Los
  * numeros se van desplazando conforme se avanza.
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

  // Como maximo mostramos 5 botones.
  // Los numeros se van desplazando conforme avanzamos.
  const numerosPagina = (() => {

    const maxBotones = 5;

    // Si existen 5 paginas o menos,
    // mostramos todas.
    if (totalPaginas <= maxBotones) {
      return Array.from(
        { length: totalPaginas },
        (_, i) => i + 1
      );
    }

    // Intentamos colocar la pagina actual
    // en el centro de los 5 botones.
    let inicio = pagina - 2;
    let fin = pagina + 2;

    // Si estamos al principio,
    // mantenemos 1, 2, 3, 4, 5.
    if (inicio < 1) {
      inicio = 1;
      fin = maxBotones;
    }

    // Si estamos al final,
    // mostramos las ultimas 5 paginas.
    if (fin > totalPaginas) {
      fin = totalPaginas;
      inicio = totalPaginas - maxBotones + 1;
    }

    // Creamos los numeros.
    return Array.from(
      { length: fin - inicio + 1 },
      (_, i) => inicio + i
    );

  })();


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: Fecha y hora actuales
  *
  * DESCRIPCION: Obtiene la fecha y la hora del momento del renderizado, convierte la
  * fecha al formato de Costa Rica y la hora al formato de 24 horas con la configuracion
  * regional es-CR.
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

  // Obtenemos la fecha y hora actual.

  const ahora = new Date();


  // Convertimos la fecha al formato de Costa Rica.

  const fechaTexto = ahora.toLocaleDateString(

    'es-CR',

    {

      weekday: 'short',

      day: '2-digit',

      month: 'short',

      year: 'numeric'

    }

  );


  // Convertimos la hora al formato de 24 horas.

  const horaTexto = ahora.toLocaleTimeString(

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


      {/* ========================================================
          ENCABEZADO
          ======================================================== */}

      <div className="page-header">

        <div className="title-block">

          <div className="icon-box">

            <Users size={22} />

          </div>


          <div>

            <h1>
              Clientes
            </h1>

            <p>
              Consulta y busca clientes registrados
              en Wide World Importers.
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


      {/* ========================================================
          ESTADISTICAS
          ======================================================== */}

      <div className="stats-row">

        <StatCard
          icon={Users}
          color="blue"
          label="Total de clientes"
          value={todosClientes.length}
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
          value={clientes.length}
        />

      </div>


      {/* ========================================================
          TABLA
          ======================================================== */}

      <div className="table-card">


        {/* ======================================================
            BARRA DE HERRAMIENTAS
            ====================================================== */}

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

              onKeyDown={(e) =>

                e.key === 'Enter' &&

                aplicarFiltros({
                  nombre: e.target.value
                })

              }

            />

          </div>


          {/* FILTRO CATEGORIA */}

          <select

            value={categoria}

            onChange={(e) => {

              // Guardamos la categoria seleccionada.

              setCategoria(e.target.value);


              // Aplicamos el filtro.

              aplicarFiltros({

                categoria: e.target.value

              });

            }}

          >

            <option value="">

              Todas las categorías

            </option>


            {categoriasDisponibles.map((cat) => (

              <option

                key={cat}

                value={cat}

              >

                {cat}

              </option>

            ))}

          </select>


          {/* FILTRO METODO DE ENTREGA */}

          <select

            value={metodoEntrega}

            onChange={(e) => {

              // Guardamos el metodo seleccionado.

              setMetodoEntrega(e.target.value);


              // Aplicamos el filtro.

              aplicarFiltros({

                metodoEntrega: e.target.value

              });

            }}

          >

            <option value="">

              Todos los métodos

            </option>


            {metodosDisponibles.map((met) => (

              <option

                key={met}

                value={met}

              >

                {met}

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

            disabled={seleccionados.length === 0}

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


          {/* ==================================================
              NUEVO CLIENTE
              ================================================== */}

          <button

            className="btn-nuevo"

            onClick={() => setMostrarNuevo(true)}

          >

            <Plus size={16} />

            Nuevo Cliente

          </button>

        </div>


        {/* ======================================================
            CARGANDO / TABLA
            ====================================================== */}

        {cargando ? (

          <p style={{ padding: '1rem' }}>

            Cargando...

          </p>

        ) : (

          <>


            {/* ==================================================
                TABLA DE CLIENTES

                Aqui enviamos tambien las funciones de editar
                y eliminar.
                ================================================== */}

            <ClientesTabla

              clientes={clientesPagina}

              seleccionados={seleccionados}

              onToggleSeleccion={toggleSeleccion}

              onVerUno={verUno}


              // Cuando se presiona el lapiz.

              onEditar={(cliente) => {

                setClienteEditar(cliente);

              }}


              // Cuando se presiona el basurero.

              onEliminar={(cliente) => {

                setClienteEliminar(cliente);

              }}

            />


            {/* ==================================================
    PAGINACION
    ================================================== */}

            <div className="paginacion">

              <span>
                Mostrando{' '}

                {clientes.length === 0
                  ? 0
                  : (pagina - 1) * POR_PAGINA + 1}

                {' - '}

                {Math.min(
                  pagina * POR_PAGINA,
                  clientes.length
                )}

                {' de '}

                {clientes.length}

                {' resultados'}
              </span>


              <div className="paginas">

                {/* BOTON ANTERIOR */}

                <button
                  disabled={pagina === 1}
                  onClick={() =>
                    setPagina((p) =>
                      Math.max(1, p - 1)
                    )
                  }
                >
                  ‹
                </button>


                {/* NUMEROS DE PAGINA */}

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


                {/* BOTON SIGUIENTE */}

                <button
                  disabled={pagina === totalPaginas}
                  onClick={() =>
                    setPagina((p) =>
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


      {/* ========================================================
          MODAL DE DETALLE
          ======================================================== */}

      <ClienteDetalleModal

        clientes={clientesModal}

        onCerrar={() =>

          setClientesModal(null)

        }

      />


      {/* ========================================================
          MODAL NUEVO CLIENTE
          ======================================================== */}

      {mostrarNuevo && (

        <ClienteNuevoModal

          onCerrar={() =>

            setMostrarNuevo(false)

          }

          onClienteCreado={clienteCreado}

          onMostrarMensaje={(nuevoMensaje) => {

            setMensaje(nuevoMensaje);

          }}

        />

      )}


      {/* ========================================================
          MODAL EDITAR CLIENTE
          ======================================================== */}

      {clienteEditar && (

        <ClienteEditarModal

          cliente={clienteEditar}

          onCerrar={() =>

            setClienteEditar(null)

          }

          onClienteActualizado={clienteActualizado}

          onMostrarMensaje={(nuevoMensaje) => {

            setMensaje(nuevoMensaje);

          }}

        />

      )}


      {/* ========================================================
          MODAL ELIMINAR CLIENTE
          ======================================================== */}

      {clienteEliminar && (

        <ClienteEliminarModal

          cliente={clienteEliminar}

          onCerrar={() =>

            setClienteEliminar(null)

          }

          onEliminado={clienteEliminado}

          onMostrarMensaje={(nuevoMensaje) => {

            setMensaje(nuevoMensaje);

          }}

        />

      )}


      {/* ========================================================
          MENSAJE
          ======================================================== */}

      {mensaje && (

        <div className="modal-overlay">

          <div className={`mensaje-modal ${mensaje.tipo}`}>

            <h2>
              {mensaje.titulo}
            </h2>

            <p>
              {mensaje.mensaje}
            </p>

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


export default ClientesPage;