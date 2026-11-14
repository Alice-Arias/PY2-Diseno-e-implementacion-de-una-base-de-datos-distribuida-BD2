/*---------------------------------------------------------------------------------------*
* NOMBRE: proveedores.routes.js
*
* DESCRIPCION: Consulta de proveedores (el Administrador solo consulta).
*   GET /api/proveedores/resumen    totales, categorías y métodos de entrega.
*   GET /api/proveedores            lista con filtros (nombre, categoria, metodoEntrega,
*                                   pagina, tamano).
*   GET /api/proveedores/:id        detalle (los datos sensibles salen como "xxxx").
*
* ENTRADA: Filtros en la URL.
*
* SALIDA: JSON con los datos de cada procedimiento.
*
* OBJETIVO: Consultar los proveedores con las mismas rutas que Clientes (consultaCatalogo.js).
*-----------------------------------------------------------------------------------------*/

const crearRutasDeConsulta = require('./consultaCatalogo');

module.exports = crearRutasDeConsulta({
    modulo: 'Proveedores',
    claveDetalle: 'SupplierID',
    mensajes: {
        resumen: 'Error al obtener el resumen de proveedores',
        listar: 'Error al listar proveedores',
        detalle: 'Error al obtener el detalle del proveedor',
        noEncontrado: 'Proveedor no encontrado'
    }
});
