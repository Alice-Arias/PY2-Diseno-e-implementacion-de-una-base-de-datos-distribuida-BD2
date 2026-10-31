/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de ventas
*
* DESCRIPCION:
* Define las rutas de la API utilizadas para consultar, crear, actualizar y eliminar
* ventas. También permite obtener las opciones necesarias para los formularios de ventas.
*
* ENTRADA:
* Solicitudes HTTP, parámetros de URL, filtros de búsqueda y datos de ventas
* enviados desde el frontend.
*
* SALIDA:
* Respuestas JSON con información de ventas, opciones de formularios o mensajes
* de error.
*
* RESTRICCIONES:
* Requiere una conexión activa con SQL Server y los procedimientos almacenados
* correspondientes en la base de datos WideWorldImporters.
*
* OBJETIVO:
* Permitir que el frontend gestione la información de ventas mediante la API.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');

const router = express.Router();

const { sql, poolPromise } = require('../db');


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Obtener opciones de ventas
*
* DESCRIPCION:
* Obtiene los clientes, métodos de entrega, contactos, vendedores, pedidos,
* productos y tipos de paquete disponibles para utilizar en los formularios de ventas.
*
* ENTRADA:
* Solicitud GET realizada a la ruta /opciones.
*
* SALIDA:
* Objeto JSON con las diferentes opciones necesarias para los formularios.
*
* RESTRICCIONES:
* Requiere que exista el procedimiento almacenado SP_Ventas_Opciones.
*
* OBJETIVO:
* Proporcionar al frontend los datos necesarios para registrar y modificar ventas.
*
*-----------------------------------------------------------------------------------------*/

router.get('/opciones', async (req, res) => {

    try {

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Ejecuta el procedimiento almacenado de opciones. */
        const result = await pool.request().execute(
            'SP_Ventas_Opciones'
        );

        /* Devuelve las opciones organizadas por tipo. */
        res.json({
            clientes: result.recordsets[0],
            metodosEntrega: result.recordsets[1],
            contactos: result.recordsets[2],
            vendedores: result.recordsets[3],
            pedidos: result.recordsets[4],
            productos: result.recordsets[5],
            tiposPaquete: result.recordsets[6]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al obtener las opciones de ventas'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Listar ventas
*
* DESCRIPCION:
* Obtiene una lista de ventas aplicando filtros opcionales por número de factura,
* fechas, cliente, método de entrega y monto.
*
* ENTRADA:
* Parámetros de consulta numeroFactura, fechaInicio, fechaFin, cliente,
* metodoEntrega, montoInicio y montoFin.
*
* SALIDA:
* Lista de ventas en formato JSON.
*
* RESTRICCIONES:
* Los filtros son opcionales y son enviados al procedimiento almacenado.
*
* OBJETIVO:
* Permitir consultar y filtrar las ventas registradas.
*
*-----------------------------------------------------------------------------------------*/

router.get('/', async (req, res) => {

    try {

        /* Obtiene los filtros enviados desde el frontend. */
        const {
            numeroFactura,
            fechaInicio,
            fechaFin,
            cliente,
            metodoEntrega,
            montoInicio,
            montoFin
        } = req.query;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        request.input(
            'NumeroFactura',
            sql.Int,
            numeroFactura !== undefined && numeroFactura !== ''
                ? Number(numeroFactura)
                : null
        );

        request.input(
            'FechaInicio',
            sql.Date,
            fechaInicio || null
        );

        request.input(
            'FechaFin',
            sql.Date,
            fechaFin || null
        );

        request.input(
            'Cliente',
            sql.NVarChar(100),
            cliente || null
        );

        request.input(
            'DeliveryMethod',
            sql.NVarChar(50),
            metodoEntrega || null
        );

        request.input(
            'MontoInicio',
            sql.Decimal(18, 2),
            montoInicio !== undefined && montoInicio !== ''
                ? Number(montoInicio)
                : null
        );

        request.input(
            'MontoFin',
            sql.Decimal(18, 2),
            montoFin !== undefined && montoFin !== ''
                ? Number(montoFin)
                : null
        );

        /* Ejecuta el procedimiento almacenado para listar las ventas. */
        const result = await request.execute(
            'SP_Ventas_Listar'
        );

        res.json(result.recordset);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al listar las ventas'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Obtener detalle de venta
*
* DESCRIPCION:
* Obtiene la información del encabezado y las líneas asociadas a una venta
* utilizando su identificador.
*
* ENTRADA:
* id: identificador de la venta recibido como parámetro de la URL.
*
* SALIDA:
* Objeto JSON con el encabezado y las líneas de la venta.
*
* RESTRICCIONES:
* Si la venta no existe, se devuelve el código HTTP 404.
*
* OBJETIVO:
* Consultar toda la información asociada a una venta específica.
*
*-----------------------------------------------------------------------------------------*/

router.get('/:id', async (req, res) => {

    try {

        const pool = await poolPromise;

        const request = pool.request();

        request.input(
            'InvoiceID',
            sql.Int,
            req.params.id
        );

        /* Ejecuta el procedimiento almacenado para obtener el detalle. */
        const result = await request.execute(
            'SP_Ventas_Detalle'
        );

        /* Obtiene el encabezado de la venta. */
        const encabezado = result.recordsets[0][0];

        /* Verifica si la venta existe. */
        if (!encabezado) {

            return res.status(404).json({
                error: 'Venta no encontrada'
            });
        }

        /* Devuelve el encabezado y las líneas de la venta. */
        res.json({
            encabezado,
            lineas: result.recordsets[1]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al obtener el detalle de la venta'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Crear venta
*
* DESCRIPCION:
* Registra una nueva venta utilizando los datos del encabezado y de la línea
* enviados desde el frontend.
*
* ENTRADA:
* Datos de la venta enviados mediante req.body.
*
* SALIDA:
* Respuesta JSON con la venta creada.
*
* RESTRICCIONES:
* Los datos deben cumplir las validaciones establecidas en el procedimiento
* almacenado SP_Ventas_Insertar.
*
* OBJETIVO:
* Permitir registrar nuevas ventas en la base de datos.
*
*-----------------------------------------------------------------------------------------*/

router.post('/', async (req, res) => {

    try {

        /* Obtiene los datos de la venta enviados desde el frontend. */
        const {
            CustomerID,
            BillToCustomerID,
            OrderID,
            DeliveryMethod,
            ContactPersonID,
            AccountsPersonID,
            SalespersonPersonID,
            PackedByPersonID,
            InvoiceDate,
            CustomerPurchaseOrderNumber,
            IsCreditNote,
            CreditNoteReason,
            Comments,
            DeliveryInstructions,
            InternalComments,
            TotalDryItems,
            TotalChillerItems,
            DeliveryRun,
            RunPosition,
            ReturnedDeliveryData,
            LastEditedBy,
            StockItemID,
            Description,
            PackageTypeID,
            Quantity,
            UnitPrice,
            TaxRate
        } = req.body;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        request.input('CustomerID', sql.Int, CustomerID);

        request.input(
            'BillToCustomerID',
            sql.Int,
            BillToCustomerID
        );

        request.input(
            'OrderID',
            sql.Int,
            OrderID ?? null
        );

        request.input(
            'DeliveryMethod',
            sql.Int,
            DeliveryMethod
        );

        request.input(
            'ContactPersonID',
            sql.Int,
            ContactPersonID
        );

        request.input(
            'AccountsPersonID',
            sql.Int,
            AccountsPersonID
        );

        request.input(
            'SalespersonPersonID',
            sql.Int,
            SalespersonPersonID
        );

        request.input(
            'PackedByPersonID',
            sql.Int,
            PackedByPersonID
        );

        request.input(
            'InvoiceDate',
            sql.Date,
            InvoiceDate
        );

        request.input(
            'CustomerPurchaseOrderNumber',
            sql.NVarChar(20),
            CustomerPurchaseOrderNumber ?? null
        );

        request.input(
            'IsCreditNote',
            sql.Bit,
            IsCreditNote
        );

        request.input(
            'CreditNoteReason',
            sql.NVarChar(sql.MAX),
            CreditNoteReason ?? null
        );

        request.input(
            'Comments',
            sql.NVarChar(sql.MAX),
            Comments ?? null
        );

        request.input(
            'DeliveryInstructions',
            sql.NVarChar(sql.MAX),
            DeliveryInstructions ?? null
        );

        request.input(
            'InternalComments',
            sql.NVarChar(sql.MAX),
            InternalComments ?? null
        );

        request.input(
            'TotalDryItems',
            sql.Int,
            TotalDryItems
        );

        request.input(
            'TotalChillerItems',
            sql.Int,
            TotalChillerItems
        );

        request.input(
            'DeliveryRun',
            sql.NVarChar(5),
            DeliveryRun ?? null
        );

        request.input(
            'RunPosition',
            sql.NVarChar(5),
            RunPosition ?? null
        );

        request.input(
            'ReturnedDeliveryData',
            sql.NVarChar(sql.MAX),
            ReturnedDeliveryData ?? null
        );

        request.input(
            'LastEditedBy',
            sql.Int,
            LastEditedBy ?? 1
        );

        request.input(
            'StockItemID',
            sql.Int,
            StockItemID
        );

        request.input(
            'Description',
            sql.NVarChar(100),
            Description
        );

        request.input(
            'PackageTypeID',
            sql.Int,
            PackageTypeID
        );

        request.input(
            'Quantity',
            sql.Int,
            Quantity
        );

        request.input(
            'UnitPrice',
            sql.Decimal(18, 2),
            UnitPrice ?? null
        );

        request.input(
            'TaxRate',
            sql.Decimal(18, 2),
            TaxRate
        );

        /* Ejecuta el procedimiento almacenado para insertar la venta. */
        const result = await request.execute(
            'SP_Ventas_Insertar'
        );

        res.status(201).json({
            mensaje: 'Venta creada correctamente',
            venta: result.recordset[0]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Actualizar venta
*
* DESCRIPCION:
* Actualiza la información de una venta existente utilizando su identificador
* y los nuevos datos enviados desde el frontend.
*
* ENTRADA:
* id: identificador de la venta recibido en la URL.
* Datos actualizados de la venta enviados mediante req.body.
*
* SALIDA:
* Respuesta JSON con la venta actualizada.
*
* RESTRICCIONES:
* La venta debe existir y los datos deben cumplir las validaciones establecidas
* en el procedimiento almacenado SP_Ventas_Actualizar.
*
* OBJETIVO:
* Permitir modificar la información de ventas existentes.
*
*-----------------------------------------------------------------------------------------*/

router.put('/:id', async (req, res) => {

    try {

        /* Obtiene los datos actualizados de la venta. */
        const {
            CustomerID,
            BillToCustomerID,
            OrderID,
            DeliveryMethod,
            ContactPersonID,
            AccountsPersonID,
            SalespersonPersonID,
            PackedByPersonID,
            InvoiceDate,
            CustomerPurchaseOrderNumber,
            IsCreditNote,
            CreditNoteReason,
            Comments,
            DeliveryInstructions,
            InternalComments,
            TotalDryItems,
            TotalChillerItems,
            DeliveryRun,
            RunPosition,
            ReturnedDeliveryData,
            LastEditedBy,
            StockItemID,
            Description,
            PackageTypeID,
            Quantity,
            UnitPrice,
            TaxRate
        } = req.body;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Agrega el identificador de la venta. */
        request.input(
            'InvoiceID',
            sql.Int,
            req.params.id
        );

        request.input(
            'CustomerID',
            sql.Int,
            CustomerID
        );

        request.input(
            'BillToCustomerID',
            sql.Int,
            BillToCustomerID
        );

        request.input(
            'OrderID',
            sql.Int,
            OrderID ?? null
        );

        request.input(
            'DeliveryMethod',
            sql.Int,
            DeliveryMethod
        );

        request.input(
            'ContactPersonID',
            sql.Int,
            ContactPersonID
        );

        request.input(
            'AccountsPersonID',
            sql.Int,
            AccountsPersonID
        );

        request.input(
            'SalespersonPersonID',
            sql.Int,
            SalespersonPersonID
        );

        request.input(
            'PackedByPersonID',
            sql.Int,
            PackedByPersonID
        );

        request.input(
            'InvoiceDate',
            sql.Date,
            InvoiceDate
        );

        request.input(
            'CustomerPurchaseOrderNumber',
            sql.NVarChar(20),
            CustomerPurchaseOrderNumber ?? null
        );

        request.input(
            'IsCreditNote',
            sql.Bit,
            IsCreditNote
        );

        request.input(
            'CreditNoteReason',
            sql.NVarChar(sql.MAX),
            CreditNoteReason ?? null
        );

        request.input(
            'Comments',
            sql.NVarChar(sql.MAX),
            Comments ?? null
        );

        request.input(
            'DeliveryInstructions',
            sql.NVarChar(sql.MAX),
            DeliveryInstructions ?? null
        );

        request.input(
            'InternalComments',
            sql.NVarChar(sql.MAX),
            InternalComments ?? null
        );

        request.input(
            'TotalDryItems',
            sql.Int,
            TotalDryItems
        );

        request.input(
            'TotalChillerItems',
            sql.Int,
            TotalChillerItems
        );

        request.input(
            'DeliveryRun',
            sql.NVarChar(5),
            DeliveryRun ?? null
        );

        request.input(
            'RunPosition',
            sql.NVarChar(5),
            RunPosition ?? null
        );

        request.input(
            'ReturnedDeliveryData',
            sql.NVarChar(sql.MAX),
            ReturnedDeliveryData ?? null
        );

        request.input(
            'LastEditedBy',
            sql.Int,
            LastEditedBy ?? 1
        );

        request.input(
            'StockItemID',
            sql.Int,
            StockItemID
        );

        request.input(
            'Description',
            sql.NVarChar(100),
            Description
        );

        request.input(
            'PackageTypeID',
            sql.Int,
            PackageTypeID
        );

        request.input(
            'Quantity',
            sql.Int,
            Quantity
        );

        request.input(
            'UnitPrice',
            sql.Decimal(18, 2),
            UnitPrice ?? null
        );

        request.input(
            'TaxRate',
            sql.Decimal(18, 2),
            TaxRate
        );

        /* Ejecuta el procedimiento almacenado para actualizar la venta. */
        const result = await request.execute(
            'SP_Ventas_Actualizar'
        );

        res.json({
            mensaje: 'Venta actualizada correctamente',
            venta: result.recordset[0]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Eliminar venta
*
* DESCRIPCION:
* Elimina una venta existente utilizando su identificador.
*
* ENTRADA:
* id: identificador de la venta recibido en la URL.
*
* SALIDA:
* Respuesta JSON con un mensaje de confirmación y la venta eliminada.
*
* RESTRICCIONES:
* La venta debe existir y debe cumplir las condiciones establecidas por el
* procedimiento almacenado SP_Ventas_Eliminar.
*
* OBJETIVO:
* Permitir eliminar ventas de la base de datos.
*
*-----------------------------------------------------------------------------------------*/

router.delete('/:id', async (req, res) => {

    try {

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        request.input(
            'InvoiceID',
            sql.Int,
            req.params.id
        );

        /* Ejecuta el procedimiento almacenado para eliminar la venta. */
        const result = await request.execute(
            'SP_Ventas_Eliminar'
        );

        res.json({
            mensaje: 'Venta eliminada correctamente',
            venta: result.recordset[0]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });
    }
});


/* Exporta las rutas del módulo de ventas. */
module.exports = router;