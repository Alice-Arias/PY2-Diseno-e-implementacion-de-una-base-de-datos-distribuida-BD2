/*---------------------------------------------------------------------------------------*
* NOMBRE: ventasApi.js
*
* DESCRIPCION: Ventas (facturas) de la sucursal (/api/ventas).
*
* ENTRADA: Filtros de la tabla, número de factura o datos del formulario.
*
* SALIDA: ventasApi con listar, detalle, opciones, crear y actualizar.
*
* OBJETIVO: Reunir en un archivo todo lo que el módulo Ventas pide a la API.
*-----------------------------------------------------------------------------------------*/

import { pedirApi, construirConsulta } from './http';
import { conCache } from './cacheOpciones';

export const ventasApi = {
    listar: ({ numeroFactura, fechaInicio, fechaFin, cliente, metodoEntrega, montoInicio, montoFin, pagina = 1, tamano = 10 } = {}) =>
        pedirApi(`/ventas${construirConsulta({
            numeroFactura, fechaInicio, fechaFin, cliente, metodoEntrega, montoInicio, montoFin, pagina, tamano
        })}`, { mensajeError: 'Error al obtener las ventas' }),

    detalle: (id) => pedirApi(`/ventas/${id}`, { mensajeError: 'Error al obtener el detalle de la venta' }),

    /* Listas del formulario (clientes, métodos, contactos, vendedores, productos, paquetes). */
    opciones: () => conCache('ventas', () => pedirApi('/ventas/opciones', {
        mensajeError: 'No se pudieron obtener las opciones de ventas.'
    })),

    crear: (venta) => pedirApi('/ventas', {
        metodo: 'POST', cuerpo: venta, mensajeError: 'No se pudo crear la venta'
    }),

    actualizar: (id, venta) => pedirApi(`/ventas/${id}`, {
        metodo: 'PUT', cuerpo: venta, mensajeError: 'No se pudo actualizar la venta'
    })
};
