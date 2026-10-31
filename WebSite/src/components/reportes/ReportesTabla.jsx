// ============================================================
// FUNCIONES AUXILIARES
// ============================================================


// ============================================================
// tituloColumna
//
// Convierte el nombre de una columna de la base de datos en un
// título legible para el encabezado de la tabla.
//
// - Separa el nombre por guiones bajos (_).
// - Reemplaza "anio" por "Año".
// - Une las partes con espacios.
//
// Ejemplo: "Cantidad_Ventas" -> "Cantidad Ventas"
// ============================================================

function tituloColumna(nombre) {
  return nombre
    .split('_')
    .map((parte) => parte.toLowerCase() === 'anio' ? 'Año' : parte)
    .join(' ');
}


// ============================================================
// esNumerico
//
// Indica si un valor es un número, ya sea de tipo number o un
// texto que solo contiene un número (algunos drivers devuelven
// los DECIMAL de SQL Server como texto).
// ============================================================

function esNumerico(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor);
  return typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor.trim());
}


// ============================================================
// tipoColumna
//
// Clasifica una columna según su nombre y sus valores para
// decidir cómo se alinea y cómo se muestra:
//
// - texto:    nombres, categorías, fechas (alineado a la izquierda).
// - anio:     columna Anio (centrada, sin formato de miles).
// - posicion: columna Posicion (círculo con el número).
// - monto:    montos, ganancias, precios y los años del reporte
//             de ventas por categoría (círculo verde con $).
// - numero:   cantidades y otros números (círculo azul).
// ============================================================

function tipoColumna(columna, filas) {
  const tieneNumeros = filas.some((fila) => esNumerico(fila[columna]));

  if (!tieneNumeros) return 'texto';
  if (/^anio$/i.test(columna)) return 'anio';
  if (/^posicion$/i.test(columna)) return 'posicion';
  if (/^\d{4}$/.test(columna) || /monto|ganancia|precio/i.test(columna)) return 'monto';

  return 'numero';
}


// ============================================================
// mostrarValor
//
// Da formato al valor de una celda según el tipo de columna:
//
// - null o undefined: muestra un guion largo (—).
// - monto: formato en español con 2 decimales y signo $.
// - numero: formato en español con máximo 2 decimales.
// - anio / posicion: el número tal cual.
// - Fechas en texto ISO (ej. 2024-05-10T00:00:00): se formatean
//   como fecha corta, pero solo si el nombre de la columna
//   contiene "fecha", "factura" u "orden".
// - Cualquier otro valor: se convierte a texto.
// ============================================================

function mostrarValor(valor, columna, tipo) {
  if (valor === null || valor === undefined) return '—';

  if (tipo === 'monto' && esNumerico(valor)) {
    return '$' + new Intl.NumberFormat('es', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(valor));
  }

  if (tipo === 'numero' && esNumerico(valor)) {
    return new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(Number(valor));
  }

  if ((tipo === 'anio' || tipo === 'posicion') && esNumerico(valor)) {
    return String(Number(valor));
  }

  if (
    typeof valor === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(valor) &&
    /fecha|factura|orden/i.test(columna)
  ) {
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(valor));
  }

  return String(valor);
}


// ============================================================
// Celda
//
// Devuelve el contenido de una celda con el elemento visual que
// corresponde a su tipo de columna (texto, círculo de monto,
// círculo de cantidad o círculo de posición).
// ============================================================

function Celda({ valor, columna, tipo }) {
  const texto = mostrarValor(valor, columna, tipo);
  const vacio = valor === null || valor === undefined;

  if (vacio && tipo !== 'texto') {
    return <span className="rp-vacio">—</span>;
  }

  if (tipo === 'monto') {
    return <span className="rp-pill rp-pill-monto" title={texto}>{texto}</span>;
  }

  if (tipo === 'numero') {
    return <span className="rp-pill rp-pill-numero" title={texto}>{texto}</span>;
  }

  if (tipo === 'posicion') {
    const numero = Number(valor);
    const clase = numero >= 1 && numero <= 3 ? `rp-posicion-${numero}` : 'rp-posicion-otro';
    return <span className={`rp-posicion ${clase}`}>{texto}</span>;
  }

  if (tipo === 'anio') {
    return <span className="rp-anio">{texto}</span>;
  }

  return <span className="reportes-celda" title={texto}>{texto}</span>;
}


// ============================================================
// ReportesTabla
//
// Tabla de resultados de un reporte.
//
// Aquí se controla:
//
// - Mensaje de error.
// - Estado de carga.
// - Encabezados y filas generados según las columnas del reporte.
// - Alineación y formato de cada columna según su tipo.
// - Mensaje cuando no hay resultados.
// - Paginación.
//
// Recibe por props:
//
// - filas: todas las filas del reporte (sin paginar).
// - cargando: indica si se está consultando la API.
// - error: mensaje de error (vacío si no hay).
// - pagina / totalPaginas: página actual y total de páginas.
// - filasMostradas: filas de la página actual.
// - numerosPagina: botones de página a mostrar.
// - onCambiarPagina: función para cambiar de página.
// ============================================================

function ReportesTabla({
  filas,
  cargando,
  error,
  pagina,
  totalPaginas,
  filasMostradas,
  numerosPagina,
  onCambiarPagina
}) {

  // ----------------------------------------------------------
  // COLUMNAS
  //
  // Se toman de las llaves de la primera fila, por lo que la
  // tabla se adapta a cualquier reporte. A cada columna se le
  // asigna un tipo que define su alineación y formato.
  // ----------------------------------------------------------

  const columnas = filas.length
    ? Object.keys(filas[0]).map((nombre) => ({ nombre, tipo: tipoColumna(nombre, filas) }))
    : [];


  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <>

      {/* MENSAJE DE ERROR */}

      {error && <p className="reportes-error" role="alert">{error}</p>}


      {/* CARGANDO / TABLA / SIN RESULTADOS */}

      {cargando ? (
        <p className="reportes-estado">Cargando reporte...</p>
      ) : filas.length ? (
        <div className="reportes-tabla-contenedor">
          <table className="reportes-tabla">

            {/* ENCABEZADOS */}

            <thead>
              <tr>
                {columnas.map(({ nombre, tipo }) => (
                  <th className={`rp-col-${tipo}`} key={nombre}>{tituloColumna(nombre)}</th>
                ))}
              </tr>
            </thead>

            {/* FILAS (solo las de la página actual) */}

            <tbody>
              {filasMostradas.map((fila, indice) => (
                <tr key={`${pagina}-${indice}`}>
                  {columnas.map(({ nombre, tipo }) => (
                    <td className={`rp-col-${tipo}`} key={nombre}>
                      <Celda valor={fila[nombre]} columna={nombre} tipo={tipo} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      ) : (
        <p className="reportes-estado">
          {error ? 'No se pudo completar el reporte.' : 'No se encontraron resultados.'}
        </p>
      )}


      {/* PAGINACIÓN */}

      {!cargando && filas.length > 0 && (
        <div className="reportes-paginacion">
          <span>
            Mostrando {(pagina - 1) * 10 + 1} - {Math.min(pagina * 10, filas.length)} de {filas.length} resultados
          </span>
          <div className="reportes-paginas">
            <button
              aria-label="Página anterior"
              disabled={pagina === 1}
              onClick={() => onCambiarPagina(pagina - 1)}
              type="button"
            >
              ‹
            </button>
            {numerosPagina.map((numero) => (
              <button
                className={pagina === numero ? 'activo' : ''}
                key={numero}
                onClick={() => onCambiarPagina(numero)}
                type="button"
              >
                {numero}
              </button>
            ))}
            <button
              aria-label="Página siguiente"
              disabled={pagina === totalPaginas}
              onClick={() => onCambiarPagina(pagina + 1)}
              type="button"
            >
              ›
            </button>
          </div>
        </div>
      )}

    </>
  );
}


export default ReportesTabla;