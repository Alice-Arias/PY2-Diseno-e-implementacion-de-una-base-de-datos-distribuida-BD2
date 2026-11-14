/*---------------------------------------------------------------------------------------*
* NOMBRE: inventarioApi.js
*
* DESCRIPCION: Productos e inventario de la sucursal (/api/inventarios).
*
* ENTRADA: Filtros de la tabla, IDs o datos del formulario.
*
* SALIDA: inventarioApi con listar, resumen, detalle, opciones, sugerir, crear,
* actualizar y eliminar.
*
* OBJETIVO: Reunir en un archivo todo lo que el módulo Inventario pide a la API.
*-----------------------------------------------------------------------------------------*/

import { pedirApi, construirConsulta } from './http';
import { conCache } from './cacheOpciones';

const listar = ({ nombre, grupo, cantidad, pagina = 1, tamano = 10 } = {}) =>
    pedirApi(`/inventarios${construirConsulta({ nombre, grupo, cantidad, pagina, tamano })}`, {
        mensajeError: 'Error al obtener inventarios'
    });

export const inventarioApi = {
    listar,
    resumen: () => pedirApi('/inventarios/resumen', { mensajeError: 'No se pudo obtener el resumen' }),
    detalle: (ids) => pedirApi(`/inventarios/${[].concat(ids).join(',')}`, {
        mensajeError: 'Error al obtener el detalle del inventario'
    }),
    /* Listas del formulario (proveedores, colores, paquetes, grupos). Se guardan en memoria. */
    opciones: () => conCache('inventario', () => pedirApi('/inventarios/opciones', {
        mensajeError: 'No se pudieron obtener las opciones del inventario.'
    })),
    sugerir: async (texto) => {
        const respuesta = await listar({ nombre: texto, pagina: 1, tamano: 8 });
        return (respuesta.datos || []).map((producto) => producto.Producto);
    },
    crear: (producto) => pedirApi('/inventarios', {
        metodo: 'POST', cuerpo: producto, mensajeError: 'No se pudo crear el producto'
    }),
    actualizar: (id, producto) => pedirApi(`/inventarios/${id}`, {
        metodo: 'PUT', cuerpo: producto, mensajeError: 'No se pudo actualizar el producto'
    }),
    eliminar: (id) => pedirApi(`/inventarios/${id}`, {
        metodo: 'DELETE', mensajeError: 'No se pudo eliminar el producto'
    })
};
