/*---------------------------------------------------------------------------------------*
* NOMBRE: ventas.routes.js
*
* DESCRIPCION: Ventas (facturas) de la sucursal.
*   GET  /api/ventas/opciones   clientes, métodos, contactos, vendedores, productos
*                               y tipos de paquete.
*   GET  /api/ventas            lista con filtros (numeroFactura, fechaInicio, fechaFin,
*                               cliente, metodoEntrega, montoInicio, montoFin, pagina, tamano).
*   GET  /api/ventas/:id        encabezado y líneas de una factura.
*   POST /api/ventas            crear venta.
*   PUT  /api/ventas/:id        modificar venta.
*
* ENTRADA: Filtros en la URL o datos del formulario en el cuerpo.
*
* SALIDA: JSON con el resultado de cada procedimiento.
*
* OBJETIVO: Registrar y consultar las ventas de la sucursal.
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const { sql } = require('../config/baseDatos');
const { numero, texto, agregarParametros } = require('../utils/parametros');
const { conManejoDeErrores, responderPaginado } = require('../utils/respuestas');

const router = express.Router();

/*---------------------------------------------------------------------------------------*
* NOMBRE: parametrosVenta
* ENTRADA: datos del formulario (req.body).
* SALIDA: Lista de parámetros comunes de SP_Ventas_Insertar y SP_Ventas_Actualizar.
*-----------------------------------------------------------------------------------------*/
function parametrosVenta(datos) {
    return [
        ['CustomerID', sql.Int, datos.CustomerID],
        ['BillToCustomerID', sql.Int, datos.BillToCustomerID],
        ['OrderID', sql.Int, datos.OrderID ?? null],
        ['DeliveryMethod', sql.Int, datos.DeliveryMethod],
        ['ContactPersonID', sql.Int, datos.ContactPersonID],
        ['AccountsPersonID', sql.Int, datos.AccountsPersonID],
        ['SalespersonPersonID', sql.Int, datos.SalespersonPersonID],
        ['PackedByPersonID', sql.Int, datos.PackedByPersonID],
        ['InvoiceDate', sql.Date, datos.InvoiceDate],
        ['CustomerPurchaseOrderNumber', sql.NVarChar(20), datos.CustomerPurchaseOrderNumber ?? null],
        ['IsCreditNote', sql.Bit, datos.IsCreditNote],
        ['CreditNoteReason', sql.NVarChar(sql.MAX), datos.CreditNoteReason ?? null],
        ['Comments', sql.NVarChar(sql.MAX), datos.Comments ?? null],
        ['DeliveryInstructions', sql.NVarChar(sql.MAX), datos.DeliveryInstructions ?? null],
        ['InternalComments', sql.NVarChar(sql.MAX), datos.InternalComments ?? null],
        ['TotalDryItems', sql.Int, datos.TotalDryItems],
        ['TotalChillerItems', sql.Int, datos.TotalChillerItems],
        ['DeliveryRun', sql.NVarChar(5), datos.DeliveryRun ?? null],
        ['RunPosition', sql.NVarChar(5), datos.RunPosition ?? null],
        ['ReturnedDeliveryData', sql.NVarChar(sql.MAX), datos.ReturnedDeliveryData ?? null],
        ['LastEditedBy', sql.Int, datos.LastEditedBy ?? 1],
        ['StockItemID', sql.Int, datos.StockItemID],
        ['Description', sql.NVarChar(100), datos.Description],
        ['PackageTypeID', sql.Int, datos.PackageTypeID],
        ['Quantity', sql.Int, datos.Quantity],
        ['UnitPrice', sql.Decimal(18, 2), datos.UnitPrice ?? null],
        ['TaxRate', sql.Decimal(18, 2), datos.TaxRate]
    ];
}

router.get('/opciones', conManejoDeErrores(async (req, res) => {
    const resultado = await req.pool.request().execute('SP_Ventas_Opciones');
    res.json({
        clientes: resultado.recordsets[0],
        metodosEntrega: resultado.recordsets[1],
        contactos: resultado.recordsets[2],
        vendedores: resultado.recordsets[3],
        productos: resultado.recordsets[4],
        tiposPaquete: resultado.recordsets[5]
    });
}, { mensaje: 'Error al obtener las opciones de ventas' }));

router.get('/', conManejoDeErrores(async (req, res) => {
    const filtros = req.query;
    const resultado = await agregarParametros(req.pool.request(), [
        ['NumeroFactura', sql.Int, numero(filtros.numeroFactura)],
        ['FechaInicio', sql.Date, texto(filtros.fechaInicio)],
        ['FechaFin', sql.Date, texto(filtros.fechaFin)],
        ['Cliente', sql.NVarChar(100), texto(filtros.cliente)],
        ['DeliveryMethod', sql.NVarChar(50), texto(filtros.metodoEntrega)],
        ['MontoInicio', sql.Decimal(18, 2), numero(filtros.montoInicio)],
        ['MontoFin', sql.Decimal(18, 2), numero(filtros.montoFin)],
        ['Pagina', sql.Int, numero(filtros.pagina) ?? 1],
        ['TamanoPagina', sql.Int, numero(filtros.tamano) ?? 10]
    ]).execute('SP_Ventas_Listar');
    responderPaginado(res, resultado);
}, { mensaje: 'Error al listar las ventas' }));

router.get('/:id', conManejoDeErrores(async (req, res) => {
    const resultado = await req.pool.request()
        .input('InvoiceID', sql.Int, req.params.id)
        .execute('SP_Ventas_Detalle');

    const encabezado = resultado.recordsets[0][0];
    if (!encabezado) {
        return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json({ encabezado, lineas: resultado.recordsets[1] });
}, { mensaje: 'Error al obtener el detalle de la venta' }));

router.post('/', conManejoDeErrores(async (req, res) => {
    const resultado = await agregarParametros(req.pool.request(), parametrosVenta(req.body))
        .execute('SP_Ventas_Insertar');
    res.status(201).json({ mensaje: 'Venta creada correctamente', venta: resultado.recordset[0] });
}));

router.put('/:id', conManejoDeErrores(async (req, res) => {
    const resultado = await agregarParametros(req.pool.request(), [
        ['InvoiceID', sql.Int, req.params.id],
        ...parametrosVenta(req.body)
    ]).execute('SP_Ventas_Actualizar');
    res.json({ mensaje: 'Venta actualizada correctamente', venta: resultado.recordset[0] });
}));

module.exports = router;
