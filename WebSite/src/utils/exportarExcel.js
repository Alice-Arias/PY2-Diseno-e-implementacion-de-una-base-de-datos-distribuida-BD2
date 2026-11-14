/*---------------------------------------------------------------------------------------*
* NOMBRE: exportarExcel.js
*
* DESCRIPCION: Descarga un reporte como archivo de Excel (.xlsx) con:
*   - encabezado: empresa, reporte, sucursal, filtros, fecha y usuario;
*   - títulos de columna legibles (Monto_Total -> "Monto total");
*   - montos con formato de dólares y filtros en los encabezados.
* Las columnas de años (2014, 2015...) van al final, como en la pantalla.
*
* ENTRADA: filas del reporte y { titulo, sucursal, filtrosTexto, usuario }.
*
* SALIDA: El archivo se descarga en el navegador.
*
* OBJETIVO: Entregar el reporte en un formato que se pueda abrir y filtrar en Excel.
*-----------------------------------------------------------------------------------------*/

import * as XLSX from 'xlsx';

const COLUMNA_DE_DINERO = /monto|ganancia|precio|costo|venta|compra|total_fact/i;
const esColumnaDeAnio = (columna) => /^\d+$/.test(columna);

const nombreLegible = (columna) =>
    esColumnaDeAnio(columna) ? columna : columna.replaceAll('_', ' ').replace(/^./, (letra) => letra.toUpperCase());

/* Quita tildes y espacios: "Ventas por cliente" -> "ventas-por-cliente" */
const nombreDeArchivo = (texto) =>
    texto.toLowerCase().replaceAll(' ', '-').normalize('NFD').replace(/[̀-ͯ]/g, '');

export function descargarExcel(filas, { titulo, sucursal, filtrosTexto, usuario }) {
    if (!filas.length) return;

    const claves = Object.keys(filas[0]);
    const columnas = [...claves.filter((clave) => !esColumnaDeAnio(clave)), ...claves.filter(esColumnaDeAnio)];
    const esDinero = columnas.map((columna) =>
        esColumnaDeAnio(columna) || (COLUMNA_DE_DINERO.test(columna) && !/cantidad|posicion/i.test(columna)));

    const generado = new Date().toLocaleString('es-CR', { dateStyle: 'long', timeStyle: 'short' });
    const encabezado = [
        ['Wide World Importers'],
        [titulo],
        [`Sucursal: ${sucursal}`],
        [`Filtros: ${filtrosTexto || 'ninguno'}`],
        [`Generado el ${generado} por ${usuario}`],
        []
    ];
    const titulos = columnas.map(nombreLegible);
    const datos = filas.map((fila) => columnas.map((columna) => fila[columna] ?? ''));

    const hoja = XLSX.utils.aoa_to_sheet([...encabezado, titulos, ...datos]);

    /* Formato de dólares en las columnas de dinero. */
    const primeraFilaDeDatos = encabezado.length + 1;
    datos.forEach((fila, numeroFila) => {
        fila.forEach((valor, numeroColumna) => {
            if (esDinero[numeroColumna] && typeof valor === 'number') {
                const celda = hoja[XLSX.utils.encode_cell({ r: primeraFilaDeDatos + numeroFila, c: numeroColumna })];
                if (celda) celda.z = '"$"#,##0.00';
            }
        });
    });

    /* Encabezado combinado a lo ancho, ancho de columnas y filtros en los títulos. */
    const ultimaColumna = Math.max(columnas.length - 1, 0);
    hoja['!merges'] = encabezado.slice(0, 5).map((_, fila) => ({ s: { r: fila, c: 0 }, e: { r: fila, c: ultimaColumna } }));
    hoja['!cols'] = columnas.map((_, numeroColumna) => ({
        wch: Math.min(45, Math.max(titulos[numeroColumna].length,
            ...datos.slice(0, 200).map((fila) => String(fila[numeroColumna]).length)) + 3)
    }));
    hoja['!autofilter'] = {
        ref: XLSX.utils.encode_range({
            s: { r: encabezado.length, c: 0 },
            e: { r: encabezado.length + datos.length, c: columnas.length - 1 }
        })
    };

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, titulo.slice(0, 31));
    XLSX.writeFile(libro, `${nombreDeArchivo(titulo)}-${nombreDeArchivo(sucursal)}.xlsx`);
}
