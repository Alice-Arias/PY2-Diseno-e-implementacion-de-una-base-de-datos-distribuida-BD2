/*---------------------------------------------------------------------------------------*
* NOMBRE: formato.js
*
* DESCRIPCION: Formatos de fechas y montos que se repiten en varias pantallas.
* Todos usan el formato de Costa Rica (es-CR) y devuelven '-' si no hay valor.
*
* ENTRADA: Una fecha (texto o Date) o un número.
*
* SALIDA: Texto listo para mostrar.
*
* OBJETIVO: Que las fechas y los montos se vean igual en toda la aplicación.
*-----------------------------------------------------------------------------------------*/

const estaVacio = (valor) => valor === null || valor === undefined;

/* 1520.5 -> "USD 1 520,50" */
export const formatoMoneda = (monto) =>
    estaVacio(monto) ? '-' : Number(monto).toLocaleString('es-CR', { style: 'currency', currency: 'USD' });

/* "2026-03-04" -> "04 mar 2026" (mes 'short') o "04 de marzo de 2026" (mes 'long') */
export const formatoFecha = (fecha, mes = 'short') =>
    fecha ? new Date(fecha).toLocaleDateString('es-CR', { day: '2-digit', month: mes, year: 'numeric' }) : '-';

/* "2026-11-13T08:00:00" -> "13/11/26, 8:00 a. m." ; sin fecha devuelve "textoVacio". */
export const formatoFechaHora = (fecha, textoVacio = '') =>
    fecha ? new Date(fecha).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : textoVacio;
