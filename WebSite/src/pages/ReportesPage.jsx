/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Pagina de reportes (ReportesPage)
*
* DESCRIPCION: Componente de pagina que permite consultar reportes estadisticos de
* ventas, compras e inventario. Ofrece un catalogo de 10 reportes, cada uno con sus
* propios filtros, carga las opciones de los filtros desde la API, ejecuta el reporte
* seleccionado, oculta las columnas de identificadores, muestra los resultados en una
* tabla paginada de 10 filas por pagina, calcula estadisticas de la consulta y permite
* exportar los resultados a un archivo CSV.
*
* ENTRADA: Reporte seleccionado y valores de filtros ingresados desde ReportesFiltro,
* y datos devueltos por las funciones ejecutarReporte y obtenerOpcionesReportes del
* servicio api.
*
* SALIDA: Interfaz con encabezado, tarjetas de estadisticas, barra de herramientas con
* filtros, tabla de resultados con paginacion y archivo CSV descargable.
*
* RESTRICCIONES: Requiere que el servicio api este disponible y que existan los
* componentes ReportesFiltro, ReportesTabla y StatCard, ademas del archivo de estilos
* reportes.css, en las rutas indicadas. Las filas devueltas por la API deben ser
* objetos con las mismas llaves para poder exportar el CSV.
*
* OBJETIVO: Permitir consultar y exportar informacion estadistica de la empresa desde
* una unica pantalla.
*
*---------------------------------------------------------------------------------------*/

// ============================================================
// IMPORTACIONES DE REACT
// ============================================================

import { useEffect, useState } from 'react';

// ============================================================
// ICONOS
// ============================================================

import { BarChart3, Database, Rows3, Sun } from 'lucide-react';

// ============================================================
// COMPONENTES
// ============================================================

import ReportesFiltro from '../components/reportes/ReportesFiltro';
import ReportesTabla from '../components/reportes/ReportesTabla';
import StatCard from '../components/StatCard';
import '../components/reportes/reportes.css';

// ============================================================
// FUNCIONES QUE SE COMUNICAN CON LA API
// ============================================================

import { ejecutarReporte, obtenerOpcionesReportes } from '../services/api';


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: POR_PAGINA
*
* DESCRIPCION: Constante que define la cantidad maxima de filas que se muestran por
* pagina en la tabla de resultados.
*
* ENTRADA: Ninguna.
*
* SALIDA: Valor numerico 10.
*
* RESTRICCIONES: Debe ser un numero entero mayor que cero.
*
* OBJETIVO: Controlar el tamano de la paginacion de la tabla de reportes.
*
*---------------------------------------------------------------------------------------*/

const POR_PAGINA = 10;


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: REPORTES
*
* DESCRIPCION: Catalogo de reportes disponibles. Cada reporte define su id (que se envia
* a la API), su titulo (que se muestra al usuario), su grupo (Compras, Ventas o
* Inventario) y los filtros que acepta. En cada filtro, el campo tipo indica de donde
* salen sus opciones (ver OPCIONES_VACIAS) o si es un campo de texto libre ('text').
*
* ENTRADA: Ninguna.
*
* SALIDA: Arreglo de objetos con la definicion de cada reporte.
*
* RESTRICCIONES: Los ids deben coincidir con los que reconoce la API y los tipos de
* filtro deben ser llaves de OPCIONES_VACIAS o 'text'.
*
* OBJETIVO: Centralizar la configuracion de los reportes y sus filtros.
*
*---------------------------------------------------------------------------------------*/

const REPORTES = [
  { id: 'comprasProveedores', titulo: 'Compras por proveedor', grupo: 'Compras', filtros: [
    { id: 'categoriaProveedor', label: 'Categoría de proveedor', tipo: 'categoriasProveedores' },
    { id: 'proveedor', label: 'Proveedor', tipo: 'text' }
  ] },
  { id: 'ventasClientes', titulo: 'Ventas por cliente', grupo: 'Ventas', filtros: [
    { id: 'categoriaCliente', label: 'Categoría de cliente', tipo: 'categoriasClientes' },
    { id: 'cliente', label: 'Cliente', tipo: 'text' }
  ] },
  { id: 'topProductos', titulo: 'Productos con más ganancia', grupo: 'Ventas', filtros: [
    { id: 'anio', label: 'Año', tipo: 'aniosVentas' }
  ] },
  { id: 'topClientes', titulo: 'Clientes con más facturas', grupo: 'Ventas', filtros: [
    { id: 'anio', label: 'Año', tipo: 'aniosVentas' }
  ] },
  { id: 'topProveedores', titulo: 'Proveedores con más órdenes', grupo: 'Compras', filtros: [
    { id: 'anio', label: 'Año', tipo: 'aniosCompras' }
  ] },
  { id: 'ventasCategorias', titulo: 'Ventas por categoría y año', grupo: 'Ventas', filtros: [] },
  { id: 'seguimientoClientes', titulo: 'Seguimiento de compras de clientes', grupo: 'Ventas', filtros: [
    { id: 'anio', label: 'Año', tipo: 'aniosVentas' },
    { id: 'mes', label: 'Mes', tipo: 'meses' },
    { id: 'categoriaProducto', label: 'Categoría de producto', tipo: 'categoriasProductos' }
  ] },
  { id: 'seguimientoProveedores', titulo: 'Seguimiento de compras a proveedores', grupo: 'Compras', filtros: [
    { id: 'anio', label: 'Año', tipo: 'aniosCompras' },
    { id: 'mes', label: 'Mes', tipo: 'meses' },
    { id: 'categoriaProducto', label: 'Categoría de producto', tipo: 'categoriasProductos' }
  ] },
  { id: 'rotacionInventario', titulo: 'Rotación de inventario', grupo: 'Inventario', filtros: [
    { id: 'categoriaProducto', label: 'Categoría de producto', tipo: 'categoriasProductos' },
    { id: 'anio', label: 'Año', tipo: 'aniosCompras' },
    { id: 'proveedor', label: 'Proveedor', tipo: 'proveedores' }
  ] },
  { id: 'metodoEnvioFavorito', titulo: 'Método de envío favorito', grupo: 'Ventas', filtros: [
    { id: 'anio', label: 'Año', tipo: 'aniosVentas' },
    { id: 'mes', label: 'Mes', tipo: 'meses' },
    { id: 'categoriaCliente', label: 'Categoría de cliente', tipo: 'categoriasClientes' },
    { id: 'categoriaProducto', label: 'Categoría de producto', tipo: 'categoriasProductos' },
    { id: 'producto', label: 'Producto', tipo: 'text' }
  ] }
];


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: OPCIONES_VACIAS
*
* DESCRIPCION: Valor inicial de las opciones de los filtros mientras la API responde.
* Cada llave corresponde a un tipo de filtro definido en REPORTES.
*
* ENTRADA: Ninguna.
*
* SALIDA: Objeto con arreglos vacios para cada tipo de opcion (aniosVentas,
* aniosCompras, meses, categoriasProductos, categoriasClientes, proveedores y
* categoriasProveedores).
*
* RESTRICCIONES: Debe contener una llave por cada tipo de filtro que no sea 'text'.
*
* OBJETIVO: Evitar errores de renderizado antes de recibir las opciones de la API.
*
*---------------------------------------------------------------------------------------*/

const OPCIONES_VACIAS = {
  aniosVentas: [],
  aniosCompras: [],
  meses: [],
  categoriasProductos: [],
  categoriasClientes: [],
  proveedores: [],
  categoriasProveedores: []
};


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: ES_ID
*
* DESCRIPCION: Expresion regular que reconoce las llaves de columnas que son
* identificadores: la llave "id", las que empiezan con "ID_" (ID_Producto, ID_Cliente,
* ID_Proveedor, ID_Categoria...) y las que terminan en "ID" (CustomerID, SupplierID,
* StockItemID...).
*
* ENTRADA: Ninguna.
*
* SALIDA: Expresion regular.
*
* RESTRICCIONES: Distingue mayusculas para no ocultar columnas cuyo nombre termine en
* "id" en minuscula como parte de una palabra normal.
*
* OBJETIVO: Identificar las columnas que no deben mostrarse al usuario.
*
*---------------------------------------------------------------------------------------*/

const ES_ID = /^id$|^ID_|ID$/;


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: quitarIds
*
* DESCRIPCION: Elimina de cada fila las columnas que son identificadores segun ES_ID.
*
* ENTRADA: filas - arreglo de objetos devuelto por la API.
*
* SALIDA: Nuevo arreglo de objetos sin las columnas de identificadores.
*
* RESTRICCIONES: Si la API devuelve algo que no es un arreglo, retorna un arreglo vacio.
*
* OBJETIVO: Evitar que los identificadores se muestren en la tabla o se exporten al CSV.
*
*---------------------------------------------------------------------------------------*/

function quitarIds(filas) {
  if (!Array.isArray(filas)) return [];

  return filas.map((fila) =>
    Object.fromEntries(Object.entries(fila).filter(([llave]) => !ES_ID.test(llave)))
  );
}


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: descargarCSV
*
* DESCRIPCION: Convierte las filas del reporte en un archivo CSV y lo descarga. Usa como
* columnas las llaves de la primera fila. La funcion interna escapar encierra cada valor
* entre comillas y duplica las comillas internas para que el CSV no se rompa. El
* caracter \uFEFF al inicio (BOM) permite que Excel muestre bien las tildes y la enie.
* El nombre del archivo sale del titulo del reporte.
*
* ENTRADA: filas - arreglo de objetos con los resultados del reporte.
* titulo - titulo del reporte, usado para el nombre del archivo.
*
* SALIDA: Descarga de un archivo .csv en el navegador. No retorna ningun valor.
*
* RESTRICCIONES: Si el arreglo de filas esta vacio la funcion no hace nada. Todas las
* filas deben tener las mismas llaves que la primera.
*
* OBJETIVO: Permitir exportar los resultados del reporte a un archivo CSV.
*
*---------------------------------------------------------------------------------------*/

function descargarCSV(filas, titulo) {
  if (!filas.length) return;

  const columnas = Object.keys(filas[0]);
  const escapar = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`;
  const contenido = [
    columnas.map(escapar).join(','),
    ...filas.map((fila) => columnas.map((columna) => escapar(fila[columna])).join(','))
  ].join('\n');
  const archivo = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = `${titulo.toLowerCase().replaceAll(' ', '-')}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: ReportesPage
*
* DESCRIPCION: Componente principal de la pagina de reportes. Controla la seleccion del
* reporte, los filtros propios de cada reporte, la carga de las opciones de los filtros,
* la ejecucion del reporte con manejo de errores, la exportacion a CSV, las estadisticas
* y la paginacion, y retorna la interfaz completa.
*
* ENTRADA: Ninguna (no recibe props).
*
* SALIDA: Elemento JSX con la pagina de reportes.
*
* RESTRICCIONES: Debe renderizarse dentro de la aplicacion con acceso a la API.
*
* OBJETIVO: Centralizar la consulta de reportes estadisticos en una sola vista.
*
*---------------------------------------------------------------------------------------*/

function ReportesPage() {

  // ----------------------------------------------------------
  // REPORTE Y FILTROS
  // ----------------------------------------------------------

  // Id del reporte seleccionado (por defecto, el primero).
  const [reporteId, setReporteId] = useState(REPORTES[0].id);

  // Valores de los filtros del reporte actual.
  const [filtros, setFiltros] = useState({});

  // Opciones disponibles para los filtros (anios, meses, categorias...).
  const [opciones, setOpciones] = useState(OPCIONES_VACIAS);


  // ----------------------------------------------------------
  // RESULTADOS
  // ----------------------------------------------------------

  // Filas devueltas por el reporte, ya sin columnas de identificadores.
  const [filas, setFilas] = useState([]);


  // ----------------------------------------------------------
  // ESTADO DE CARGA, ERROR Y PAGINACION
  // ----------------------------------------------------------

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);


  // ----------------------------------------------------------
  // DATOS DERIVADOS
  // ----------------------------------------------------------

  // Reporte completo (con titulo y filtros) segun el id seleccionado.
  const reporte = REPORTES.find((item) => item.id === reporteId);


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: Calculo de paginacion
  *
  * DESCRIPCION: Calcula el total de paginas, obtiene el subconjunto de filas que
  * corresponde a la pagina actual y genera los numeros de pagina que se muestran como
  * botones alrededor de la pagina actual.
  *
  * ENTRADA: Estados filas y pagina, constante POR_PAGINA.
  *
  * SALIDA: Variables totalPaginas, filasMostradas y numerosPagina.
  *
  * RESTRICCIONES: El total de paginas es como minimo 1.
  *
  * OBJETIVO: Mostrar los resultados del reporte divididos en paginas.
  *
  *-----------------------------------------------------------------------------------*/

  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const filasMostradas = filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Botones de pagina que se muestran alrededor de la pagina actual.
  const numerosPagina = Array.from({ length: totalPaginas }, (_, indice) => indice + 1)
    .slice(Math.max(0, pagina - 3), Math.min(totalPaginas, pagina + 2));


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: cargarReporte
  *
  * DESCRIPCION: Ejecuta un reporte en la API con los filtros recibidos. Si no se indican
  * valores, usa el reporte y los filtros actuales. Reinicia la paginacion a la primera
  * pagina, controla el indicador de carga, quita las columnas de identificadores de los
  * resultados y, si ocurre un error, vacia los resultados y guarda el mensaje de error.
  *
  * ENTRADA: id - identificador del reporte (por defecto reporteId).
  * valores - objeto con los filtros a aplicar (por defecto filtros).
  *
  * SALIDA: Actualiza los estados cargando, error, pagina y filas.
  *
  * RESTRICCIONES: Requiere conexion con la API mediante ejecutarReporte.
  *
  * OBJETIVO: Obtener y mostrar los resultados del reporte seleccionado.
  *
  *-----------------------------------------------------------------------------------*/

  const cargarReporte = async (id = reporteId, valores = filtros) => {
    setCargando(true);
    setError('');

    // Cada nueva consulta comienza en la pagina 1.
    setPagina(1);

    try {
      setFilas(quitarIds(await ejecutarReporte(id, valores)));
    } catch (err) {
      setFilas([]);
      setError(err.message || 'No se pudo cargar el reporte.');
    } finally {
      setCargando(false);
    }
  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: useEffect de carga inicial
  *
  * DESCRIPCION: Al montar el componente carga las opciones de los filtros y ejecuta el
  * primer reporte, quitando las columnas de identificadores de sus resultados. La
  * variable activo evita actualizar el estado si el componente se desmonta antes de que
  * responda la API.
  *
  * ENTRADA: Arreglo de dependencias vacio.
  *
  * SALIDA: Actualiza los estados opciones, filas, error y cargando.
  *
  * RESTRICCIONES: Se ejecuta unicamente en el montaje del componente. Requiere conexion
  * con la API mediante obtenerOpcionesReportes y ejecutarReporte.
  *
  * OBJETIVO: Inicializar los datos de la pantalla.
  *
  *-----------------------------------------------------------------------------------*/

  useEffect(() => {
    let activo = true;

    obtenerOpcionesReportes()
      .then((datos) => {
        if (activo) setOpciones(datos);
      })
      .catch((err) => {
        if (activo) setError(err.message || 'No se pudieron cargar las opciones.');
      });

    ejecutarReporte(REPORTES[0].id, {})
      .then((datos) => {
        if (activo) setFilas(quitarIds(datos));
      })
      .catch((err) => {
        if (activo) setError(err.message || 'No se pudo cargar el reporte.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: cambiarReporte
  *
  * DESCRIPCION: Cambia el reporte seleccionado, limpia los filtros y ejecuta el nuevo
  * reporte de inmediato.
  *
  * ENTRADA: id - identificador del reporte elegido.
  *
  * SALIDA: Actualiza los estados reporteId, filtros y los resultados.
  *
  * RESTRICCIONES: El id debe existir en el catalogo REPORTES.
  *
  * OBJETIVO: Permitir al usuario cambiar de reporte desde el selector.
  *
  *-----------------------------------------------------------------------------------*/

  const cambiarReporte = (id) => {
    setReporteId(id);
    setFiltros({});
    cargarReporte(id, {});
  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: restaurarFiltros
  *
  * DESCRIPCION: Limpia los filtros del reporte actual y vuelve a ejecutarlo sin ellos.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados filtros y los resultados.
  *
  * RESTRICCIONES: Requiere conexion con la API mediante ejecutarReporte.
  *
  * OBJETIVO: Volver a la consulta sin filtros del reporte seleccionado.
  *
  *-----------------------------------------------------------------------------------*/

  const restaurarFiltros = () => {
    setFiltros({});
    cargarReporte(reporteId, {});
  };


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

      {/* ENCABEZADO */}

      <div className="page-header">
        <div className="title-block">
          <div className="icon-box"><BarChart3 size={22} /></div>
          <div>
            <h1>Reportes</h1>
            <p>Consulta datos estadísticos de ventas, compras e inventario.</p>
          </div>
        </div>
        <div className="header-right">
          <span>{fechaTexto} | {horaTexto}</span>
          <div className="sun-icon"><Sun size={16} /></div>
        </div>
      </div>


      {/* ESTADISTICAS */}

      <div className="stats-row">
        <StatCard
          icon={BarChart3}
          color="blue"
          label="Reportes disponibles"
          value={REPORTES.length}
          sub="Consultas estadísticas"
        />
        <StatCard
          icon={Database}
          color="green"
          label="Resultados"
          value={filas.length}
          sub={reporte.titulo}
        />
        <StatCard
          icon={Rows3}
          color="yellow"
          label="Página actual"
          value={`${pagina} / ${totalPaginas}`}
          sub="Filas por página: 10"
        />
      </div>


      {/* TABLA */}

      <div className="table-card">

        {/* BARRA DE HERRAMIENTAS: selector de reporte, filtros, buscar, restaurar y exportar */}

        <ReportesFiltro
          reportes={REPORTES}
          reporteId={reporteId}
          filtros={filtros}
          opciones={opciones}
          cargando={cargando}
          hayResultados={filas.length > 0}
          onCambiarReporte={cambiarReporte}
          onCambiarFiltro={(nombre, valor) => setFiltros((actuales) => ({ ...actuales, [nombre]: valor }))}
          onBuscar={() => cargarReporte()}
          onRestaurar={restaurarFiltros}
          onExportar={() => descargarCSV(filas, reporte.titulo)}
        />

        {/* CARGANDO / ERROR / TABLA / PAGINACION */}

        <ReportesTabla
          filas={filas}
          cargando={cargando}
          error={error}
          pagina={pagina}
          totalPaginas={totalPaginas}
          filasMostradas={filasMostradas}
          numerosPagina={numerosPagina}
          onCambiarPagina={setPagina}
        />

      </div>

    </div>
  );
}


export default ReportesPage;