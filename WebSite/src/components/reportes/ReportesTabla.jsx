/*---------------------------------------------------------------------------------------*
* NOMBRE: ReportesTabla.jsx
*
* DESCRIPCION: Tabla de resultados de un reporte. Las columnas salen de los datos y se
* muestran según su tipo:
*   monto     -> $1.234,50 en una píldora verde (montos, ganancias, precios y años).
*   numero    -> 1.234 en una píldora azul.
*   posicion  -> medalla para los tres primeros.
*   anio      -> el año tal cual.
*   texto     -> el texto (fechas con formato corto).
* Las columnas de años (2014, 2015...) van al final.
*
* ENTRADA: filas, cargando, error, pagina, totalPaginas, totalRegistros y
*          onCambiarPagina(numero).
*
* SALIDA: La tabla con su paginación, o el mensaje de estado.
*
* OBJETIVO: Mostrar cualquier reporte sin escribir una tabla para cada uno.
*-----------------------------------------------------------------------------------------*/

import Paginacion from '../common/Paginacion';

const esColumnaDeAnio = (columna) => /^\d+$/.test(columna);

/* "Monto_Total" -> "Monto Total"; "Anio" -> "Año" */
const tituloColumna = (nombre) =>
    nombre.split('_').map((parte) => (parte.toLowerCase() === 'anio' ? 'Año' : parte)).join(' ');

function esNumerico(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor);
    return typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor.trim());
}

function tipoColumna(columna, filas) {
    if (!filas.some((fila) => esNumerico(fila[columna]))) return 'texto';
    if (/^anio$/i.test(columna)) return 'anio';
    if (/^posicion$/i.test(columna)) return 'posicion';
    if (/^\d{4}$/.test(columna) || /monto|ganancia|precio/i.test(columna)) return 'monto';
    return 'numero';
}

function textoCelda(valor, columna, tipo) {
    if (valor === null || valor === undefined) return '—';
    if (tipo === 'monto' && esNumerico(valor)) {
        return '$' + new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(valor));
    }
    if (tipo === 'numero' && esNumerico(valor)) {
        return new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(Number(valor));
    }
    if ((tipo === 'anio' || tipo === 'posicion') && esNumerico(valor)) {
        return String(Number(valor));
    }
    const esFecha = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor) && /fecha|factura|orden/i.test(columna);
    if (esFecha) {
        return new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(valor));
    }
    return String(valor);
}

function Celda({ valor, columna, tipo }) {
    const texto = textoCelda(valor, columna, tipo);
    const vacio = valor === null || valor === undefined;

    if (vacio && tipo !== 'texto') return <span className="rp-vacio">—</span>;
    if (tipo === 'monto') return <span className="rp-pill rp-pill-monto" title={texto}>{texto}</span>;
    if (tipo === 'numero') return <span className="rp-pill rp-pill-numero" title={texto}>{texto}</span>;
    if (tipo === 'anio') return <span className="rp-anio">{texto}</span>;
    if (tipo === 'posicion') {
        const posicion = Number(valor);
        const clase = posicion >= 1 && posicion <= 3 ? `rp-posicion-${posicion}` : 'rp-posicion-otro';
        return <span className={`rp-posicion ${clase}`}>{texto}</span>;
    }
    return <span className="reportes-celda" title={texto}>{texto}</span>;
}

function Generando({ como: Etiqueta, clase }) {
    return (
        <Etiqueta className={clase} role="status">
            <span className="reportes-spinner" aria-hidden="true" />
            Generando el reporte...
        </Etiqueta>
    );
}

function ReportesTabla({ filas, cargando, error, pagina, totalPaginas, totalRegistros, onCambiarPagina }) {
    const claves = filas.length ? Object.keys(filas[0]) : [];
    const columnas = [...claves.filter((clave) => !esColumnaDeAnio(clave)), ...claves.filter(esColumnaDeAnio)]
        .map((nombre) => ({ nombre, tipo: tipoColumna(nombre, filas) }));
    const hayFilas = filas.length > 0;

    return (
        <>
            {error && <p className="reportes-error" role="alert">{error}</p>}

            {/* Al cambiar de página o de filtros se mantiene la tabla anterior con un aviso. */}
            {cargando && hayFilas && <Generando como="div" clase="reportes-actualizando" />}

            {cargando && !hayFilas ? (
                <Generando como="p" clase="reportes-estado" />
            ) : hayFilas ? (
                <div className={`reportes-tabla-contenedor ${cargando ? 'esta-cargando' : ''}`}>
                    <table className="reportes-tabla tabla-coherente">
                        <thead>
                            <tr>
                                {columnas.map(({ nombre, tipo }) => (
                                    <th className={`rp-col-${tipo}`} key={nombre}>{tituloColumna(nombre)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((fila, posicion) => (
                                <tr key={`${pagina}-${posicion}`}>
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

            {hayFilas && (
                <Paginacion
                    pagina={pagina}
                    totalPaginas={totalPaginas}
                    totalRegistros={totalRegistros}
                    porPagina={10}
                    cargando={cargando}
                    onCambiar={onCambiarPagina}
                    claseContenedor="reportes-paginacion"
                    claseBotones="reportes-paginas"
                />
            )}
        </>
    );
}

export default ReportesTabla;
