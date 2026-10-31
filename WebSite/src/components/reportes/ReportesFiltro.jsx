// ============================================================
// ICONOS
// ============================================================

import { Download, FileBarChart2, RotateCcw } from 'lucide-react';


// ============================================================
// ReportesFiltro
//
// Barra de herramientas de la página de reportes.
//
// Aquí se controla:
//
// - Selector del tipo de reporte.
// - Filtros propios del reporte seleccionado (listas o texto).
// - Botón para generar el reporte.
// - Botón para restaurar los filtros.
// - Botón para exportar los resultados a CSV.
//
// Recibe por props:
//
// - reportes: catálogo de reportes disponibles.
// - reporteId: id del reporte seleccionado.
// - filtros: valores actuales de los filtros.
// - opciones: opciones disponibles para las listas (años, meses...).
// - cargando: indica si se está consultando la API.
// - hayResultados: indica si el reporte tiene filas.
// - onCambiarReporte / onCambiarFiltro: cambian el reporte o un filtro.
// - onBuscar / onRestaurar / onExportar: acciones de los botones.
// ============================================================

function ReportesFiltro({
  reportes,
  reporteId,
  filtros,
  opciones,
  cargando,
  hayResultados,
  onCambiarReporte,
  onCambiarFiltro,
  onBuscar,
  onRestaurar,
  onExportar
}) {

  // ----------------------------------------------------------
  // REPORTE SELECCIONADO
  //
  // Se usa para saber qué filtros mostrar.
  // ----------------------------------------------------------

  const reporte = reportes.find((item) => item.id === reporteId);


  // ============================================================
  // opcionesDeFiltro
  //
  // Convierte las opciones que llegan de la API en el formato
  // { valor, nombre } que usan los <option> de cada lista.
  //
  // - Años: usan el campo "Anio" como valor y como nombre.
  // - Meses: usan "ID" como valor y "Nombre" como nombre.
  // - Demás listas (categorías, proveedores): usan "Nombre"
  //   como valor y como nombre.
  // ============================================================

  const opcionesDeFiltro = (tipo) => {
    if (tipo === 'aniosVentas' || tipo === 'aniosCompras') {
      const anios = tipo === 'aniosVentas'
        ? opciones.aniosVentas
        : opciones.aniosCompras;

      return anios.map(({ Anio }) => ({ valor: Anio, nombre: Anio }));
    }

    return (opciones[tipo] || []).map((opcion) => ({
      valor: tipo === 'meses' ? opcion.ID : opcion.Nombre,
      nombre: opcion.Nombre
    }));
  };


  // ============================================================
  // INTERFAZ
  //
  // Es un <form>: al presionar Enter o el botón "Generar reporte"
  // se ejecuta onBuscar (el submit nativo se cancela).
  // ============================================================

  return (
    <form
      className="toolbar reportes-toolbar"
      onSubmit={(event) => {
        event.preventDefault();
        onBuscar();
      }}
    >

      {/* Selector del tipo de reporte */}

      <select
        aria-label="Tipo de reporte"
        value={reporteId}
        onChange={(event) => onCambiarReporte(event.target.value)}
      >
        {reportes.map((item) => (
          <option key={item.id} value={item.id}>{item.grupo}: {item.titulo}</option>
        ))}
      </select>

      {/* Filtros del reporte: campo de texto o lista según el tipo */}

      {reporte.filtros.map((campo) => (
        campo.tipo === 'text' ? (
          <input
            className="reportes-filtro-texto"
            key={campo.id}
            aria-label={campo.label}
            placeholder={`${campo.label}...`}
            value={filtros[campo.id] || ''}
            onChange={(event) => onCambiarFiltro(campo.id, event.target.value)}
          />
        ) : (
          <select
            key={campo.id}
            aria-label={campo.label}
            value={filtros[campo.id] || ''}
            onChange={(event) => onCambiarFiltro(campo.id, event.target.value)}
          >
            <option value="">Todos: {campo.label}</option>
            {opcionesDeFiltro(campo.tipo).map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.nombre}</option>
            ))}
          </select>
        )
      ))}

      {/* Generar reporte (se desactiva mientras carga) */}

      <button className="btn-filtros" disabled={cargando} type="submit">
        <FileBarChart2 size={16} />
        Generar reporte
      </button>

      {/* Restaurar filtros */}

      <button className="btn-restaurar" onClick={onRestaurar} type="button">
        <RotateCcw size={15} />
        Restaurar
      </button>

      {/* Exportar a CSV (se desactiva si no hay resultados o está cargando) */}

      <button
        className="btn-restaurar reportes-descargar"
        disabled={!hayResultados || cargando}
        onClick={onExportar}
        type="button"
        title="Descargar resultados como CSV"
      >
        <Download size={15} />
        CSV
      </button>

    </form>
  );
}


export default ReportesFiltro;