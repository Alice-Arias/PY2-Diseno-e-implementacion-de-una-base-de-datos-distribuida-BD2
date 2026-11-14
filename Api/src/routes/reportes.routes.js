/*---------------------------------------------------------------------------------------*
* NOMBRE: reportes.routes.js
*
* DESCRIPCION: Estadísticas del Corporativo. Todos los reportes aceptan
*   sucursal (1 = San José, 2 = Limón, vacío = consolidado), pagina, tamano y
*   exportar=1 (todas las filas, para el Excel).
*
*   GET  /api/reportes/opciones                 años, meses y categorías de los filtros.
*   GET  /api/reportes/<reporte>                uno de los 11 reportes (ver REPORTES).
*   GET  /api/reportes/resumen-sucursales       tarjetas, ventas por mes y comparativo.
*   POST /api/reportes/sincronizar              trae a la copia consolidada lo nuevo de
*                                               las sucursales y recalcula los resúmenes.
*
* ENTRADA: Filtros en la URL.
*
* SALIDA: { datos, paginacion } en los reportes; JSON propio en el resto.
*
* OBJETIVO: Consultar las estadísticas de una sucursal o de las dos.
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const { sql } = require('../config/baseDatos');
const { conManejoDeErrores, errorHttp } = require('../utils/respuestas');

const router = express.Router();

/* 1 o 2 -> esa sucursal; cualquier otro valor -> null (las dos). */
const sucursalElegida = (filtros) => ([1, 2].includes(Number(filtros.sucursal)) ? Number(filtros.sucursal) : null);

const enteroPositivo = (valor, porDefecto) => {
    const numeroLeido = Number(valor);
    return Number.isInteger(numeroLeido) && numeroLeido > 0 ? numeroLeido : porDefecto;
};

/*---------------------------------------------------------------------------------------*
* Tipos de filtro de los reportes.
*   filtroTexto(campoUrl, parametro, largo)  texto, o null si viene vacío.
*   filtroEntero(campoUrl, parametro)        número entero; si no lo es responde 400.
*-----------------------------------------------------------------------------------------*/
const filtroTexto = (campoUrl, parametro, largo) => (request, filtros) => {
    request.input(parametro, sql.NVarChar(largo), filtros[campoUrl] || null);
};

const filtroEntero = (campoUrl, parametro) => (request, filtros) => {
    const valor = filtros[campoUrl];
    if (valor === undefined || valor === '') {
        request.input(parametro, sql.Int, null);
        return;
    }
    const entero = Number(valor);
    if (!Number.isInteger(entero)) {
        throw errorHttp(400, `El parámetro ${parametro} debe ser un número entero`);
    }
    request.input(parametro, sql.Int, entero);
};

const anio = filtroEntero('anio', 'Anio');
const mes = filtroEntero('mes', 'Mes');
const categoriaProducto = filtroTexto('categoriaProducto', 'CategoriaProducto', 50);

/* Ruta -> procedimiento y filtros propios de cada reporte (en el orden del procedimiento). */
const REPORTES = {
    'compras-proveedores': {
        procedimiento: 'SP_Reporte_ComprasProveedores',
        filtros: [filtroTexto('categoriaProveedor', 'SupplierCategoryName', 50), filtroTexto('proveedor', 'SupplierName', 100)]
    },
    'ventas-clientes': {
        procedimiento: 'SP_Reporte_VentasToClientes',
        filtros: [filtroTexto('categoriaCliente', 'CustomerCategoryName', 50), filtroTexto('cliente', 'CustomerName', 100)]
    },
    'top-productos': { procedimiento: 'SP_Top_GananciaProductos', filtros: [anio] },
    'top-clientes': { procedimiento: 'SP_Top_ClientesFacturas', filtros: [anio] },
    'top-proveedores': { procedimiento: 'SP_Top_ProveedoresOrdenes', filtros: [anio] },
    'ventas-categorias': { procedimiento: 'SP_Resumen_VentasCategorias', filtros: [] },
    'seguimiento-clientes': { procedimiento: 'SP_Seguimiento_Compras_Clientes', filtros: [anio, mes, categoriaProducto] },
    'seguimiento-proveedores': { procedimiento: 'SP_Seguimiento_Compras_Proveedores', filtros: [anio, mes, categoriaProducto] },
    'rotacion-inventario': {
        procedimiento: 'SP_Rotacion_Inventario',
        filtros: [categoriaProducto, anio, filtroTexto('proveedor', 'Proveedor', 100)]
    },
    'metodo-envio-favorito': {
        procedimiento: 'SP_Metodo_Envio_Favorito',
        filtros: [
            anio,
            mes,
            filtroTexto('categoriaCliente', 'CategoriaCliente', 50),
            categoriaProducto,
            filtroTexto('producto', 'Producto', 100)
        ]
    }
};

/*---------------------------------------------------------------------------------------*
* NOMBRE: rutaDeReporte
* ENTRADA: procedimiento y lista de filtros.
* DESCRIPCION: Agrega los filtros del reporte, la página (o todas si exportar=1), el
* tamaño de página y la sucursal, y ejecuta el procedimiento.
* SALIDA: Función de ruta que responde { datos, paginacion }.
*-----------------------------------------------------------------------------------------*/
const rutaDeReporte = ({ procedimiento, filtros }) => conManejoDeErrores(async (req, res) => {
    const request = req.pool.request();
    filtros.forEach((agregarFiltro) => agregarFiltro(request, req.query));

    const exportar = req.query.exportar === '1';
    request.input('Pagina', sql.Int, exportar ? null : enteroPositivo(req.query.pagina, 1));
    request.input('TamanoPagina', sql.Int, enteroPositivo(req.query.tamano, 10));
    request.input('Sucursal', sql.TinyInt, sucursalElegida(req.query));

    const resultado = await request.execute(procedimiento);
    res.json({
        datos: resultado.recordsets[0] || [],
        paginacion: (resultado.recordsets[1] || [])[0] || null
    });
}, { mensaje: `Error al ejecutar ${procedimiento}` });

router.get('/opciones', conManejoDeErrores(async (req, res) => {
    const resultado = await req.pool.request()
        .input('Sucursal', sql.TinyInt, sucursalElegida(req.query))
        .execute('SP_Reportes_Opciones');
    res.json({
        aniosVentas: resultado.recordsets[0],
        aniosCompras: resultado.recordsets[1],
        meses: resultado.recordsets[2],
        categoriasProductos: resultado.recordsets[3],
        categoriasClientes: resultado.recordsets[4],
        proveedores: resultado.recordsets[5],
        categoriasProveedores: resultado.recordsets[6]
    });
}, { mensaje: 'Error al obtener las opciones de reportes' }));

for (const [ruta, reporte] of Object.entries(REPORTES)) {
    router.get(`/${ruta}`, rutaDeReporte(reporte));
}

router.get('/resumen-sucursales', conManejoDeErrores(async (req, res) => {
    const resultado = await req.pool.request()
        .input('Sucursal', sql.TinyInt, sucursalElegida(req.query))
        .input('Anio', sql.Int, enteroPositivo(req.query.anio, null))
        .execute('Estadisticas.SP_Resumen_Sucursales');
    res.json({
        totales: (resultado.recordsets[0] || [])[0] || null,
        porMes: resultado.recordsets[1] || [],
        comparativo: resultado.recordsets[2] || [],
        sincronizacion: resultado.recordsets[3] || []
    });
}, { mensaje: 'No se pudo obtener el resumen por sucursal' }));

router.post('/sincronizar', conManejoDeErrores(async (req, res) => {
    const resultado = await req.pool.request().execute('Estadisticas.SP_Sincronizar');
    res.json({ sincronizacion: resultado.recordset || [] });

    /* Los resúmenes de los reportes pesados se recalculan después, sin hacer esperar al
       usuario (solo trabajan si llegaron datos nuevos; ver 16_Corporativo_Estadisticas.sql). */
    req.pool.request().execute('Estadisticas.SP_ActualizarResumenes')
        .catch((error) => console.error('No se pudieron actualizar los resúmenes:', error.message));
}, { mensaje: 'No se pudo sincronizar' }));

module.exports = router;
