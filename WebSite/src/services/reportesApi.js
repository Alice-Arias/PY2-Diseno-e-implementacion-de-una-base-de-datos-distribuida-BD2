/*---------------------------------------------------------------------------------------*
* NOMBRE: reportesApi.js
*
* DESCRIPCION: Estadísticas del Corporativo (/api/reportes).
*
* ENTRADA: Reporte elegido y filtros (sucursal, año, mes, categorías...).
*
* SALIDA: reportesApi con opciones, ejecutar, resumenSucursales y sincronizar.
*
* OBJETIVO: Reunir en un archivo todo lo que el módulo Reportes pide a la API.
*-----------------------------------------------------------------------------------------*/

import { pedirApi, construirConsulta } from './http';

/* Nombre del reporte en la web -> ruta en la API. */
const RUTAS_REPORTES = {
    comprasProveedores: 'compras-proveedores',
    ventasClientes: 'ventas-clientes',
    topProductos: 'top-productos',
    topClientes: 'top-clientes',
    topProveedores: 'top-proveedores',
    ventasCategorias: 'ventas-categorias',
    seguimientoClientes: 'seguimiento-clientes',
    seguimientoProveedores: 'seguimiento-proveedores',
    rotacionInventario: 'rotacion-inventario',
    metodoEnvioFavorito: 'metodo-envio-favorito'
};

export const reportesApi = {
    opciones: () => pedirApi('/reportes/opciones', { mensajeError: 'No se pudieron obtener las opciones de reportes' }),

    /* Ejecuta un reporte. Con { exportar: 1 } trae todas las filas (para el Excel). */
    ejecutar: async (reporte, filtros = {}) => {
        const ruta = RUTAS_REPORTES[reporte];
        if (!ruta) throw new Error('El reporte solicitado no es válido');
        return pedirApi(`/reportes/${ruta}${construirConsulta(filtros)}`, { mensajeError: 'No se pudo ejecutar el reporte' });
    },

    resumenSucursales: (sucursal = '', anio = '') =>
        pedirApi(`/reportes/resumen-sucursales${construirConsulta({ sucursal, anio })}`, {
            mensajeError: 'No se pudo obtener el resumen por sucursal'
        }),

    sincronizar: () => pedirApi('/reportes/sincronizar', { metodo: 'POST', mensajeError: 'No se pudo sincronizar' })
};
