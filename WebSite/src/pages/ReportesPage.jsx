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
import useListadoServidor from '../hooks/useListadoServidor';

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
* CORREGIDO PY2:
*   - La paginación de los reportes la hace SQL Server (@Pagina en cada SP).
*   - Ya no se filtran columnas ID en React: los SP ya no las devuelven.
*   - El CSV pide al SP todas las filas (?exportar=1); el navegador solo arma
*     el archivo con lo que SQL devolvió.
*-----------------------------------------------------------------------------------------*/

const POR_PAGINA_REPORTES = 10;

/* Adaptador para el hook: separa el id del reporte de sus filtros. */
const listarReporte = ({ reporte, ...filtros }) => ejecutarReporte(reporte, filtros);

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

function ReportesPage() {
  const [reporteId, setReporteId] = useState(REPORTES[0].id);
  // Filtros que el usuario está escribiendo (todavía no aplicados).
  const [filtros, setFiltros] = useState({});
  const [opciones, setOpciones] = useState(OPCIONES_VACIAS);
  const [errorOpciones, setErrorOpciones] = useState('');
  const [exportando, setExportando] = useState(false);

  const listado = useListadoServidor(listarReporte, {
    porPagina: POR_PAGINA_REPORTES,
    filtrosIniciales: { reporte: REPORTES[0].id }
  });

  const reporte = REPORTES.find((item) => item.id === reporteId);
  const info = listado.paginacion;

  useEffect(() => {
    obtenerOpcionesReportes()
      .then(setOpciones)
      .catch((err) => setErrorOpciones(err.message || 'No se pudieron cargar las opciones.'));
  }, []);

  const cambiarReporte = (id) => {
    setReporteId(id);
    setFiltros({});
    listado.reemplazarFiltros({ reporte: id });
  };

  const generarReporte = () => {
    listado.reemplazarFiltros({ reporte: reporteId, ...filtros });
  };

  const restaurarFiltros = () => {
    setFiltros({});
    listado.reemplazarFiltros({ reporte: reporteId });
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const { reporte: id, ...aplicados } = listado.filtros;
      const respuesta = await ejecutarReporte(id, { ...aplicados, exportar: 1 });
      descargarCSV(respuesta.datos || [], reporte.titulo);
    } catch (err) {
      console.error(err);
    } finally {
      setExportando(false);
    }
  };

  const ahora = new Date();
  const fechaTexto = ahora.toLocaleDateString('es-CR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
  const horaTexto = ahora.toLocaleTimeString('es-CR', {
    hour: '2-digit', minute: '2-digit', hour12: false
  });

  return (
    <div>
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
          value={info.Total_Registros ?? 0}
          sub={reporte.titulo}
        />
        <StatCard
          icon={Rows3}
          color="yellow"
          label="Página actual"
          value={`${listado.pagina} / ${info.Total_Paginas ?? 1}`}
          sub={`Filas por página: ${POR_PAGINA_REPORTES}`}
        />
      </div>

      <div className="table-card">
        <ReportesFiltro
          reportes={REPORTES}
          reporteId={reporteId}
          filtros={filtros}
          opciones={opciones}
          cargando={listado.cargando || exportando}
          hayResultados={(info.Total_Registros ?? 0) > 0}
          onCambiarReporte={cambiarReporte}
          onCambiarFiltro={(nombre, valor) => setFiltros((actuales) => ({ ...actuales, [nombre]: valor }))}
          onBuscar={generarReporte}
          onRestaurar={restaurarFiltros}
          onExportar={exportar}
        />

        <ReportesTabla
          filas={listado.filas}
          cargando={listado.cargando}
          error={listado.error || errorOpciones}
          pagina={listado.pagina}
          totalPaginas={info.Total_Paginas ?? 1}
          totalRegistros={info.Total_Registros ?? 0}
          onCambiarPagina={listado.cambiarPagina}
        />
      </div>
    </div>
  );
}

export default ReportesPage;
