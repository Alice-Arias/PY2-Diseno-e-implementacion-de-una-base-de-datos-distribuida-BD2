/*---------------------------------------------------------------------------------------*
* NOMBRE: formulario.js
*
* DESCRIPCION: Conversiones que usan todos los formularios:
*   - de la base de datos al formulario (los campos de un <input> siempre son texto);
*   - del formulario a la API (números, null en lo opcional, texto sin espacios).
*
* ENTRADA: Un valor.
*
* SALIDA: El valor convertido.
*
* OBJETIVO: No repetir estas pequeñas funciones en cada módulo.
*-----------------------------------------------------------------------------------------*/

/* ---------------------- de la base de datos al formulario ---------------------- */

/* null o undefined -> '' (para que el <input> no quede sin valor). */
export const textoDe = (valor) => valor ?? '';

/* 15 -> '15'; null -> '' (los <select> trabajan con texto). */
export const idDe = (valor) => (valor != null ? String(valor) : '');

/* Número o el valor por defecto, como texto: (null, '0') -> '0'. */
export const numeroComoTexto = (valor, porDefecto) => (valor != null ? String(valor) : porDefecto);

/* ---------------------------- del formulario a la API ---------------------------- */

/* Texto sin espacios a los lados (null -> ''). */
export const limpio = (valor) => String(valor ?? '').trim();

/* Texto opcional: vacío -> null. */
export const textoOpcional = (valor) => (limpio(valor) === '' ? null : limpio(valor));

/* Número opcional: vacío -> null. */
export const numeroOpcional = (valor) => (limpio(valor) === '' ? null : Number(valor));

/* ID opcional de un <select>: '' -> null. */
export const idOpcional = (valor) => (valor === '' || valor == null ? null : Number(valor));

/* Devuelve el primer mensaje de error de una lista de reglas, o null si todo está bien. */
export const primerError = (reglas) => reglas.find(Boolean) || null;
