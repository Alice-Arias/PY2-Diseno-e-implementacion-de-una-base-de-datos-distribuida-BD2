/*---------------------------------------------------------------------------------------*
* NOMBRE: parametros.js
* ENTRADA: Valores de la URL o del cuerpo de la petición.
* DESCRIPCION: Limpia valores y agrega parámetros a un procedimiento.
* SALIDA: numero, texto y agregarParametros.
* OBJETIVO: No repetir lo mismo en cada ruta.
*-----------------------------------------------------------------------------------------*/

const estaVacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';

/* Número, o null si viene vacío. */
const numero = (valor) => (valor === undefined || valor === null || valor === '' ? null : Number(valor));

/* Texto sin espacios a los lados, o null si viene vacío. */
const texto = (valor) => (estaVacio(valor) ? null : String(valor).trim());

/*---------------------------------------------------------------------------------------*
* NOMBRE: agregarParametros
* ENTRADA: request y lista de [nombre, tipo, valor].
* SALIDA: El request con los parámetros agregados.
*-----------------------------------------------------------------------------------------*/
function agregarParametros(request, parametros) {
    for (const [nombre, tipo, valor] of parametros) {
        request.input(nombre, tipo, valor);
    }
    return request;
}

module.exports = { numero, texto, agregarParametros };
