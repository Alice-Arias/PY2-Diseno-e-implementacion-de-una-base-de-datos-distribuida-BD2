/*---------------------------------------------------------------------------------------*
* NOMBRE: catalogoApi.js
*
* DESCRIPCION: Consultas de Clientes y Proveedores (el Administrador solo consulta).
* Los dos módulos usan las mismas rutas, así que se arman con una sola función.
*
* ENTRADA: Filtros de la tabla o IDs del detalle.
*
* SALIDA: clientesApi y proveedoresApi, cada uno con listar, resumen, detalle y sugerir.
*
* OBJETIVO: No repetir las mismas funciones para los dos módulos.
*-----------------------------------------------------------------------------------------*/

import { pedirApi, construirConsulta } from './http';

/*---------------------------------------------------------------------------------------*
* NOMBRE: crearApiCatalogo
* ENTRADA: ruta ('clientes' o 'proveedores') y columna con el nombre en la lista.
* SALIDA: { listar, resumen, detalle, sugerir }
*   listar({ nombre, categoria, metodoEntrega, pagina, tamano }) -> { datos, paginacion }
*   resumen()          -> { totales, categorias, metodos }
*   detalle(ids)       -> lista con el detalle de uno o varios IDs
*   sugerir(texto)     -> hasta 8 nombres para el buscador
*-----------------------------------------------------------------------------------------*/
function crearApiCatalogo(ruta, columnaNombre) {
    const listar = ({ nombre, categoria, metodoEntrega, pagina = 1, tamano = 10 } = {}) =>
        pedirApi(`/${ruta}${construirConsulta({ nombre, categoria, metodoEntrega, pagina, tamano })}`, {
            mensajeError: `Error al obtener ${ruta}`
        });

    return {
        listar,
        resumen: () => pedirApi(`/${ruta}/resumen`, { mensajeError: 'No se pudo obtener el resumen' }),
        detalle: (ids) => pedirApi(`/${ruta}/${[].concat(ids).join(',')}`, { mensajeError: 'Error al obtener el detalle' }),
        sugerir: async (texto) => {
            const respuesta = await listar({ nombre: texto, pagina: 1, tamano: 8 });
            return (respuesta.datos || []).map((fila) => fila[columnaNombre]);
        }
    };
}

export const clientesApi = crearApiCatalogo('clientes', 'Nombre_Cliente');
export const proveedoresApi = crearApiCatalogo('proveedores', 'Nombre_Proveedor');
