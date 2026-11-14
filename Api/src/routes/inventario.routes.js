/*---------------------------------------------------------------------------------------*
* NOMBRE: inventario.routes.js
* ENTRADA: Filtros en la URL o datos del formulario en el cuerpo.
* DESCRIPCION: Consultar, crear, modificar y eliminar productos de la sucursal.
*   El cambio se hace en el Corporativo y llega por replicación (script 15).
* SALIDA: JSON con el resultado de cada procedimiento.
* OBJETIVO: Administrar los productos desde la sucursal.
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const { sql } = require('../config/baseDatos');
const { numero, texto, agregarParametros } = require('../utils/parametros');
const { conManejoDeErrores, responderPaginado, responderDetalle } = require('../utils/respuestas');

const router = express.Router();

/* Estado de RAISERROR -> código HTTP. 7 = otro usuario lo modificó; 8 y 9 = nodo caído. */
const ERRORES_PRODUCTO = { estados: { 4: 409, 5: 404, 6: 409, 7: 409, 8: 503, 9: 503 }, codigoPorDefecto: 400 };

/* Parámetros comunes de SP_Inventario_Insertar y SP_Inventario_Actualizar. */
function parametrosProducto(datos) {
    const grupos = Array.isArray(datos.StockGroupIDs) ? datos.StockGroupIDs.join(',') : texto(datos.StockGroupIDs);
    const enfriado = datos.IsChillerStock == null ? null : Boolean(datos.IsChillerStock);

    return [
        ['StockItemName', sql.NVarChar(100), texto(datos.StockItemName)],
        ['SupplierID', sql.Int, numero(datos.SupplierID)],
        ['ColorID', sql.Int, numero(datos.ColorID)],
        ['UnitPackageID', sql.Int, numero(datos.UnitPackageID)],
        ['OuterPackageID', sql.Int, numero(datos.OuterPackageID)],
        ['Brand', sql.NVarChar(50), texto(datos.Brand)],
        ['Size', sql.NVarChar(20), texto(datos.Size)],
        ['LeadTimeDays', sql.Int, numero(datos.LeadTimeDays)],
        ['QuantityPerOuter', sql.Int, numero(datos.QuantityPerOuter)],
        ['IsChillerStock', sql.Bit, enfriado],
        ['Barcode', sql.NVarChar(50), texto(datos.Barcode)],
        ['TaxRate', sql.Decimal(18, 3), numero(datos.TaxRate)],
        ['UnitPrice', sql.Decimal(18, 2), numero(datos.UnitPrice)],
        ['RecommendedRetailPrice', sql.Decimal(18, 2), numero(datos.RecommendedRetailPrice)],
        ['Weight', sql.Decimal(18, 3), numero(datos.Weight)],
        ['MarketingComments', sql.NVarChar(sql.MAX), texto(datos.MarketingComments)],
        ['InternalComments', sql.NVarChar(sql.MAX), texto(datos.InternalComments)],
        ['CustomFields', sql.NVarChar(sql.MAX), texto(datos.CustomFields)],
        ['StockGroupIDs', sql.NVarChar(sql.MAX), grupos || null],
        ['QuantityOnHand', sql.Int, numero(datos.QuantityOnHand)],
        ['BinLocation', sql.NVarChar(20), texto(datos.BinLocation)],
        ['LastCostPrice', sql.Decimal(18, 2), numero(datos.LastCostPrice)],
        ['ReorderLevel', sql.Int, numero(datos.ReorderLevel)],
        ['TargetStockLevel', sql.Int, numero(datos.TargetStockLevel)],
        ['LastEditedBy', sql.Int, numero(datos.LastEditedBy) ?? 1]
    ];
}

/* Listas del formulario: proveedores, colores, paquetes y grupos. */
router.get('/opciones', conManejoDeErrores(async (req, res) => {
    const resultado = await req.pool.request().execute('SP_Inventario_Opciones');
    res.json({
        proveedores: resultado.recordsets[0],
        colores: resultado.recordsets[1],
        tiposPaquete: resultado.recordsets[2],
        grupos: resultado.recordsets[3]
    });
}, { mensaje: 'Error al obtener las opciones del formulario' }));

/* Tarjetas de totales y grupos. */
router.get('/resumen', conManejoDeErrores(async (req, res) => {
    const resultado = await req.pool.request().execute('SP_Inventarios_Resumen');
    res.json({
        totales: resultado.recordsets[0][0],
        grupos: resultado.recordsets[1]
    });
}, { mensaje: 'Error al obtener el resumen de inventario' }));

/* Lista filtrada y paginada. */
router.get('/', conManejoDeErrores(async (req, res) => {
    const filtros = req.query;
    const resultado = await agregarParametros(req.pool.request(), [
        ['Nombre', sql.NVarChar(100), texto(filtros.nombre)],
        ['Grupo', sql.NVarChar(100), texto(filtros.grupo)],
        ['Cantidad', sql.Int, numero(filtros.cantidad)],
        ['Pagina', sql.Int, numero(filtros.pagina) ?? 1],
        ['TamanoPagina', sql.Int, numero(filtros.tamano) ?? 10]
    ]).execute('SP_Inventarios_Listar');
    responderPaginado(res, resultado);
}, { mensaje: 'Error al listar inventarios' }));

/* Detalle de uno o varios productos (IDs separados por coma). */
router.get('/:id', conManejoDeErrores(async (req, res) => {
    const resultado = await req.pool.request()
        .input('StockItemID', sql.NVarChar(sql.MAX), req.params.id)
        .execute('SP_Inventarios_Detalle');
    responderDetalle(res, resultado, 'Producto no encontrado');
}, { mensaje: 'Error al obtener el detalle del producto' }));

/* Crea un producto. */
router.post('/', conManejoDeErrores(async (req, res) => {
    const resultado = await agregarParametros(req.pool.request(), parametrosProducto(req.body))
        .execute('SP_Inventario_Insertar');
    res.status(201).json({ mensaje: 'Producto creado correctamente', inventario: resultado.recordset[0] });
}, ERRORES_PRODUCTO));

/* Modifica un producto. "Version" avisa si otro usuario lo cambió antes. */
router.put('/:id', conManejoDeErrores(async (req, res) => {
    const resultado = await agregarParametros(req.pool.request(), [
        ['StockItemID', sql.Int, numero(req.params.id)],
        ['Version', sql.NVarChar(30), texto(req.body.Version)],
        ...parametrosProducto(req.body)
    ]).execute('SP_Inventario_Actualizar');
    res.json({ mensaje: 'Producto actualizado correctamente', inventario: resultado.recordset[0] });
}, ERRORES_PRODUCTO));

/* Elimina un producto. */
router.delete('/:id', conManejoDeErrores(async (req, res) => {
    const resultado = await req.pool.request()
        .input('StockItemID', sql.Int, numero(req.params.id))
        .execute('SP_Inventario_Eliminar');
    res.json({ mensaje: 'Producto eliminado correctamente', inventario: resultado.recordset[0] });
}, ERRORES_PRODUCTO));

module.exports = router;