USE WideWorldImporters;
GO

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Módulo de ventas - Procedimientos almacenados
*
* DESCRIPCION: Contiene los procedimientos almacenados utilizados para listar,
*              consultar, insertar y actualizar ventas o facturas.
*
* ENTRADA: Datos de factura, cliente, entrega, contacto y detalle de producto,
*          según el procedimiento ejecutado.
*
* SALIDA: Información de ventas, detalles de facturas, identificadores generados
*         o actualizados y mensajes de error.
*
* RESTRICCIONES: Los registros relacionados deben existir y los valores deben
*                cumplir las validaciones establecidas.
*
* OBJETIVO: Centralizar las operaciones del módulo de ventas mediante
*           procedimientos almacenados.
*
* TIPOS DE ERROR:
*   1 = falta un dato obligatorio o el formato es malo
*   2 = valor fuera de rango
*   3 = un registro relacionado no existe
*   4 = duplicado
*   5 = el registro no existe
*   6 = el registro tiene registros relacionados
*
*-----------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Ventas_Listar
*
* DESCRIPCION: Devuelve la lista de ventas para la tabla principal.
*              Permite aplicar filtros por número de factura, fecha,
*              cliente, método de entrega y monto.
*
* ENTRADA:
*   @NumeroFactura   Número de factura.
*   @FechaInicio     Fecha inicial del filtro.
*   @FechaFin        Fecha final del filtro.
*   @Cliente         Nombre o parte del nombre del cliente.
*   @DeliveryMethod  Método de entrega.
*   @MontoInicio     Monto mínimo.
*   @MontoFin        Monto máximo.
*
* SALIDA: Número de factura, fecha, cliente, método de entrega y monto total.
*
* RESTRICCIONES: Los filtros son opcionales. Los registros relacionados
*                deben existir para que la venta sea mostrada.
*
* OBJETIVO: Obtener las ventas que cumplen con los filtros seleccionados
*           para mostrarlas en la tabla principal.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Listar
    @NumeroFactura INT = NULL,
    @FechaInicio DATE = NULL,
    @FechaFin DATE = NULL,
    @Cliente NVARCHAR(100) = NULL,
    @DeliveryMethod NVARCHAR(50) = NULL,
    @MontoInicio DECIMAL(18,2) = NULL,
    @MontoFin DECIMAL(18,2) = NULL
AS
BEGIN
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT 
        f.InvoiceID,
        f.InvoiceDate AS Fecha_Factura,
        c.CustomerName AS Nombre_Cliente,
        fe.DeliveryMethodName AS Metodo_Entrega,
        SUM(df.ExtendedPrice) AS Monto
    FROM dbo.Facturas f
    INNER JOIN dbo.ClientesActuales AS c 
        ON f.CustomerID = c.CustomerID
    INNER JOIN dbo.FormasEntrega AS fe 
        ON f.DeliveryMethodID = fe.DeliveryMethodID
    INNER JOIN dbo.DetalleFacturas AS df 
        ON f.InvoiceID = df.InvoiceID
    WHERE
        (@NumeroFactura IS NULL OR f.InvoiceID = @NumeroFactura)
        AND
        (@FechaInicio IS NULL OR f.InvoiceDate >= @FechaInicio)
        AND
        (@FechaFin IS NULL OR f.InvoiceDate <= @FechaFin)
        AND
        (@Cliente IS NULL OR c.CustomerName LIKE '%' + @Cliente + '%')
        AND
        (@DeliveryMethod IS NULL OR fe.DeliveryMethodName LIKE '%' + @DeliveryMethod + '%')
    GROUP BY 
        f.InvoiceID,
        f.InvoiceDate,
        c.CustomerName,
        fe.DeliveryMethodName
    HAVING 
        (@MontoInicio IS NULL OR SUM(df.ExtendedPrice) >= @MontoInicio)
        AND 
        (@MontoFin IS NULL OR SUM(df.ExtendedPrice) <= @MontoFin)
    ORDER BY c.CustomerName ASC;
END
GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Ventas_Detalle
*
* DESCRIPCION: Devuelve toda la información de una venta mediante su InvoiceID.
*              El procedimiento devuelve el encabezado de la factura y sus
*              líneas de productos.
*
* ENTRADA:
*   @InvoiceID  Identificador de la factura.
*
* SALIDA:
*   Encabezado de la factura con información del cliente, entrega, contactos
*   y datos generales.
*   Detalle con productos, cantidades, precios, impuestos y totales.
*
* RESTRICCIONES: El InvoiceID debe corresponder a una factura existente.
*
* OBJETIVO: Obtener toda la información necesaria para consultar o editar
*           una venta.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Detalle
    @InvoiceID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    /* Encabezado de la factura. */
    SELECT
        f.InvoiceID,
        f.CustomerID,
        ca.CustomerName AS Nombre_Cliente,
        f.BillToCustomerID,
        bc.CustomerName AS Nombre_Cliente_Facturar,
        f.OrderID,
        f.DeliveryMethodID,
        fe.DeliveryMethodName AS Metodo_Entrega,
        f.ContactPersonID,
        cts.FullName AS Persona_Contacto,
        f.AccountsPersonID,
        acc.FullName AS Persona_Cuentas,
        f.SalespersonPersonID,
        ctos.FullName AS Vendedor,
        f.PackedByPersonID,
        pbp.FullName AS Empacado_Por,
        f.InvoiceDate AS Fecha_Factura,
        f.CustomerPurchaseOrderNumber AS Numero_Orden,
        f.IsCreditNote,
        f.CreditNoteReason,
        f.Comments,
        f.DeliveryInstructions AS Intrucciones_Entrega,
        f.InternalComments,
        f.TotalDryItems,
        f.TotalChillerItems,
        f.DeliveryRun,
        f.RunPosition,
        f.ReturnedDeliveryData
    FROM dbo.Facturas f
    INNER JOIN dbo.ClientesActuales AS ca 
        ON f.CustomerID = ca.CustomerID
    LEFT JOIN dbo.ClientesActuales AS bc 
        ON f.BillToCustomerID = bc.CustomerID
    INNER JOIN dbo.FormasEntrega AS fe 
        ON f.DeliveryMethodID = fe.DeliveryMethodID
    INNER JOIN dbo.Contactos AS cts 
        ON f.ContactPersonID = cts.PersonID
    LEFT JOIN dbo.Contactos AS acc 
        ON f.AccountsPersonID = acc.PersonID
    INNER JOIN dbo.Contactos AS ctos 
        ON f.SalespersonPersonID = ctos.PersonID
    LEFT JOIN dbo.Contactos AS pbp 
        ON f.PackedByPersonID = pbp.PersonID
    WHERE f.InvoiceID = @InvoiceID;

    /* Detalle de productos de la factura. */
    SELECT
        pa.StockItemID,
        pa.StockItemName AS Producto,
        df.Description,
        df.PackageTypeID,
        df.Quantity AS Cantidad,
        df.UnitPrice AS Precio_Unitario,
        df.TaxRate AS Impuesto_Aplicado,
        df.TaxAmount AS Impuesto_Monto,
        df.ExtendedPrice AS Total_Linea
    FROM dbo.DetalleFacturas df
    INNER JOIN dbo.ProductosActuales AS pa 
        ON df.StockItemID = pa.StockItemID
    WHERE df.InvoiceID = @InvoiceID;
END
GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Ventas_Insertar
*
* DESCRIPCION: Inserta una nueva factura y su detalle de producto.
*              Valida los datos obligatorios, registros relacionados y rangos
*              antes de realizar las operaciones.
*
* ENTRADA:
*   Datos de la factura, cliente, entrega, contactos y producto.
*
* SALIDA: InvoiceID generado para la nueva factura.
*
* RESTRICCIONES: Los clientes, contactos, métodos de entrega, productos,
*                pedidos y tipos de paquete relacionados deben existir.
*                La cantidad y los porcentajes deben cumplir los rangos definidos.
*
* OBJETIVO: Registrar una venta completa mediante una factura y una línea
*           de detalle dentro de una misma transacción.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Insertar

    /* Datos de la factura. */
    @CustomerID INT,
    @BillToCustomerID INT,
    @OrderID INT,
    @DeliveryMethod INT,
    @ContactPersonID INT,
    @AccountsPersonID INT,
    @SalespersonPersonID INT,
    @PackedByPersonID INT,
    @InvoiceDate DATE,
    @CustomerPurchaseOrderNumber NVARCHAR(20),
    @IsCreditNote BIT,
    @CreditNoteReason NVARCHAR(MAX),
    @Comments NVARCHAR(MAX),
    @DeliveryInstructions NVARCHAR(MAX),
    @InternalComments NVARCHAR(MAX),
    @TotalDryItems INT,
    @TotalChillerItems INT,
    @DeliveryRun NVARCHAR(5),
    @RunPosition NVARCHAR(5),
    @ReturnedDeliveryData NVARCHAR(MAX),
    @LastEditedBy INT = 1,

    /* Datos del detalle de factura. */
    @StockItemID INT,
    @Description NVARCHAR(100),
    @PackageTypeID INT,
    @Quantity INT,
    @UnitPrice DECIMAL(18,2),
    @TaxRate DECIMAL(18,2)

AS
BEGIN

    SET NOCOUNT ON;

    /* =====================================================*
       VALIDACIÓN DE CAMPOS OBLIGATORIOS - FACTURA
       ===================================================== */

    IF @CustomerID IS NULL
    BEGIN
        RAISERROR('El CustomerID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @BillToCustomerID IS NULL
    BEGIN
        RAISERROR('El BillToCustomerID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @DeliveryMethod IS NULL
    BEGIN
        RAISERROR('El DeliveryMethodID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @ContactPersonID IS NULL
    BEGIN
        RAISERROR('El ContactPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @AccountsPersonID IS NULL
    BEGIN
        RAISERROR('El AccountsPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @SalespersonPersonID IS NULL
    BEGIN
        RAISERROR('El SalespersonPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @PackedByPersonID IS NULL
    BEGIN
        RAISERROR('El PackedByPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @InvoiceDate IS NULL
    BEGIN
        RAISERROR('La fecha de factura es obligatoria.', 16, 1);
        RETURN;
    END

    IF @IsCreditNote IS NULL
    BEGIN
        RAISERROR('El indicador de nota de crédito es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TotalDryItems IS NULL
    BEGIN
        RAISERROR('El total de artículos secos es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TotalChillerItems IS NULL
    BEGIN
        RAISERROR('El total de artículos refrigerados es obligatorio.', 16, 1);
        RETURN;
    END

    IF @LastEditedBy IS NULL
    BEGIN
        RAISERROR('El LastEditedBy es obligatorio.', 16, 1);
        RETURN;
    END

    /* Validar existencia de clientes. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR('El CustomerID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @BillToCustomerID
    )
    BEGIN
        RAISERROR('El BillToCustomerID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar pedido relacionado. */
    IF @OrderID IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Pedidos
            WHERE OrderID = @OrderID
        )
    BEGIN
        RAISERROR('El OrderID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar método de entrega. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.FormasEntrega
        WHERE DeliveryMethodID = @DeliveryMethod
    )
    BEGIN
        RAISERROR('El DeliveryMethodID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar contactos. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @ContactPersonID
    )
    BEGIN
        RAISERROR('El ContactPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @AccountsPersonID
    )
    BEGIN
        RAISERROR('El AccountsPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @SalespersonPersonID
    )
    BEGIN
        RAISERROR('El SalespersonPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @PackedByPersonID
    )
    BEGIN
        RAISERROR('El PackedByPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar número de orden de compra. */
    IF @CustomerPurchaseOrderNumber IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Pedidos
            WHERE CustomerPurchaseOrderNumber = @CustomerPurchaseOrderNumber
        )
    BEGIN
        RAISERROR(
            'El CustomerPurchaseOrderNumber indicado no existe en los pedidos.',
            16,
            3
        );
        RETURN;
    END

    /* Validar datos del detalle. */
    IF @StockItemID IS NULL
    BEGIN
        RAISERROR('El StockItemID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @Description IS NULL OR @Description = ''
    BEGIN
        RAISERROR('La descripción es obligatoria.', 16, 1);
        RETURN;
    END

    IF @PackageTypeID IS NULL
    BEGIN
        RAISERROR('El PackageTypeID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @Quantity IS NULL
    BEGIN
        RAISERROR('La cantidad es obligatoria.', 16, 1);
        RETURN;
    END

    IF @TaxRate IS NULL
    BEGIN
        RAISERROR('El TaxRate es obligatorio.', 16, 1);
        RETURN;
    END

    /* Validar producto. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosActuales
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR('El StockItemID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar tipo de paquete. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.EmpaquetamientoInventario
        WHERE PackageTypeID = @PackageTypeID
    )
    BEGIN
        RAISERROR('El PackageTypeID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar costo del producto. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosInventario
        WHERE StockItemID = @StockItemID
          AND LastCostPrice IS NOT NULL
    )
    BEGIN
        RAISERROR(
            'El producto no tiene un LastCostPrice disponible para calcular la ganancia.',
            16,
            3
        );
        RETURN;
    END

    /* Validar rangos numéricos. */
    IF @Quantity <= 0
    BEGIN
        RAISERROR('La cantidad debe ser mayor que cero.', 16, 2);
        RETURN;
    END

    IF @TaxRate < 0 OR @TaxRate > 100
    BEGIN
        RAISERROR('El TaxRate debe estar entre 0 y 100.', 16, 2);
        RETURN;
    END

    IF @UnitPrice IS NOT NULL AND @UnitPrice < 0
    BEGIN
        RAISERROR('El UnitPrice no puede ser negativo.', 16, 2);
        RETURN;
    END

    IF @TotalDryItems < 0
    BEGIN
        RAISERROR('El total de artículos secos no puede ser negativo.', 16, 2);
        RETURN;
    END

    IF @TotalChillerItems < 0
    BEGIN
        RAISERROR('El total de artículos refrigerados no puede ser negativo.', 16, 2);
        RETURN;
    END

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* =====================================================*
           INSERTAR FACTURA
           ===================================================== */

        INSERT INTO dbo.Facturas
        (
            CustomerID,
            BillToCustomerID,
            OrderID,
            DeliveryMethodID,
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
            LastEditedBy
        )
        VALUES
        (
            @CustomerID,
            @BillToCustomerID,
            @OrderID,
            @DeliveryMethod,
            @ContactPersonID,
            @AccountsPersonID,
            @SalespersonPersonID,
            @PackedByPersonID,
            @InvoiceDate,
            @CustomerPurchaseOrderNumber,
            @IsCreditNote,
            @CreditNoteReason,
            @Comments,
            @DeliveryInstructions,
            @InternalComments,
            @TotalDryItems,
            @TotalChillerItems,
            @DeliveryRun,
            @RunPosition,
            @ReturnedDeliveryData,
            @LastEditedBy
        );

        DECLARE @NuevoInvoiceID INT;
        SET @NuevoInvoiceID = SCOPE_IDENTITY();

        /* Obtener el costo del producto. */
        DECLARE @LastCostPrice DECIMAL(18,2);

        SELECT @LastCostPrice = LastCostPrice
        FROM dbo.ProductosInventario
        WHERE StockItemID = @StockItemID;

        /* Calcular los valores derivados del detalle. */
        DECLARE @TaxAmount DECIMAL(18,2);
        DECLARE @ExtendedPrice DECIMAL(18,2);
        DECLARE @LineProfit DECIMAL(18,2);

        IF @UnitPrice IS NULL
        BEGIN
            SET @TaxAmount = 0;
            SET @ExtendedPrice = 0;
            SET @LineProfit = 0;
        END
        ELSE
        BEGIN
            SET @TaxAmount =
                (@Quantity * @UnitPrice) * (@TaxRate / 100);

            SET @ExtendedPrice =
                (@Quantity * @UnitPrice) + @TaxAmount;

            SET @LineProfit =
                (@Quantity * @UnitPrice) - (@Quantity * @LastCostPrice);
        END

        /* =====================================================*
           INSERTAR DETALLE DE FACTURA
           ===================================================== */

        INSERT INTO dbo.DetalleFacturas
        (
            InvoiceID,
            StockItemID,
            Description,
            PackageTypeID,
            Quantity,
            UnitPrice,
            TaxRate,
            TaxAmount,
            LineProfit,
            ExtendedPrice,
            LastEditedBy
        )
        VALUES
        (
            @NuevoInvoiceID,
            @StockItemID,
            @Description,
            @PackageTypeID,
            @Quantity,
            @UnitPrice,
            @TaxRate,
            @TaxAmount,
            @LineProfit,
            @ExtendedPrice,
            @LastEditedBy
        );

        COMMIT TRANSACTION;

        /* Retornar el ID generado. */
        SELECT @NuevoInvoiceID AS InvoiceID;

    END TRY
    BEGIN CATCH
        /* Deshacer la transacción si ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END
GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Ventas_Actualizar
*
* DESCRIPCION: Modifica una factura existente y su línea de detalle.
*              Recalcula los valores derivados del detalle.
*
* ENTRADA:
*   @InvoiceID  Identificador de la factura.
*   Datos actualizados de la factura y del producto.
*
* SALIDA: InvoiceID y StockItemID actualizados.
*
* RESTRICCIONES: La factura, producto y registros relacionados deben existir.
*                Los valores obligatorios y rangos deben ser válidos.
*
* OBJETIVO: Actualizar una venta completa manteniendo la factura y su detalle
*           dentro de una misma transacción.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Actualizar

    /* Se utiliza para identificar la factura. */
    @InvoiceID INT,

    /* Datos de la factura. */
    @CustomerID INT,
    @BillToCustomerID INT,
    @OrderID INT,
    @DeliveryMethod INT,
    @ContactPersonID INT,
    @AccountsPersonID INT,
    @SalespersonPersonID INT,
    @PackedByPersonID INT,
    @InvoiceDate DATE,
    @CustomerPurchaseOrderNumber NVARCHAR(20),
    @IsCreditNote BIT,
    @CreditNoteReason NVARCHAR(MAX),
    @Comments NVARCHAR(MAX),
    @DeliveryInstructions NVARCHAR(MAX),
    @InternalComments NVARCHAR(MAX),
    @TotalDryItems INT,
    @TotalChillerItems INT,
    @DeliveryRun NVARCHAR(5),
    @RunPosition NVARCHAR(5),
    @ReturnedDeliveryData NVARCHAR(MAX),
    @LastEditedBy INT = 1,

    /* Datos del detalle de factura. */
    @StockItemID INT,
    @Description NVARCHAR(100),
    @PackageTypeID INT,
    @Quantity INT,
    @UnitPrice DECIMAL(18,2),
    @TaxRate DECIMAL(18,2)

AS
BEGIN

    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    IF @InvoiceID IS NULL
    BEGIN
        RAISERROR('El InvoiceID es obligatorio.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Facturas
        WHERE InvoiceID = @InvoiceID
    )
    BEGIN
        RAISERROR('La factura que intenta actualizar no existe.', 16, 5);
        RETURN;
    END

    IF @StockItemID IS NULL
    BEGIN
        RAISERROR('El StockItemID es obligatorio.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.DetalleFacturas
        WHERE InvoiceID = @InvoiceID
          AND StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR(
            'El producto indicado no existe dentro del detalle de la factura.',
            16,
            5
        );
        RETURN;
    END

    IF @CustomerID IS NULL
    BEGIN
        RAISERROR('El CustomerID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @BillToCustomerID IS NULL
    BEGIN
        RAISERROR('El BillToCustomerID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @DeliveryMethod IS NULL
    BEGIN
        RAISERROR('El DeliveryMethodID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @ContactPersonID IS NULL
    BEGIN
        RAISERROR('El ContactPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @AccountsPersonID IS NULL
    BEGIN
        RAISERROR('El AccountsPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @SalespersonPersonID IS NULL
    BEGIN
        RAISERROR('El SalespersonPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @PackedByPersonID IS NULL
    BEGIN
        RAISERROR('El PackedByPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @InvoiceDate IS NULL
    BEGIN
        RAISERROR('La fecha de factura es obligatoria.', 16, 1);
        RETURN;
    END

    IF @IsCreditNote IS NULL
    BEGIN
        RAISERROR('El indicador de nota de crédito es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TotalDryItems IS NULL
    BEGIN
        RAISERROR('El total de artículos secos es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TotalChillerItems IS NULL
    BEGIN
        RAISERROR('El total de artículos refrigerados es obligatorio.', 16, 1);
        RETURN;
    END

    IF @LastEditedBy IS NULL
    BEGIN
        RAISERROR('El LastEditedBy es obligatorio.', 16, 1);
        RETURN;
    END

    /* Validar existencia de clientes. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR('El CustomerID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @BillToCustomerID
    )
    BEGIN
        RAISERROR('El BillToCustomerID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar pedido. */
    IF @OrderID IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Pedidos
            WHERE OrderID = @OrderID
        )
    BEGIN
        RAISERROR('El OrderID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar método de entrega. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.FormasEntrega
        WHERE DeliveryMethodID = @DeliveryMethod
    )
    BEGIN
        RAISERROR('El DeliveryMethodID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar contactos. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @ContactPersonID
    )
    BEGIN
        RAISERROR('El ContactPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @AccountsPersonID
    )
    BEGIN
        RAISERROR('El AccountsPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @SalespersonPersonID
    )
    BEGIN
        RAISERROR('El SalespersonPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @PackedByPersonID
    )
    BEGIN
        RAISERROR('El PackedByPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar número de orden de compra. */
    IF @CustomerPurchaseOrderNumber IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Pedidos
            WHERE CustomerPurchaseOrderNumber = @CustomerPurchaseOrderNumber
        )
    BEGIN
        RAISERROR(
            'El CustomerPurchaseOrderNumber indicado no existe en los pedidos.',
            16,
            3
        );
        RETURN;
    END

    /* Validar detalle. */
    IF @Description IS NULL OR @Description = ''
    BEGIN
        RAISERROR('La descripción es obligatoria.', 16, 1);
        RETURN;
    END

    IF @PackageTypeID IS NULL
    BEGIN
        RAISERROR('El PackageTypeID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @Quantity IS NULL
    BEGIN
        RAISERROR('La cantidad es obligatoria.', 16, 1);
        RETURN;
    END

    IF @TaxRate IS NULL
    BEGIN
        RAISERROR('El TaxRate es obligatorio.', 16, 1);
        RETURN;
    END

    /* Validar producto. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosActuales
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR('El StockItemID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar tipo de paquete. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.EmpaquetamientoInventario
        WHERE PackageTypeID = @PackageTypeID
    )
    BEGIN
        RAISERROR('El PackageTypeID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar costo del producto. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosInventario
        WHERE StockItemID = @StockItemID
          AND LastCostPrice IS NOT NULL
    )
    BEGIN
        RAISERROR(
            'El producto no tiene un LastCostPrice disponible para calcular la ganancia.',
            16,
            3
        );
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        /* =================================================*
           ACTUALIZAR FACTURA
           ================================================= */

        UPDATE dbo.Facturas
        SET
            CustomerID = @CustomerID,
            BillToCustomerID = @BillToCustomerID,
            OrderID = @OrderID,
            DeliveryMethodID = @DeliveryMethod,
            ContactPersonID = @ContactPersonID,
            AccountsPersonID = @AccountsPersonID,
            SalespersonPersonID = @SalespersonPersonID,
            PackedByPersonID = @PackedByPersonID,
            InvoiceDate = @InvoiceDate,
            CustomerPurchaseOrderNumber = @CustomerPurchaseOrderNumber,
            IsCreditNote = @IsCreditNote,
            CreditNoteReason = @CreditNoteReason,
            Comments = @Comments,
            DeliveryInstructions = @DeliveryInstructions,
            InternalComments = @InternalComments,
            TotalDryItems = @TotalDryItems,
            TotalChillerItems = @TotalChillerItems,
            DeliveryRun = @DeliveryRun,
            RunPosition = @RunPosition,
            ReturnedDeliveryData = @ReturnedDeliveryData,
            LastEditedBy = @LastEditedBy
        WHERE InvoiceID = @InvoiceID;

        /* Obtener el costo del producto. */
        DECLARE @LastCostPrice DECIMAL(18,2);

        SELECT @LastCostPrice = LastCostPrice
        FROM dbo.ProductosInventario
        WHERE StockItemID = @StockItemID;

        /* Calcular los valores derivados. */
        DECLARE @TaxAmount DECIMAL(18,2);
        DECLARE @ExtendedPrice DECIMAL(18,2);
        DECLARE @LineProfit DECIMAL(18,2);

        IF @UnitPrice IS NULL
        BEGIN
            SET @TaxAmount = 0;
            SET @ExtendedPrice = 0;
            SET @LineProfit = 0;
        END
        ELSE
        BEGIN
            SET @TaxAmount =
                (@Quantity * @UnitPrice) * (@TaxRate / 100);

            SET @ExtendedPrice =
                (@Quantity * @UnitPrice) + @TaxAmount;

            SET @LineProfit =
                @ExtendedPrice - (@Quantity * @LastCostPrice);
        END

        /* =================================================*
           ACTUALIZAR DETALLE DE FACTURA
           ================================================= */

        UPDATE dbo.DetalleFacturas
        SET
            Description = @Description,
            PackageTypeID = @PackageTypeID,
            Quantity = @Quantity,
            UnitPrice = @UnitPrice,
            TaxRate = @TaxRate,
            TaxAmount = @TaxAmount,
            LineProfit = @LineProfit,
            ExtendedPrice = @ExtendedPrice,
            LastEditedBy = @LastEditedBy
        WHERE InvoiceID = @InvoiceID
          AND StockItemID = @StockItemID;

        COMMIT TRANSACTION;

        /* Retornar los identificadores actualizados. */
        SELECT
            @InvoiceID AS InvoiceID,
            @StockItemID AS StockItemID;

    END TRY
    BEGIN CATCH
        /* Deshacer la transacción si ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END
GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Ventas_Opciones
*
* DESCRIPCION: Obtiene los datos necesarios para llenar los campos de selección
*              utilizados en el módulo de ventas.
*
* ENTRADA: No recibe parámetros.
*
* SALIDA:
*   1. Clientes.
*   2. Métodos de entrega.
*   3. Contactos generales.
*   4. Vendedores.
*   5. Pedidos.
*   6. Productos.
*   7. Tipos de paquete.
*
* RESTRICCIONES: Los datos deben existir en las tablas correspondientes.
*
* OBJETIVO: Proporcionar las opciones disponibles para crear o editar una venta.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Opciones
AS
BEGIN
    SET NOCOUNT ON;

    /* 1. Clientes. */
    SELECT
        CustomerID AS ID,
        CustomerName AS Nombre
    FROM dbo.ClientesActuales
    ORDER BY CustomerName;

    /* 2. Métodos de entrega. */
    SELECT
        DeliveryMethodID AS ID,
        DeliveryMethodName AS Nombre
    FROM dbo.FormasEntrega
    ORDER BY DeliveryMethodName;

    /* 3. Contactos generales. */
    SELECT
        PersonID AS ID,
        FullName AS Nombre
    FROM dbo.Contactos
    WHERE IsSalesperson = 0
    ORDER BY FullName;

    /* 4. Vendedores. */
    SELECT
        PersonID AS ID,
        FullName AS Nombre
    FROM dbo.Contactos
    WHERE IsSalesperson = 1
    ORDER BY FullName;

    /* 5. Pedidos. */
    SELECT
        OrderID AS ID,
        CustomerPurchaseOrderNumber AS Numero_Orden
    FROM dbo.Pedidos
    ORDER BY OrderID;

    /* 6. Productos. */
    SELECT
        StockItemID AS ID,
        StockItemName AS Nombre
    FROM dbo.ProductosActuales
    ORDER BY StockItemName;

    /* 7. Tipos de paquete. */
    SELECT
        PackageTypeID AS ID,
        PackageTypeName AS Nombre
    FROM dbo.EmpaquetamientoInventario
    ORDER BY PackageTypeName;
END;
GO