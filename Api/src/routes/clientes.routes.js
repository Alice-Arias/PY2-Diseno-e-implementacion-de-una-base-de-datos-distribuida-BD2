/*---------------------------------------------------------------------------------------*
* NOMBRE: clientes.routes.js
*
* DESCRIPCION: Consulta de clientes de la sucursal (el Administrador solo consulta).
*   GET /api/clientes/resumen    totales, categorías y métodos de entrega.
*   GET /api/clientes            lista con filtros (nombre, categoria, metodoEntrega,
*                                pagina, tamano).
*   GET /api/clientes/:id        detalle (los datos sensibles salen como "xxxx").
*
* ENTRADA: Filtros en la URL.
*
* SALIDA: JSON con los datos de cada procedimiento.
*
* OBJETIVO: Consultar los clientes con las mismas rutas que Proveedores (consultaCatalogo.js).
*-----------------------------------------------------------------------------------------*/

const crearRutasDeConsulta = require('./consultaCatalogo');

module.exports = crearRutasDeConsulta({
    modulo: 'Clientes',
    claveDetalle: 'CustomerID',
    mensajes: {
        resumen: 'Error al obtener el resumen de clientes',
        listar: 'Error al listar clientes',
        detalle: 'Error al obtener el detalle del cliente',
        noEncontrado: 'Cliente no encontrado'
    }
});
