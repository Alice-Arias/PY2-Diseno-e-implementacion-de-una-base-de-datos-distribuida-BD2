/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de reportes
*
* DESCRIPCION:
* Define las rutas de la API utilizadas para obtener las opciones de filtros y ejecutar
* los reportes estadísticos de compras, ventas e inventario.
*
* ENTRADA:
* Solicitudes HTTP GET y parámetros de consulta enviados desde el frontend.
*
* SALIDA:
* Respuestas JSON con las opciones disponibles o las filas generadas por cada reporte.
*
* RESTRICCIONES:
* Requiere conexión con SQL Server y los procedimientos almacenados del módulo de reportes
* en la base de datos WideWorldImporters.
*
* OBJETIVO:
* Permitir que el frontend consulte los reportes y sus filtros mediante la API.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const { sql } = require('../db');

const router = express.Router();

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: texto
*
* DESCRIPCION:
* Agrega a la solicitud de SQL Server un parámetro de texto Unicode y convierte los
* valores vacíos en NULL.
*
* ENTRADA:
* request: solicitud de SQL Server.
* query: valor recibido en la cadena de consulta HTTP.
* parameter: nombre del parámetro esperado por el procedimiento almacenado.
* length: longitud máxima del parámetro.
*
* SALIDA:
* No retorna un valor. Agrega el parámetro tipado a request.
*
* RESTRICCIONES:
* El nombre y la longitud deben coincidir con la definición del procedimiento almacenado.
*
* OBJETIVO:
* Estandarizar el envío de filtros de texto a los procedimientos de reportes.
*
*-----------------------------------------------------------------------------------------*/

const texto = (request, query, parameter, length) => {
    request.input(parameter, sql.NVarChar(length), query || null);
};

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: entero
*
* DESCRIPCION:
* Agrega un parámetro entero a la solicitud de SQL Server. Los valores omitidos o vacíos
* se envían como NULL; los valores que no sean enteros generan un error de validación.
*
* ENTRADA:
* request: solicitud de SQL Server.
* query: valor recibido en la cadena de consulta HTTP.
* parameter: nombre del parámetro esperado por el procedimiento almacenado.
*
* SALIDA:
* No retorna un valor. Agrega el parámetro tipado a request.
*
* RESTRICCIONES:
* El valor debe representar un número entero. Los valores inválidos producen HTTP 400.
*
* OBJETIVO:
* Validar y estandarizar el envío de años y meses a los procedimientos de reportes.
*
*-----------------------------------------------------------------------------------------*/

const entero = (request, query, parameter) => {
    if (query === undefined || query === '') {
        request.input(parameter, sql.Int, null);
        return;
    }

    const value = Number(query);

    if (!Number.isInteger(value)) {
        const error = new Error(`El parámetro ${parameter} debe ser un número entero`);
        error.statusCode = 400;
        throw error;
    }

    request.input(parameter, sql.Int, value);
};

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: ejecutarReporte
*
* DESCRIPCION:
* Crea un controlador GET que configura los parámetros recibidos y ejecuta el procedimiento
* almacenado del reporte correspondiente.
*
* ENTRADA:
* procedimiento: nombre del procedimiento almacenado que se ejecutará.
* configurar: función opcional que agrega los parámetros recibidos a la solicitud SQL.
* req: solicitud HTTP con los filtros en req.query.
* res: respuesta HTTP utilizada para devolver los resultados o el error.
*
* SALIDA:
* Arreglo JSON con el primer conjunto de resultados del procedimiento o mensaje de error.
*
* RESTRICCIONES:
* Requiere conexión activa con SQL Server y parámetros compatibles con el procedimiento.
*
* OBJETIVO:
* Evitar repetir el manejo de conexión, ejecución y errores en cada ruta de reporte.
*
*-----------------------------------------------------------------------------------------*/

/* PY2: ?sucursal=1 (San José), ?sucursal=2 (Limón), vacío = consolidado. */
const sucursalDe = (q) => ([1, 2].includes(Number(q.sucursal)) ? Number(q.sucursal) : null);

const ejecutarReporte = (procedimiento, configurar = () => {}) => async (req, res) => {
    /* CORREGIDO PY2: la paginación la hace el SP.
       ?pagina=N&tamano=10 -> solo esa página.  ?exportar=1 -> todas las filas (CSV). */
    try {
        const pool = req.pool;   // PY2: pool del nodo del usuario (auth.js)
        const request = pool.request();
        configurar(request, req.query);

        const exportar = req.query.exportar === '1';
        const pagina = Number(req.query.pagina);
        const tamano = Number(req.query.tamano);

        request.input('Pagina', sql.Int, exportar ? null : (Number.isInteger(pagina) && pagina > 0 ? pagina : 1));
        request.input('TamanoPagina', sql.Int, Number.isInteger(tamano) && tamano > 0 ? tamano : 10);

        request.input('Sucursal', sql.TinyInt, sucursalDe(req.query));   // PY2: filtro por sucursal

        const result = await request.execute(procedimiento);

        res.json({
            datos: result.recordsets[0] || [],
            paginacion: (result.recordsets[1] || [])[0] || null
        });
    } catch (err) {
        console.error(err);
        res.status(err.statusCode || 500).json({
            error: err.statusCode ? err.message : `Error al ejecutar ${procedimiento}`
        });
    }
};

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Obtener opciones de reportes
*
* DESCRIPCION:
* Obtiene años, meses, categorías de productos y clientes, proveedores y categorías de
* proveedores para llenar los filtros disponibles en la vista de reportes.
*
* ENTRADA:
* Solicitud GET realizada a la ruta /opciones.
*
* SALIDA:
* Objeto JSON con las listas de opciones organizadas por tipo.
*
* RESTRICCIONES:
* Requiere el procedimiento SP_Reportes_Opciones y acceso a dbo.CategoriaProveedores.
*
* OBJETIVO:
* Proporcionar al frontend las opciones necesarias para filtrar los reportes.
*
*-----------------------------------------------------------------------------------------*/

router.get('/opciones', async (req, res) => {
    try {
        const pool = req.pool;   // PY2: pool del nodo del usuario (auth.js)
        const result = await pool.request()
            .input('Sucursal', sql.TinyInt, sucursalDe(req.query))
            .execute('SP_Reportes_Opciones');
        /* PY2: las categorías de proveedores ahora vienen del mismo SP (resultado 7). */

        res.json({
            aniosVentas: result.recordsets[0],
            aniosCompras: result.recordsets[1],
            meses: result.recordsets[2],
            categoriasProductos: result.recordsets[3],
            categoriasClientes: result.recordsets[4],
            proveedores: result.recordsets[5],
            categoriasProveedores: result.recordsets[6]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener las opciones de reportes' });
    }
});

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Reporte de compras por proveedor
*
* DESCRIPCION:
* Ejecuta SP_Reporte_ComprasProveedores con filtros opcionales por categoría y nombre
* del proveedor.
*
* ENTRADA:
* categoriaProveedor y proveedor como parámetros de consulta.
*
* SALIDA:
* Filas JSON con los montos máximos, mínimos y promedios agrupados por categoría y proveedor.
*
* RESTRICCIONES:
* Los filtros de texto son opcionales y aceptan coincidencias parciales.
*
* OBJETIVO:
* Consultar y filtrar el resumen de compras realizadas a proveedores.
*
*-----------------------------------------------------------------------------------------*/

router.get('/compras-proveedores', ejecutarReporte(
    'SP_Reporte_ComprasProveedores',
    (request, query) => {
        texto(request, query.categoriaProveedor, 'SupplierCategoryName', 50);
        texto(request, query.proveedor, 'SupplierName', 100);
    }
));

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Reporte de ventas por cliente
*
* DESCRIPCION:
* Ejecuta SP_Reporte_VentasToClientes con filtros opcionales por categoría y nombre
* del cliente.
*
* ENTRADA:
* categoriaCliente y cliente como parámetros de consulta.
*
* SALIDA:
* Filas JSON con los montos mínimos, máximos y promedios agrupados por categoría y cliente.
*
* RESTRICCIONES:
* Los filtros de texto son opcionales y aceptan coincidencias parciales.
*
* OBJETIVO:
* Consultar y filtrar el resumen de ventas realizadas a clientes.
*
*-----------------------------------------------------------------------------------------*/

router.get('/ventas-clientes', ejecutarReporte(
    'SP_Reporte_VentasToClientes',
    (request, query) => {
        texto(request, query.categoriaCliente, 'CustomerCategoryName', 50);
        texto(request, query.cliente, 'CustomerName', 100);
    }
));

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Top de productos por ganancia
*
* DESCRIPCION:
* Ejecuta SP_Top_GananciaProductos para obtener los productos con mayor ganancia.
*
* ENTRADA:
* anio opcional como parámetro de consulta.
*
* SALIDA:
* Filas JSON con el año, producto, ganancia total y posición.
*
* RESTRICCIONES:
* El año, si se especifica, debe ser un número entero.
*
* OBJETIVO:
* Consultar los productos que generan más ganancia por año.
*
*-----------------------------------------------------------------------------------------*/

router.get('/top-productos', ejecutarReporte(
    'SP_Top_GananciaProductos',
    (request, query) => entero(request, query.anio, 'Anio')
));

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Top de clientes por facturas
*
* DESCRIPCION:
* Ejecuta SP_Top_ClientesFacturas para obtener los clientes con más facturas emitidas.
*
* ENTRADA:
* anio opcional como parámetro de consulta.
*
* SALIDA:
* Filas JSON con los clientes mejor posicionados y el monto total facturado.
*
* RESTRICCIONES:
* El año, si se especifica, debe ser un número entero.
*
* OBJETIVO:
* Consultar los clientes con mayor cantidad de facturas por año.
*
*-----------------------------------------------------------------------------------------*/

router.get('/top-clientes', ejecutarReporte(
    'SP_Top_ClientesFacturas',
    (request, query) => entero(request, query.anio, 'Anio')
));

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Top de proveedores por órdenes
*
* DESCRIPCION:
* Ejecuta SP_Top_ProveedoresOrdenes para obtener los proveedores con más órdenes de compra.
*
* ENTRADA:
* anio opcional como parámetro de consulta.
*
* SALIDA:
* Filas JSON con los proveedores mejor posicionados y el monto de sus órdenes.
*
* RESTRICCIONES:
* El año, si se especifica, debe ser un número entero.
*
* OBJETIVO:
* Consultar los proveedores con mayor cantidad de órdenes por año.
*
*-----------------------------------------------------------------------------------------*/

router.get('/top-proveedores', ejecutarReporte(
    'SP_Top_ProveedoresOrdenes',
    (request, query) => entero(request, query.anio, 'Anio')
));

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Resumen de ventas por categoría
*
* DESCRIPCION:
* Ejecuta SP_Resumen_VentasCategorias para generar la matriz de ventas por categoría
* de producto y año.
*
* ENTRADA:
* Solicitud GET sin parámetros de consulta.
*
* SALIDA:
* Filas JSON con una columna por cada año disponible.
*
* RESTRICCIONES:
* Requiere que existan facturas y categorías de productos en la base de datos.
*
* OBJETIVO:
* Mostrar la evolución anual de las ventas por categoría.
*
*-----------------------------------------------------------------------------------------*/

router.get('/ventas-categorias', ejecutarReporte('SP_Resumen_VentasCategorias'));

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Seguimiento de compras de clientes
*
* DESCRIPCION:
* Ejecuta SP_Seguimiento_Compras_Clientes con filtros opcionales de año, mes y categoría
* de producto.
*
* ENTRADA:
* anio, mes y categoriaProducto como parámetros de consulta.
*
* SALIDA:
* Filas JSON con el resumen mensual de compras y cantidades por cliente.
*
* RESTRICCIONES:
* Año y mes, si se especifican, deben ser números enteros.
*
* OBJETIVO:
* Consultar el seguimiento mensual de las compras de clientes.
*
*-----------------------------------------------------------------------------------------*/

router.get('/seguimiento-clientes', ejecutarReporte(
    'SP_Seguimiento_Compras_Clientes',
    (request, query) => {
        entero(request, query.anio, 'Anio');
        entero(request, query.mes, 'Mes');
        texto(request, query.categoriaProducto, 'CategoriaProducto', 50);
    }
));

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Seguimiento de compras a proveedores
*
* DESCRIPCION:
* Ejecuta SP_Seguimiento_Compras_Proveedores con filtros opcionales de año, mes y categoría
* de producto.
*
* ENTRADA:
* anio, mes y categoriaProducto como parámetros de consulta.
*
* SALIDA:
* Filas JSON con el resumen mensual de órdenes y cantidades por proveedor.
*
* RESTRICCIONES:
* Año y mes, si se especifican, deben ser números enteros.
*
* OBJETIVO:
* Consultar el seguimiento mensual de compras realizadas a proveedores.
*
*-----------------------------------------------------------------------------------------*/

router.get('/seguimiento-proveedores', ejecutarReporte(
    'SP_Seguimiento_Compras_Proveedores',
    (request, query) => {
        entero(request, query.anio, 'Anio');
        entero(request, query.mes, 'Mes');
        texto(request, query.categoriaProducto, 'CategoriaProducto', 50);
    }
));

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rotación de inventario
*
* DESCRIPCION:
* Ejecuta SP_Rotacion_Inventario con filtros opcionales por categoría de producto, año
* y proveedor.
*
* ENTRADA:
* categoriaProducto, anio y proveedor como parámetros de consulta.
*
* SALIDA:
* Filas JSON con el stock actual, consumo y días de rotación por producto.
*
* RESTRICCIONES:
* El año, si se especifica, debe ser un número entero; los filtros de texto son opcionales.
*
* OBJETIVO:
* Consultar la rotación estimada del inventario por producto.
*
*-----------------------------------------------------------------------------------------*/

router.get('/rotacion-inventario', ejecutarReporte(
    'SP_Rotacion_Inventario',
    (request, query) => {
        texto(request, query.categoriaProducto, 'CategoriaProducto', 50);
        entero(request, query.anio, 'Anio');
        texto(request, query.proveedor, 'Proveedor', 100);
    }
));

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Método de envío favorito
*
* DESCRIPCION:
* Ejecuta SP_Metodo_Envio_Favorito con filtros opcionales de año, mes, categoría de cliente,
* categoría de producto y nombre de producto.
*
* ENTRADA:
* anio, mes, categoriaCliente, categoriaProducto y producto como parámetros de consulta.
*
* SALIDA:
* Filas JSON con el método de envío más utilizado para cada ciudad y período.
*
* RESTRICCIONES:
* Año y mes, si se especifican, deben ser números enteros; los filtros de texto son opcionales.
*
* OBJETIVO:
* Consultar los métodos de envío favoritos según los filtros indicados.
*
*-----------------------------------------------------------------------------------------*/

router.get('/metodo-envio-favorito', ejecutarReporte(
    'SP_Metodo_Envio_Favorito',
    (request, query) => {
        entero(request, query.anio, 'Anio');
        entero(request, query.mes, 'Mes');
        texto(request, query.categoriaCliente, 'CategoriaCliente', 50);
        texto(request, query.categoriaProducto, 'CategoriaProducto', 50);
        texto(request, query.producto, 'Producto', 100);
    }
));

/*---------------------------------------------------------------------------------------*
* PY2: GET /api/reportes/resumen-sucursales?sucursal=&anio=
* Lee las vistas materializadas (Estadisticas.SP_Resumen_Sucursales).
*-----------------------------------------------------------------------------------------*/
router.get('/resumen-sucursales', async (req, res) => {
    try {
        const pool = req.pool;
        const anio = Number(req.query.anio);
        const result = await pool.request()
            .input('Sucursal', sql.TinyInt, sucursalDe(req.query))
            .input('Anio', sql.Int, Number.isInteger(anio) && anio > 0 ? anio : null)
            .execute('Estadisticas.SP_Resumen_Sucursales');

        res.json({
            totales: (result.recordsets[0] || [])[0] || null,
            porMes: result.recordsets[1] || [],
            comparativo: result.recordsets[2] || [],
            sincronizacion: result.recordsets[3] || []
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'No se pudo obtener el resumen por sucursal' });
    }
});

/*---------------------------------------------------------------------------------------*
* PY2: POST /api/reportes/sincronizar
* Trae ya mismo los datos nuevos de las sucursales (normalmente lo hace el job cada 5 min).
*-----------------------------------------------------------------------------------------*/
router.post('/sincronizar', async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().execute('Estadisticas.SP_Sincronizar');
        res.json({ sincronizacion: result.recordset || [] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'No se pudo sincronizar' });
    }
});

module.exports = router;