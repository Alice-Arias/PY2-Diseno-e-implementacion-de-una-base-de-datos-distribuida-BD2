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
import RelojTema from '../components/RelojTema';   // PY2: hora en vivo y tema
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
import ResumenSucursales from '../components/reportes/ResumenSucursales';
import * as XLSX from 'xlsx';   // PY2: descarga en Excel
import { obtenerUsuario } from '../services/sesion';






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

/*---------------------------------------------------------------------------------------*
* PY2: DESCARGA EN EXCEL (.xlsx)
* Encabezado con empresa, reporte, sucursal, filtros, fecha y usuario; columnas con
* nombres legibles, montos con formato de dólares y anchos ajustados al contenido.
*-----------------------------------------------------------------------------------------*/
const COLUMNA_MONEDA = /monto|ganancia|precio|costo|venta|compra|total_fact/i;

const nombreLegible = (columna) =>
  /^\d+$/.test(columna) ? columna : columna.replaceAll('_', ' ').replace(/^./, (l) => l.toUpperCase());

function descargarExcel(filas, { titulo, sucursal, filtrosTexto, usuario }) {
  if (!filas.length) return;

  const claves = Object.keys(filas[0]);
  const columnas = [...claves.filter((k) => !/^\d+$/.test(k)), ...claves.filter((k) => /^\d+$/.test(k))];
  const esMoneda = columnas.map((c) => /^\d+$/.test(c) || (COLUMNA_MONEDA.test(c) && !/cantidad|posicion/i.test(c)));
  const ahora = new Date().toLocaleString('es-CR', { dateStyle: 'long', timeStyle: 'short' });

  const encabezado = [
    ['Wide World Importers'],
    [titulo],
    [`Sucursal: ${sucursal}`],
    [`Filtros: ${filtrosTexto || 'ninguno'}`],
    [`Generado el ${ahora} por ${usuario}`],
    []
  ];
  const filaTitulos = columnas.map(nombreLegible);
  const datos = filas.map((fila) => columnas.map((c) => {
    const valor = fila[c];
    return valor === null || valor === undefined ? '' : valor;
  }));

  const hoja = XLSX.utils.aoa_to_sheet([...encabezado, filaTitulos, ...datos]);
  const inicioDatos = encabezado.length + 1;

  /* Formato de dólares en las columnas de montos */
  datos.forEach((fila, i) => {
    fila.forEach((valor, j) => {
      if (esMoneda[j] && typeof valor === 'number') {
        const celda = hoja[XLSX.utils.encode_cell({ r: inicioDatos + i, c: j })];
        if (celda) celda.z = '"$"#,##0.00';
      }
    });
  });

  /* Título combinado y anchos de columna según el contenido */
  hoja['!merges'] = encabezado.slice(0, 5).map((_, r) => ({ s: { r, c: 0 }, e: { r, c: Math.max(columnas.length - 1, 0) } }));
  hoja['!cols'] = columnas.map((c, j) => ({
    wch: Math.min(45, Math.max(filaTitulos[j].length, ...datos.slice(0, 200).map((f) => String(f[j]).length)) + 3)
  }));
  hoja['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: encabezado.length, c: 0 }, e: { r: encabezado.length + datos.length, c: columnas.length - 1 } }) };

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, titulo.slice(0, 31));
  const archivo = `${titulo.toLowerCase().replaceAll(' ', '-')}-${sucursal.toLowerCase().replaceAll(' ', '-')}.xlsx`;
  XLSX.writeFile(libro, archivo.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

function ReportesPage() {
  const [reporteId, setReporteId] = useState(REPORTES[0].id);
  // Filtros que el usuario está escribiendo (todavía no aplicados).
  const [filtros, setFiltros] = useState({});
  const [opciones, setOpciones] = useState(OPCIONES_VACIAS);
  const [errorOpciones, setErrorOpciones] = useState('');
  const [exportando, setExportando] = useState(false);
  // PY2: '' = consolidado, '1' = San José, '2' = Limón. Filtra todos los reportes.
  const [sucursal, setSucursal] = useState('');

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
    listado.reemplazarFiltros({ reporte: id, sucursal });
  };

  const generarReporte = () => {
    listado.reemplazarFiltros({ reporte: reporteId, ...filtros, sucursal });
  };

  const restaurarFiltros = () => {
    setFiltros({});
    listado.reemplazarFiltros({ reporte: reporteId, sucursal });
  };

  /* PY2: al cambiar de sucursal se vuelve a ejecutar el reporte con los mismos filtros. */
  const cambiarSucursal = (valor) => {
    setSucursal(valor);
    listado.reemplazarFiltros({ ...listado.filtros, sucursal: valor });
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const { reporte: id, ...aplicados } = listado.filtros;
      const respuesta = await ejecutarReporte(id, { ...aplicados, exportar: 1 });
      const nombresSucursal = { '': 'Consolidado', 1: 'San José', 2: 'Limón' };
      const filtrosTexto = reporte.filtros
        .filter((campo) => aplicados[campo.id])
        .map((campo) => `${campo.label}: ${aplicados[campo.id]}`)
        .join(' | ');
      descargarExcel(respuesta.datos || [], {
        titulo: reporte.titulo,
        sucursal: nombresSucursal[aplicados.sucursal ?? ''] ?? 'Consolidado',
        filtrosTexto,
        usuario: obtenerUsuario()?.fullname ?? ''
      });
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
            <p>Estadísticas de cada sucursal o consolidadas: ventas, compras e inventario.</p>
          </div>
        </div>
        <div className="header-right">
          <RelojTema />
        </div>
      </div>

      <ResumenSucursales sucursal={sucursal} onCambiarSucursal={cambiarSucursal} />

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
