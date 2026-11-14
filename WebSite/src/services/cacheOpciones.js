/*---------------------------------------------------------------------------------------*
* NOMBRE: cacheOpciones.js
*
* DESCRIPCION: Guarda en memoria las listas de los formularios (proveedores, clientes,
* productos...) para no pedirlas otra vez cada vez que se abre un formulario.
*
* ENTRADA: Una clave ('inventario', 'ventas') y la función que carga la lista.
*
* SALIDA: conCache(clave, cargar) y limpiarCacheOpciones().
*
* OBJETIVO: Que los formularios abran rápido.
*-----------------------------------------------------------------------------------------*/

const listasGuardadas = {};

export function conCache(clave, cargar) {
    if (!listasGuardadas[clave]) {
        listasGuardadas[clave] = cargar().catch((error) => {
            delete listasGuardadas[clave];   // Si falla, se vuelve a intentar la próxima vez.
            throw error;
        });
    }
    return listasGuardadas[clave];
}

/* Se usa después de crear, modificar o eliminar un producto: las listas cambiaron. */
export function limpiarCacheOpciones() {
    Object.keys(listasGuardadas).forEach((clave) => delete listasGuardadas[clave]);
}
