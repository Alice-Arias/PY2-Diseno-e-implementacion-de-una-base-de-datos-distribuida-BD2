/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 16_Corporativo_Estadisticas.sql
*
* DESCRIPCION:
* Estadísticas del rol Corporativo, con filtro por sucursal o consolidado.
*
*   1. CONSOLIDACIÓN (Estadisticas.SP_Sincronizar)
*      Cada sucursal guarda sus facturas (fragmentación horizontal). El Corporativo
*      tiene una copia consolidada que se actualiza cada 5 minutos con un job de
*      SQL Server Agent: trae por los linked servers las facturas nuevas o modificadas
*      y las existencias de cada sucursal. Como cada sucursal genera sus IDs en un
*      rango distinto (10 000 000+ y 20 000 000+), nunca chocan al consolidar.
*
*      Fallas: si una sucursal no responde, se salta, se registra "Sin conexión" en
*      Estadisticas.ControlSincronizacion y las estadísticas siguen mostrando sus
*      últimos datos, con la fecha de corte.
*
*   2. VISTAS MATERIALIZADAS (vistas indexadas)
*      Estadisticas.vw_TotalesFactura      -> monto, ganancia y líneas por factura
*      Estadisticas.vw_VentasSucursalMes   -> ventas por sucursal, año y mes
*      SQL Server guarda su resultado ya calculado y lo mantiene al día solo cuando
*      entran facturas nuevas.
*
*   3. FILTRO POR SUCURSAL EN LOS 11 REPORTES DEL PROYECTO
*      Los reportes de SP_Reportes.sql se instalan aquí casi sin cambios: solo reciben
*      @Sucursal (NULL = consolidado, 1 = San José, 2 = Limón) y lo guardan en
*      SESSION_CONTEXT. Los sinónimos dbo.Facturas, dbo.OrdenesCompra,
*      dbo.ProductosInventario y dbo.ProductosTransacciones apuntan a vistas que
*      filtran según ese valor.
*
*   4. Estadisticas.SP_Resumen_Sucursales: tarjetas, ventas por mes, comparativo
*      entre sucursales y estado de la sincronización (lee las vistas materializadas).
*
* RESTRICCIONES: Ejecutar SOLO en el Corporativo, después de 06, 10 y 14.
* Se puede ejecutar más de una vez.
*
*-----------------------------------------------------------------------------------------*/

/* Opciones obligatorias para crear y mantener vistas indexadas. */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

USE WideWorldImporters;
GO

DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(N'Este script es para el Corporativo, pero el servidor actual es %s. No se hizo ningún cambio.', 16, 1, @Servidor);
    SET NOEXEC ON;
END
GO

IF SCHEMA_ID(N'Estadisticas') IS NULL EXEC (N'CREATE SCHEMA Estadisticas');
GO

/*---------------------------------------------------------------------------------------*
* Paso 1: tablas de control y de inventario consolidado
*-----------------------------------------------------------------------------------------*/

IF OBJECT_ID(N'Estadisticas.ControlSincronizacion', N'U') IS NULL
    CREATE TABLE Estadisticas.ControlSincronizacion
    (
        SucursalID            TINYINT        NOT NULL CONSTRAINT PK_ControlSincronizacion PRIMARY KEY,
        Sucursal              NVARCHAR(30)   NOT NULL,
        UltimaSincronizacion  DATETIME2(0)   NULL,      -- último corte exitoso
        UltimoIntento         DATETIME2(0)   NULL,
        Estado                NVARCHAR(400)  NULL,
        FacturasActualizadas  INT            NULL
    );
GO

IF OBJECT_ID(N'Estadisticas.InventarioSucursal', N'U') IS NULL
    CREATE TABLE Estadisticas.InventarioSucursal
    (
        SucursalID        TINYINT        NOT NULL,
        StockItemID       INT            NOT NULL,
        QuantityOnHand    INT            NOT NULL,
        BinLocation       NVARCHAR(20)   NULL,
        LastCostPrice     DECIMAL(18,2)  NULL,
        ReorderLevel      INT            NULL,
        TargetStockLevel  INT            NULL,
        FechaCorte        DATETIME2(0)   NOT NULL,
        CONSTRAINT PK_InventarioSucursal PRIMARY KEY (SucursalID, StockItemID)
    );
GO

/*---------------------------------------------------------------------------------------*
* Paso 2: vistas materializadas (vistas indexadas)
*-----------------------------------------------------------------------------------------*/

IF OBJECT_ID(N'Estadisticas.vw_TotalesFactura', N'V') IS NULL
    EXEC (N'
    CREATE VIEW Estadisticas.vw_TotalesFactura
    WITH SCHEMABINDING
    AS
    SELECT  il.InvoiceID,
            SUM(il.ExtendedPrice) AS Monto,
            SUM(il.LineProfit)    AS Ganancia,
            SUM(il.Quantity)      AS Unidades,
            COUNT_BIG(*)          AS Lineas
    FROM    Sales.InvoiceLines AS il
    GROUP BY il.InvoiceID;');
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'Estadisticas.vw_TotalesFactura') AND index_id = 1)
    CREATE UNIQUE CLUSTERED INDEX IX_vw_TotalesFactura
        ON Estadisticas.vw_TotalesFactura (InvoiceID);
GO

IF OBJECT_ID(N'Estadisticas.vw_VentasSucursalMes', N'V') IS NULL
    EXEC (N'
    CREATE VIEW Estadisticas.vw_VentasSucursalMes
    WITH SCHEMABINDING
    AS
    SELECT  i.SucursalID,
            YEAR(i.InvoiceDate)   AS Anio,
            MONTH(i.InvoiceDate)  AS Mes,
            SUM(il.ExtendedPrice) AS Monto,
            SUM(il.LineProfit)    AS Ganancia,
            SUM(il.Quantity)      AS Unidades,
            COUNT_BIG(*)          AS Lineas
    FROM    Sales.Invoices     AS i
    JOIN    Sales.InvoiceLines AS il ON il.InvoiceID = i.InvoiceID
    GROUP BY i.SucursalID, YEAR(i.InvoiceDate), MONTH(i.InvoiceDate);');
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'Estadisticas.vw_VentasSucursalMes') AND index_id = 1)
    CREATE UNIQUE CLUSTERED INDEX IX_vw_VentasSucursalMes
        ON Estadisticas.vw_VentasSucursalMes (SucursalID, Anio, Mes);
GO

/*---------------------------------------------------------------------------------------*
* Paso 3: vistas con filtro por sucursal (SESSION_CONTEXT 'Sucursal')
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER VIEW Estadisticas.vFacturas
AS
SELECT  i.*
FROM    Sales.Invoices AS i
WHERE   SESSION_CONTEXT(N'Sucursal') IS NULL
   OR   i.SucursalID = CAST(SESSION_CONTEXT(N'Sucursal') AS TINYINT);
GO

CREATE OR ALTER VIEW Estadisticas.vOrdenesCompra
AS
SELECT  po.*
FROM    Purchasing.PurchaseOrders AS po
WHERE   SESSION_CONTEXT(N'Sucursal') IS NULL
   OR   po.SucursalID = CAST(SESSION_CONTEXT(N'Sucursal') AS TINYINT);
GO

/* Existencias: suma de las sucursales elegidas (última sincronización). */
CREATE OR ALTER VIEW Estadisticas.vProductosInventario
AS
SELECT  inv.StockItemID,
        SUM(inv.QuantityOnHand) AS QuantityOnHand,
        MAX(inv.FechaCorte)     AS FechaCorte
FROM    Estadisticas.InventarioSucursal AS inv
WHERE   SESSION_CONTEXT(N'Sucursal') IS NULL
   OR   inv.SucursalID = CAST(SESSION_CONTEXT(N'Sucursal') AS TINYINT)
GROUP BY inv.StockItemID;
GO

/* Movimientos de inventario: la sucursal se deduce de su factura u orden de compra
   (misma regla que la fragmentación horizontal). */
CREATE OR ALTER VIEW Estadisticas.vProductosTransacciones
AS
SELECT  t.StockItemTransactionID,
        t.StockItemID,
        t.TransactionTypeID,
        t.CustomerID,
        t.InvoiceID,
        t.SupplierID,
        t.PurchaseOrderID,
        t.TransactionOccurredWhen,
        t.Quantity,
        s.SucursalID
FROM    Warehouse.StockItemTransactions AS t
LEFT JOIN Sales.Invoices            AS i  ON i.InvoiceID = t.InvoiceID
LEFT JOIN Purchasing.PurchaseOrders AS po ON po.PurchaseOrderID = t.PurchaseOrderID
CROSS APPLY (SELECT COALESCE(i.SucursalID, po.SucursalID,
                    CASE WHEN t.StockItemTransactionID % 2 = 0 THEN 1 ELSE 2 END) AS SucursalID) AS s
WHERE   SESSION_CONTEXT(N'Sucursal') IS NULL
   OR   s.SucursalID = CAST(SESSION_CONTEXT(N'Sucursal') AS TINYINT);
GO

/*---------------------------------------------------------------------------------------*
* Paso 4: sinónimos que usan los reportes del proyecto
*-----------------------------------------------------------------------------------------*/

DECLARE @Sinonimos TABLE (Nombre SYSNAME, Destino NVARCHAR(400));

INSERT INTO @Sinonimos (Nombre, Destino) VALUES
    /* Con filtro por sucursal */
    (N'Facturas',               N'Estadisticas.vFacturas'),
    (N'OrdenesCompra',          N'Estadisticas.vOrdenesCompra'),
    (N'ProductosInventario',    N'Estadisticas.vProductosInventario'),
    (N'ProductosTransacciones', N'Estadisticas.vProductosTransacciones'),
    /* Detalles: siempre se usan unidos a su encabezado, que ya está filtrado */
    (N'DetalleFacturas',        N'Sales.InvoiceLines'),
    (N'DetallesFactura',        N'Sales.InvoiceLines'),
    (N'DetalleOrdenCompra',     N'Purchasing.PurchaseOrderLines'),
    /* Catálogos (iguales en todos los nodos) */
    (N'ClientesActuales',       N'Sales.Customers'),
    (N'TiposCliente',           N'Sales.CustomerCategories'),
    (N'GruposCompradores',      N'Sales.BuyingGroups'),
    (N'Contactos',              N'Application.People'),
    (N'FormasEntrega',          N'Application.DeliveryMethods'),
    (N'Ciudades',               N'Application.Cities'),
    (N'ProveedoresActuales',    N'Purchasing.Suppliers'),
    (N'CategoriaProveedores',   N'Purchasing.SupplierCategories'),
    (N'ProductosActuales',      N'Warehouse.StockItems'),
    (N'GruposInventario',       N'Warehouse.StockGroups'),
    (N'ItemGrupos',             N'Warehouse.StockItemStockGroups'),
    (N'ColoresProductos',       N'Warehouse.Colors'),
    (N'EmpaquetamientoInventario', N'Warehouse.PackageTypes');

DECLARE @Nombre SYSNAME, @Destino NVARCHAR(400), @sql NVARCHAR(MAX);
DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT Nombre, Destino FROM @Sinonimos;
OPEN cur;
FETCH NEXT FROM cur INTO @Nombre, @Destino;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF OBJECT_ID(N'dbo.' + @Nombre, N'SN') IS NOT NULL
    BEGIN
        SET @sql = N'DROP SYNONYM dbo.' + QUOTENAME(@Nombre) + N';';
        EXEC sp_executesql @sql;
    END
    SET @sql = N'CREATE SYNONYM dbo.' + QUOTENAME(@Nombre) + N' FOR ' + @Destino + N';';
    EXEC sp_executesql @sql;
    FETCH NEXT FROM cur INTO @Nombre, @Destino;
END
CLOSE cur;
DEALLOCATE cur;
GO

/*---------------------------------------------------------------------------------------*
* Paso 5: sincronización (consolidación de las sucursales en el Corporativo)
*
* WITH EXECUTE AS OWNER: los linked servers solo los puede usar el dueño de la base
* (ver 14_Corporativo_Catalogo.sql). Así también lo puede ejecutar app_corporativo.
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Estadisticas.SP_Sincronizar
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET ANSI_WARNINGS ON;
    SET ARITHABORT ON;
    SET CONCAT_NULL_YIELDS_NULL ON;
    SET ANSI_PADDING ON;
    SET NUMERIC_ROUNDABORT OFF;

    DECLARE @Sucursales TABLE (SucursalID TINYINT, Enlace SYSNAME, Nombre NVARCHAR(30));
    INSERT INTO @Sucursales VALUES (1, N'LS_SANJOSE', N'San José'), (2, N'LS_LIMON', N'Limón');

    DECLARE @ID TINYINT, @Enlace SYSNAME, @Nombre NVARCHAR(30);
    DECLARE @MaxID INT, @Desde DATETIME2(7), @Inicio DATETIME2(0), @Filas INT, @sql NVARCHAR(MAX), @Err NVARCHAR(400);

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT SucursalID, Enlace, Nombre FROM @Sucursales ORDER BY SucursalID;
    OPEN cur;
    FETCH NEXT FROM cur INTO @ID, @Enlace, @Nombre;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @Inicio = SYSDATETIME();
        SET @MaxID  = ISNULL((SELECT MAX(InvoiceID) FROM Sales.Invoices WHERE SucursalID = @ID), 0);
        SET @Desde  = ISNULL((SELECT DATEADD(MINUTE, -1, UltimaSincronizacion)
                              FROM Estadisticas.ControlSincronizacion WHERE SucursalID = @ID), '20990101');

        IF OBJECT_ID(N'tempdb..#Inv') IS NOT NULL DROP TABLE #Inv;
        IF OBJECT_ID(N'tempdb..#Lin') IS NOT NULL DROP TABLE #Lin;
        IF OBJECT_ID(N'tempdb..#Hol') IS NOT NULL DROP TABLE #Hol;

        /* Tablas temporales con la misma estructura que las locales. */
        SELECT TOP (0) InvoiceID, CustomerID, BillToCustomerID, OrderID, DeliveryMethodID, ContactPersonID,
               AccountsPersonID, SalespersonPersonID, PackedByPersonID, InvoiceDate, CustomerPurchaseOrderNumber,
               IsCreditNote, CreditNoteReason, Comments, DeliveryInstructions, InternalComments,
               TotalDryItems, TotalChillerItems, DeliveryRun, RunPosition, ReturnedDeliveryData,
               LastEditedBy, LastEditedWhen, SucursalID
        INTO   #Inv FROM Sales.Invoices;

        SELECT TOP (0) InvoiceLineID, InvoiceID, StockItemID, Description, PackageTypeID, Quantity, UnitPrice,
               TaxRate, TaxAmount, LineProfit, ExtendedPrice, LastEditedBy, LastEditedWhen
        INTO   #Lin FROM Sales.InvoiceLines;

        SELECT TOP (0) StockItemID, QuantityOnHand, BinLocation, LastCostPrice, ReorderLevel, TargetStockLevel
        INTO   #Hol FROM Warehouse.StockItemHoldings;

        BEGIN TRY
            /* 1. Leer de la sucursal (fuera de transacción: no requiere transacción distribuida). */
            SET @sql = N'
                INSERT INTO #Inv
                SELECT InvoiceID, CustomerID, BillToCustomerID, OrderID, DeliveryMethodID, ContactPersonID,
                       AccountsPersonID, SalespersonPersonID, PackedByPersonID, InvoiceDate, CustomerPurchaseOrderNumber,
                       IsCreditNote, CreditNoteReason, Comments, DeliveryInstructions, InternalComments,
                       TotalDryItems, TotalChillerItems, DeliveryRun, RunPosition, ReturnedDeliveryData,
                       LastEditedBy, LastEditedWhen, @id
                FROM   ' + @Enlace + N'.WideWorldImporters.Sales.Invoices
                WHERE  InvoiceID > @max OR LastEditedWhen > @desde;

                INSERT INTO #Lin
                SELECT il.InvoiceLineID, il.InvoiceID, il.StockItemID, il.Description, il.PackageTypeID, il.Quantity,
                       il.UnitPrice, il.TaxRate, il.TaxAmount, il.LineProfit, il.ExtendedPrice,
                       il.LastEditedBy, il.LastEditedWhen
                FROM   ' + @Enlace + N'.WideWorldImporters.Sales.InvoiceLines AS il
                JOIN   ' + @Enlace + N'.WideWorldImporters.Sales.Invoices     AS i ON i.InvoiceID = il.InvoiceID
                WHERE  i.InvoiceID > @max OR i.LastEditedWhen > @desde;

                INSERT INTO #Hol
                SELECT StockItemID, QuantityOnHand, BinLocation, LastCostPrice, ReorderLevel, TargetStockLevel
                FROM   ' + @Enlace + N'.WideWorldImporters.Warehouse.StockItemHoldings;';

            EXEC sp_executesql @sql, N'@id TINYINT, @max INT, @desde DATETIME2(7)',
                 @id = @ID, @max = @MaxID, @desde = @Desde;

            /* 2. Aplicar en el Corporativo (transacción local). */
            BEGIN TRANSACTION;

            DELETE il
            FROM   Sales.InvoiceLines AS il
            WHERE  il.InvoiceID IN (SELECT InvoiceID FROM #Inv);

            MERGE Sales.Invoices AS t
            USING #Inv AS s ON t.InvoiceID = s.InvoiceID
            WHEN MATCHED THEN UPDATE SET
                CustomerID = s.CustomerID, BillToCustomerID = s.BillToCustomerID, OrderID = s.OrderID,
                DeliveryMethodID = s.DeliveryMethodID, ContactPersonID = s.ContactPersonID,
                AccountsPersonID = s.AccountsPersonID, SalespersonPersonID = s.SalespersonPersonID,
                PackedByPersonID = s.PackedByPersonID, InvoiceDate = s.InvoiceDate,
                CustomerPurchaseOrderNumber = s.CustomerPurchaseOrderNumber, IsCreditNote = s.IsCreditNote,
                CreditNoteReason = s.CreditNoteReason, Comments = s.Comments,
                DeliveryInstructions = s.DeliveryInstructions, InternalComments = s.InternalComments,
                TotalDryItems = s.TotalDryItems, TotalChillerItems = s.TotalChillerItems,
                DeliveryRun = s.DeliveryRun, RunPosition = s.RunPosition,
                ReturnedDeliveryData = s.ReturnedDeliveryData, LastEditedBy = s.LastEditedBy,
                LastEditedWhen = s.LastEditedWhen, SucursalID = s.SucursalID
            WHEN NOT MATCHED THEN INSERT
                (InvoiceID, CustomerID, BillToCustomerID, OrderID, DeliveryMethodID, ContactPersonID,
                 AccountsPersonID, SalespersonPersonID, PackedByPersonID, InvoiceDate, CustomerPurchaseOrderNumber,
                 IsCreditNote, CreditNoteReason, Comments, DeliveryInstructions, InternalComments,
                 TotalDryItems, TotalChillerItems, DeliveryRun, RunPosition, ReturnedDeliveryData,
                 LastEditedBy, LastEditedWhen, SucursalID)
            VALUES
                (s.InvoiceID, s.CustomerID, s.BillToCustomerID, s.OrderID, s.DeliveryMethodID, s.ContactPersonID,
                 s.AccountsPersonID, s.SalespersonPersonID, s.PackedByPersonID, s.InvoiceDate, s.CustomerPurchaseOrderNumber,
                 s.IsCreditNote, s.CreditNoteReason, s.Comments, s.DeliveryInstructions, s.InternalComments,
                 s.TotalDryItems, s.TotalChillerItems, s.DeliveryRun, s.RunPosition, s.ReturnedDeliveryData,
                 s.LastEditedBy, s.LastEditedWhen, s.SucursalID);

            SET @Filas = @@ROWCOUNT;

            INSERT INTO Sales.InvoiceLines
                (InvoiceLineID, InvoiceID, StockItemID, Description, PackageTypeID, Quantity, UnitPrice,
                 TaxRate, TaxAmount, LineProfit, ExtendedPrice, LastEditedBy, LastEditedWhen)
            SELECT InvoiceLineID, InvoiceID, StockItemID, Description, PackageTypeID, Quantity, UnitPrice,
                   TaxRate, TaxAmount, LineProfit, ExtendedPrice, LastEditedBy, LastEditedWhen
            FROM   #Lin;

            DELETE FROM Estadisticas.InventarioSucursal WHERE SucursalID = @ID;

            INSERT INTO Estadisticas.InventarioSucursal
                (SucursalID, StockItemID, QuantityOnHand, BinLocation, LastCostPrice, ReorderLevel, TargetStockLevel, FechaCorte)
            SELECT @ID, StockItemID, QuantityOnHand, BinLocation, LastCostPrice, ReorderLevel, TargetStockLevel, @Inicio
            FROM   #Hol;

            MERGE Estadisticas.ControlSincronizacion AS t
            USING (SELECT @ID AS SucursalID) AS s ON t.SucursalID = s.SucursalID
            WHEN MATCHED THEN UPDATE SET UltimaSincronizacion = @Inicio, UltimoIntento = @Inicio,
                                         Estado = N'OK', FacturasActualizadas = @Filas
            WHEN NOT MATCHED THEN INSERT (SucursalID, Sucursal, UltimaSincronizacion, UltimoIntento, Estado, FacturasActualizadas)
                                  VALUES (@ID, @Nombre, @Inicio, @Inicio, N'OK', @Filas);

            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            SET @Err = LEFT(N'Sin conexión: ' + ERROR_MESSAGE(), 400);

            /* Se conserva el último corte exitoso: las estadísticas siguen con esos datos. */
            MERGE Estadisticas.ControlSincronizacion AS t
            USING (SELECT @ID AS SucursalID) AS s ON t.SucursalID = s.SucursalID
            WHEN MATCHED THEN UPDATE SET UltimoIntento = @Inicio, Estado = @Err
            WHEN NOT MATCHED THEN INSERT (SucursalID, Sucursal, UltimoIntento, Estado)
                                  VALUES (@ID, @Nombre, @Inicio, @Err);
        END CATCH

        FETCH NEXT FROM cur INTO @ID, @Enlace, @Nombre;
    END

    CLOSE cur;
    DEALLOCATE cur;

    SELECT Sucursal, UltimaSincronizacion, UltimoIntento, Estado, FacturasActualizadas
    FROM   Estadisticas.ControlSincronizacion
    ORDER BY SucursalID;
END
GO

/*---------------------------------------------------------------------------------------*
* Paso 6: resumen por sucursal (lee las vistas materializadas)
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Estadisticas.SP_Resumen_Sucursales
    @Sucursal TINYINT = NULL,      -- NULL = consolidado, 1 = San José, 2 = Limón
    @Anio     INT     = NULL
AS
BEGIN
    SET NOCOUNT ON;

    /* 1. Tarjetas */
    SELECT  CASE @Sucursal WHEN 1 THEN N'San José' WHEN 2 THEN N'Limón' ELSE N'Consolidado' END AS Vista,
            ISNULL(SUM(v.Monto), 0)    AS Monto_Total,
            ISNULL(SUM(v.Ganancia), 0) AS Ganancia_Total,
            ISNULL(SUM(v.Unidades), 0) AS Unidades_Vendidas,
            ISNULL(SUM(v.Lineas), 0)   AS Lineas_Factura
    FROM    Estadisticas.vw_VentasSucursalMes AS v WITH (NOEXPAND)
    WHERE   (@Sucursal IS NULL OR v.SucursalID = @Sucursal)
      AND   (@Anio IS NULL OR v.Anio = @Anio);

    /* 2. Ventas por mes */
    SELECT  v.Anio, v.Mes,
            SUM(v.Monto)    AS Monto,
            SUM(v.Ganancia) AS Ganancia
    FROM    Estadisticas.vw_VentasSucursalMes AS v WITH (NOEXPAND)
    WHERE   (@Sucursal IS NULL OR v.SucursalID = @Sucursal)
      AND   (@Anio IS NULL OR v.Anio = @Anio)
    GROUP BY v.Anio, v.Mes
    ORDER BY v.Anio, v.Mes;

    /* 3. Comparativo entre sucursales (siempre las dos) */
    SELECT  v.SucursalID,
            CASE v.SucursalID WHEN 1 THEN N'San José' ELSE N'Limón' END AS Sucursal,
            SUM(v.Monto)    AS Monto,
            SUM(v.Ganancia) AS Ganancia,
            SUM(v.Unidades) AS Unidades
    FROM    Estadisticas.vw_VentasSucursalMes AS v WITH (NOEXPAND)
    WHERE   (@Anio IS NULL OR v.Anio = @Anio)
    GROUP BY v.SucursalID
    ORDER BY v.SucursalID;

    /* 4. Estado de los datos de cada sucursal */
    SELECT  Sucursal, UltimaSincronizacion, UltimoIntento, Estado
    FROM    Estadisticas.ControlSincronizacion
    ORDER BY SucursalID;
END
GO

/*---------------------------------------------------------------------------------------*
* Paso 7: los 11 reportes del proyecto, con @Sucursal
*         (SP_Reportes.sql actual; único cambio: parámetro @Sucursal + SESSION_CONTEXT)
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Reporte_ComprasProveedores
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @SupplierCategoryName NVARCHAR(50)  = NULL,
    @SupplierName         NVARCHAR(100) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH ComprasPorOrden AS
    (
        SELECT
            oc.PurchaseOrderID,
            pa.SupplierName,
            catp.SupplierCategoryName,
            SUM(doc.OrderedOuters * doc.ExpectedUnitPricePerOuter) AS Monto_Orden
        FROM dbo.OrdenesCompra AS oc
        INNER JOIN dbo.ProveedoresActuales  AS pa   ON oc.SupplierID = pa.SupplierID
        INNER JOIN dbo.CategoriaProveedores AS catp ON pa.SupplierCategoryID = catp.SupplierCategoryID
        INNER JOIN dbo.DetalleOrdenCompra   AS doc  ON oc.PurchaseOrderID = doc.PurchaseOrderID
        WHERE (@SupplierName IS NULL OR pa.SupplierName LIKE '%' + @SupplierName + '%')
          AND (@SupplierCategoryName IS NULL OR catp.SupplierCategoryName LIKE '%' + @SupplierCategoryName + '%')
        GROUP BY oc.PurchaseOrderID, pa.SupplierName, catp.SupplierCategoryName
    ),
    Agrupado AS
    (
        SELECT
            SupplierCategoryName,
            SupplierName,
            GROUPING(SupplierCategoryName) AS G_Categoria,
            GROUPING(SupplierName)         AS G_Proveedor,
            MAX(Monto_Orden) AS Monto_Maximo,
            MIN(Monto_Orden) AS Monto_Minimo,
            AVG(Monto_Orden) AS Monto_Promedio
        FROM ComprasPorOrden
        GROUP BY ROLLUP (SupplierCategoryName, SupplierName)
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY G_Categoria, SupplierCategoryName, G_Proveedor, SupplierName) AS Fila,
        CASE
            WHEN G_Proveedor = 1 AND G_Categoria = 0 THEN N'Subtotal Categoría'
            WHEN G_Proveedor = 1 AND G_Categoria = 1 THEN N'Total General'
            ELSE SupplierName
        END AS Nombre_Proveedor,
        CASE WHEN G_Categoria = 1 THEN N'-' ELSE SupplierCategoryName END AS Categoria_Proveedor,
        Monto_Maximo,
        Monto_Minimo,
        Monto_Promedio
    INTO #R
    FROM Agrupado;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Nombre_Proveedor, Categoria_Proveedor, Monto_Maximo, Monto_Minimo, Monto_Promedio
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Reporte_VentasToClientes
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @CustomerCategoryName NVARCHAR(50)  = NULL,
    @CustomerName         NVARCHAR(100) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH VentasPorFactura AS
    (
        SELECT
            f.InvoiceID,
            ca.CustomerName,
            tc.CustomerCategoryName,
            SUM(df.ExtendedPrice) AS Monto_Factura
        FROM dbo.Facturas AS f
        INNER JOIN dbo.ClientesActuales AS ca ON f.CustomerID = ca.CustomerID
        INNER JOIN dbo.TiposCliente     AS tc ON ca.CustomerCategoryID = tc.CustomerCategoryID
        INNER JOIN dbo.DetalleFacturas  AS df ON f.InvoiceID = df.InvoiceID
        WHERE (@CustomerName IS NULL OR ca.CustomerName LIKE '%' + @CustomerName + '%')
          AND (@CustomerCategoryName IS NULL OR tc.CustomerCategoryName LIKE '%' + @CustomerCategoryName + '%')
        GROUP BY f.InvoiceID, ca.CustomerName, tc.CustomerCategoryName
    ),
    Agrupado AS
    (
        SELECT
            CustomerCategoryName,
            CustomerName,
            GROUPING(CustomerCategoryName) AS G_Categoria,
            GROUPING(CustomerName)         AS G_Cliente,
            MIN(Monto_Factura) AS Monto_Minimo,
            MAX(Monto_Factura) AS Monto_Maximo,
            AVG(Monto_Factura) AS Monto_Promedio
        FROM VentasPorFactura
        GROUP BY ROLLUP (CustomerCategoryName, CustomerName)
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY G_Categoria, CustomerCategoryName, G_Cliente, CustomerName) AS Fila,
        CASE
            WHEN G_Cliente = 1 AND G_Categoria = 0 THEN N'Subtotal Categoría'
            WHEN G_Cliente = 1 AND G_Categoria = 1 THEN N'Total General'
            ELSE CustomerName
        END AS Nombre_Cliente,
        CASE WHEN G_Categoria = 1 THEN N'-' ELSE CustomerCategoryName END AS Categoria_Cliente,
        Monto_Minimo,
        Monto_Maximo,
        Monto_Promedio
    INTO #R
    FROM Agrupado;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Nombre_Cliente, Categoria_Cliente, Monto_Minimo, Monto_Maximo, Monto_Promedio
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Top_GananciaProductos
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @Anio INT = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH GananciaPorProducto AS
    (
        SELECT
            YEAR(f.InvoiceDate) AS Anio,
            pa.StockItemID,
            pa.StockItemName AS Producto,
            SUM(df.LineProfit) AS Ganancia_Total
        FROM dbo.DetalleFacturas AS df
        INNER JOIN dbo.ProductosActuales AS pa ON df.StockItemID = pa.StockItemID
        INNER JOIN dbo.Facturas          AS f  ON df.InvoiceID = f.InvoiceID
        WHERE @Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio
        GROUP BY YEAR(f.InvoiceDate), pa.StockItemID, pa.StockItemName
    ),
    RankingProductos AS
    (
        SELECT Anio, StockItemID, Producto, Ganancia_Total,
               DENSE_RANK() OVER (PARTITION BY Anio ORDER BY Ganancia_Total DESC) AS Posicion
        FROM GananciaPorProducto
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY Anio, Posicion, Producto) AS Fila,
        Anio, Producto, Ganancia_Total, Posicion
    INTO #R
    FROM RankingProductos
    WHERE Posicion <= 5;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Anio, Producto, Ganancia_Total, Posicion
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Top_ClientesFacturas
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @Anio INT = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH PorCliente AS
    (
        SELECT
            YEAR(f.InvoiceDate) AS Anio,
            f.CustomerID,
            ca.CustomerName AS Nombre_Cliente,
            COUNT(DISTINCT f.InvoiceID) AS Cantidad_Facturas,
            SUM(df.ExtendedPrice) AS Monto_Total_Facturado
        FROM dbo.Facturas AS f
        INNER JOIN dbo.ClientesActuales AS ca ON f.CustomerID = ca.CustomerID
        INNER JOIN dbo.DetalleFacturas  AS df ON f.InvoiceID = df.InvoiceID
        WHERE @Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio
        GROUP BY YEAR(f.InvoiceDate), f.CustomerID, ca.CustomerName
    ),
    RankingClientes AS
    (
        SELECT Anio, Nombre_Cliente, Cantidad_Facturas, Monto_Total_Facturado,
               DENSE_RANK() OVER (PARTITION BY Anio ORDER BY Cantidad_Facturas DESC) AS Posicion
        FROM PorCliente
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY Anio, Posicion, Nombre_Cliente) AS Fila,
        Anio, Nombre_Cliente, Cantidad_Facturas, Posicion, Monto_Total_Facturado
    INTO #R
    FROM RankingClientes
    WHERE Posicion <= 5;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Anio, Nombre_Cliente, Cantidad_Facturas, Posicion, Monto_Total_Facturado
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Top_ProveedoresOrdenes
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @Anio INT = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH TotOrdenesProveedor AS
    (
        SELECT
            YEAR(oc.OrderDate) AS Anio,
            oc.SupplierID,
            pa.SupplierName AS Nombre_Proveedor,
            COUNT(DISTINCT oc.PurchaseOrderID) AS Cantidad_Ordenes,
            SUM(doc.ReceivedOuters * doc.ExpectedUnitPricePerOuter) AS Monto
        FROM dbo.ProveedoresActuales AS pa
        INNER JOIN dbo.OrdenesCompra      AS oc  ON pa.SupplierID = oc.SupplierID
        INNER JOIN dbo.DetalleOrdenCompra AS doc ON oc.PurchaseOrderID = doc.PurchaseOrderID
        WHERE @Anio IS NULL OR YEAR(oc.OrderDate) = @Anio
        GROUP BY YEAR(oc.OrderDate), oc.SupplierID, pa.SupplierName
    ),
    RankingProveedores AS
    (
        SELECT Anio, Nombre_Proveedor, Cantidad_Ordenes, Monto,
               DENSE_RANK() OVER (PARTITION BY Anio ORDER BY Cantidad_Ordenes DESC) AS Posicion
        FROM TotOrdenesProveedor
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY Anio, Posicion, Nombre_Proveedor) AS Fila,
        Anio, Nombre_Proveedor, Cantidad_Ordenes, Posicion, Monto
    INTO #R
    FROM RankingProveedores
    WHERE Posicion <= 5;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Anio, Nombre_Proveedor, Cantidad_Ordenes, Posicion, Monto
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Resumen_VentasCategorias
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    DECLARE @Columnas NVARCHAR(MAX);
    DECLARE @SQL NVARCHAR(MAX);

    SELECT @Columnas = STRING_AGG(QUOTENAME(Anio), ',') WITHIN GROUP (ORDER BY Anio)
    FROM (SELECT DISTINCT YEAR(InvoiceDate) AS Anio FROM dbo.Facturas) AS Anios;

    SET @SQL = N'
    WITH VentasPorCategoria AS
    (
        SELECT
            YEAR(f.InvoiceDate) AS Anio,
            g.StockGroupName AS Categoria,
            SUM(df.ExtendedPrice) AS Monto
        FROM dbo.ProductosActuales AS pa
        INNER JOIN dbo.ItemGrupos       AS ig ON pa.StockItemID = ig.StockItemID
        INNER JOIN dbo.GruposInventario AS g  ON ig.StockGroupID = g.StockGroupID
        INNER JOIN dbo.DetalleFacturas  AS df ON pa.StockItemID = df.StockItemID
        INNER JOIN dbo.Facturas         AS f  ON df.InvoiceID = f.InvoiceID
        GROUP BY YEAR(f.InvoiceDate), g.StockGroupName
    )
    SELECT ROW_NUMBER() OVER (ORDER BY Categoria) AS Fila, Categoria, ' + @Columnas + N'
    INTO #R
    FROM VentasPorCategoria
    PIVOT (SUM(Monto) FOR Anio IN (' + @Columnas + N')) AS Matriz;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT = CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    SELECT Categoria, ' + @Columnas + N'
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;';

    EXEC sp_executesql @SQL,
         N'@Pagina INT, @TamanoPagina INT',
         @Pagina = @Pagina, @TamanoPagina = @TamanoPagina;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Seguimiento_Compras_Clientes
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @Anio              INT          = NULL,
    @Mes               INT          = NULL,
    @CategoriaProducto NVARCHAR(50) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    SELECT
        ROW_NUMBER() OVER (ORDER BY ca.CustomerName, YEAR(f.InvoiceDate), MONTH(f.InvoiceDate)) AS Fila,
        ca.CustomerName AS Cliente,
        YEAR(f.InvoiceDate) AS Anio,
        CASE MONTH(f.InvoiceDate)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END AS Mes,
        SUM(df.ExtendedPrice) AS Monto_Total,
        MIN(f.InvoiceDate)    AS Primera_Factura,
        MAX(f.InvoiceDate)    AS Ultima_Factura,
        SUM(df.Quantity)      AS Cantidad_Total,
        MIN(df.Quantity)      AS Cantidad_Minima,
        MAX(df.Quantity)      AS Cantidad_Maxima
    INTO #R
    FROM dbo.ClientesActuales AS ca
    INNER JOIN dbo.Facturas         AS f  ON ca.CustomerID = f.CustomerID
    INNER JOIN dbo.DetalleFacturas  AS df ON f.InvoiceID = df.InvoiceID
    INNER JOIN dbo.ItemGrupos       AS ig ON df.StockItemID = ig.StockItemID
    INNER JOIN dbo.GruposInventario AS g  ON ig.StockGroupID = g.StockGroupID
    WHERE (@Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio)
      AND (@Mes IS NULL OR MONTH(f.InvoiceDate) = @Mes)
      AND (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
    GROUP BY ca.CustomerID, ca.CustomerName, YEAR(f.InvoiceDate), MONTH(f.InvoiceDate);

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Cliente, Anio, Mes, Monto_Total, Primera_Factura, Ultima_Factura, Cantidad_Total, Cantidad_Minima, Cantidad_Maxima
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Seguimiento_Compras_Proveedores
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @Anio              INT          = NULL,
    @Mes               INT          = NULL,
    @CategoriaProducto NVARCHAR(50) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    SELECT
        ROW_NUMBER() OVER (ORDER BY pa.SupplierName, YEAR(oc.OrderDate), MONTH(oc.OrderDate)) AS Fila,
        pa.SupplierName AS Proveedor,
        YEAR(oc.OrderDate) AS Anio,
        CASE MONTH(oc.OrderDate)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END AS Mes,
        SUM(doc.OrderedOuters * doc.ExpectedUnitPricePerOuter) AS Monto_Total,
        MIN(oc.OrderDate)      AS Primera_Orden,
        MAX(oc.OrderDate)      AS Ultima_Orden,
        SUM(doc.OrderedOuters) AS Cantidad_Total,
        MIN(doc.OrderedOuters) AS Cantidad_Minima,
        MAX(doc.OrderedOuters) AS Cantidad_Maxima
    INTO #R
    FROM dbo.ProveedoresActuales AS pa
    INNER JOIN dbo.OrdenesCompra      AS oc  ON pa.SupplierID = oc.SupplierID
    INNER JOIN dbo.DetalleOrdenCompra AS doc ON oc.PurchaseOrderID = doc.PurchaseOrderID
    INNER JOIN dbo.ItemGrupos         AS ig  ON doc.StockItemID = ig.StockItemID
    INNER JOIN dbo.GruposInventario   AS g   ON ig.StockGroupID = g.StockGroupID
    WHERE (@Anio IS NULL OR YEAR(oc.OrderDate) = @Anio)
      AND (@Mes IS NULL OR MONTH(oc.OrderDate) = @Mes)
      AND (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
    GROUP BY pa.SupplierID, pa.SupplierName, YEAR(oc.OrderDate), MONTH(oc.OrderDate);

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Proveedor, Anio, Mes, Monto_Total, Primera_Orden, Ultima_Orden, Cantidad_Total, Cantidad_Minima, Cantidad_Maxima
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Rotacion_Inventario
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @CategoriaProducto NVARCHAR(50)  = NULL,
    @Anio              INT           = NULL,
    @Proveedor         NVARCHAR(100) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    DECLARE @FechaInicio DATETIME2;
    DECLARE @FechaFin    DATETIME2;
    DECLARE @DiasPeriodo INT;

    IF @Anio IS NOT NULL
    BEGIN
        SET @FechaInicio = DATEFROMPARTS(@Anio, 1, 1);
        SET @FechaFin    = DATEFROMPARTS(@Anio + 1, 1, 1);
    END
    ELSE
    BEGIN
        SELECT @FechaInicio = MIN(TransactionOccurredWhen),
               @FechaFin    = DATEADD(DAY, 1, MAX(TransactionOccurredWhen))
        FROM dbo.ProductosTransacciones;
    END;

    SET @DiasPeriodo = DATEDIFF(DAY, @FechaInicio, @FechaFin);

    ;WITH Consumo AS
    (
        SELECT pt.StockItemID, SUM(ABS(pt.Quantity)) AS Cantidad_Consumida
        FROM dbo.ProductosTransacciones AS pt
        WHERE pt.Quantity < 0
          AND pt.TransactionOccurredWhen >= @FechaInicio
          AND pt.TransactionOccurredWhen <  @FechaFin
        GROUP BY pt.StockItemID
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY pa.StockItemName, g.StockGroupName) AS Fila,
        pa.StockItemName AS Nombre_Producto,
        g.StockGroupName AS Categoria_Producto,
        p.SupplierName   AS Proveedor,
        pi.QuantityOnHand AS Stock_Actual,
        c.Cantidad_Consumida,
        CASE WHEN c.Cantidad_Consumida > 0
             THEN ROUND(CAST(pi.QuantityOnHand AS DECIMAL(18,4)) * @DiasPeriodo / c.Cantidad_Consumida, 2)
        END AS Dias_Rotacion
    INTO #R
    FROM dbo.ProductosActuales AS pa
    INNER JOIN dbo.ProductosInventario AS pi ON pa.StockItemID = pi.StockItemID
    INNER JOIN dbo.ItemGrupos          AS ig ON pa.StockItemID = ig.StockItemID
    INNER JOIN dbo.GruposInventario    AS g  ON ig.StockGroupID = g.StockGroupID
    INNER JOIN dbo.ProveedoresActuales AS p  ON pa.SupplierID = p.SupplierID
    INNER JOIN Consumo                 AS c  ON pa.StockItemID = c.StockItemID
    WHERE (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
      AND (@Proveedor IS NULL OR p.SupplierName LIKE '%' + @Proveedor + '%');

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Nombre_Producto, Categoria_Producto, Proveedor, Stock_Actual, Cantidad_Consumida, Dias_Rotacion
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Metodo_Envio_Favorito
    @Sucursal TINYINT = NULL,     -- NULL = consolidado, 1 = San José, 2 = Limón
    @Anio              INT           = NULL,
    @Mes               INT           = NULL,
    @CategoriaCliente  NVARCHAR(50)  = NULL,
    @CategoriaProducto NVARCHAR(50)  = NULL,
    @Producto          NVARCHAR(100) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH VentasFiltradas AS
    (
        SELECT DISTINCT
            f.InvoiceID,
            YEAR(f.InvoiceDate)    AS Anio,
            MONTH(f.InvoiceDate)   AS Mes,
            c.CityID               AS ID_Ciudad,
            c.CityName             AS Ciudad,
            f.DeliveryMethodID     AS ID_MetodoEnvio,
            fe.DeliveryMethodName  AS Metodo_Envio,
            tc.CustomerCategoryName AS Categoria_Cliente,
            g.StockGroupName       AS Categoria_Producto,
            pa.StockItemName       AS Producto
        FROM dbo.Facturas AS f
        INNER JOIN dbo.ClientesActuales  AS ca ON f.CustomerID = ca.CustomerID
        INNER JOIN dbo.TiposCliente      AS tc ON ca.CustomerCategoryID = tc.CustomerCategoryID
        INNER JOIN dbo.FormasEntrega     AS fe ON f.DeliveryMethodID = fe.DeliveryMethodID
        INNER JOIN dbo.Ciudades          AS c  ON ca.DeliveryCityID = c.CityID
        INNER JOIN dbo.DetalleFacturas   AS df ON f.InvoiceID = df.InvoiceID
        INNER JOIN dbo.ProductosActuales AS pa ON df.StockItemID = pa.StockItemID
        INNER JOIN dbo.ItemGrupos        AS ig ON pa.StockItemID = ig.StockItemID
        INNER JOIN dbo.GruposInventario  AS g  ON ig.StockGroupID = g.StockGroupID
        WHERE (@Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio)
          AND (@Mes IS NULL OR MONTH(f.InvoiceDate) = @Mes)
          AND (@CategoriaCliente IS NULL OR tc.CustomerCategoryName LIKE '%' + @CategoriaCliente + '%')
          AND (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
          AND (@Producto IS NULL OR pa.StockItemName LIKE '%' + @Producto + '%')
    ),
    VentasPorMetodo AS
    (
        SELECT Anio, Mes, ID_Ciudad, Ciudad, ID_MetodoEnvio, Metodo_Envio,
               COUNT(DISTINCT InvoiceID) AS Cantidad_Ventas
        FROM VentasFiltradas
        GROUP BY Anio, Mes, ID_Ciudad, Ciudad, ID_MetodoEnvio, Metodo_Envio
    ),
    RankingMetodos AS
    (
        SELECT *, DENSE_RANK() OVER (PARTITION BY ID_Ciudad, Anio, Mes
                                     ORDER BY Cantidad_Ventas DESC) AS Posicion
        FROM VentasPorMetodo
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY r.Cantidad_Ventas DESC, r.Ciudad, r.Anio, r.Mes,
                                    vf.Categoria_Producto, vf.Producto) AS Fila,
        r.Anio,
        CASE r.Mes
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END AS Mes,
        r.Ciudad,
        r.Metodo_Envio,
        r.Cantidad_Ventas,
        vf.Categoria_Cliente,
        vf.Categoria_Producto,
        vf.Producto
    INTO #R
    FROM RankingMetodos AS r
    INNER JOIN
    (
        SELECT DISTINCT Anio, Mes, ID_Ciudad, ID_MetodoEnvio,
               Categoria_Cliente, Categoria_Producto, Producto
        FROM VentasFiltradas
    ) AS vf
        ON  r.Anio = vf.Anio AND r.Mes = vf.Mes
        AND r.ID_Ciudad = vf.ID_Ciudad AND r.ID_MetodoEnvio = vf.ID_MetodoEnvio
    WHERE r.Posicion = 1;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Anio, Mes, Ciudad, Metodo_Envio, Cantidad_Ventas, Categoria_Cliente, Categoria_Producto, Producto
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Reportes_Opciones
    @Sucursal TINYINT = NULL      -- NULL = consolidado, 1 = San José, 2 = Limón
AS
BEGIN
    SET NOCOUNT ON;

    /* Filtro por sucursal: lo leen las vistas Estadisticas.v* que están detrás de los sinónimos. */
    EXEC sys.sp_set_session_context @key = N'Sucursal', @value = @Sucursal;

    SELECT DISTINCT YEAR(InvoiceDate) AS Anio FROM dbo.Facturas ORDER BY Anio;
    SELECT DISTINCT YEAR(OrderDate)   AS Anio FROM dbo.OrdenesCompra ORDER BY Anio;

    SELECT ID, Nombre FROM (VALUES
        (1, N'Enero'), (2, N'Febrero'), (3, N'Marzo'), (4, N'Abril'),
        (5, N'Mayo'), (6, N'Junio'), (7, N'Julio'), (8, N'Agosto'),
        (9, N'Septiembre'), (10, N'Octubre'), (11, N'Noviembre'), (12, N'Diciembre')
    ) AS Meses(ID, Nombre)
    ORDER BY ID;

    SELECT StockGroupID AS ID, StockGroupName AS Nombre FROM dbo.GruposInventario ORDER BY StockGroupName;
    SELECT CustomerCategoryID AS ID, CustomerCategoryName AS Nombre FROM dbo.TiposCliente ORDER BY CustomerCategoryName;
    SELECT SupplierID AS ID, SupplierName AS Nombre FROM dbo.ProveedoresActuales ORDER BY SupplierName;
    SELECT SupplierCategoryID AS ID, SupplierCategoryName AS Nombre FROM dbo.CategoriaProveedores ORDER BY SupplierCategoryName;
END
GO

/*---------------------------------------------------------------------------------------*
* Paso 8: permisos para el rol Corporativo
*-----------------------------------------------------------------------------------------*/

DECLARE @Proc SYSNAME, @sql NVARCHAR(400);
DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT name FROM sys.procedures
    WHERE SCHEMA_NAME(schema_id) = N'dbo'
      AND name IN (N'SP_Reporte_ComprasProveedores', N'SP_Reporte_VentasToClientes', N'SP_Top_GananciaProductos',
                   N'SP_Top_ClientesFacturas', N'SP_Top_ProveedoresOrdenes', N'SP_Resumen_VentasCategorias',
                   N'SP_Seguimiento_Compras_Clientes', N'SP_Seguimiento_Compras_Proveedores',
                   N'SP_Rotacion_Inventario', N'SP_Metodo_Envio_Favorito', N'SP_Reportes_Opciones');
OPEN cur;
FETCH NEXT FROM cur INTO @Proc;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'GRANT EXECUTE ON dbo.' + QUOTENAME(@Proc) + N' TO rol_corporativo;';
    EXEC sp_executesql @sql;
    FETCH NEXT FROM cur INTO @Proc;
END
CLOSE cur;
DEALLOCATE cur;
GO

/* (El esquema Estadisticas ya tiene EXECUTE para rol_corporativo: 10_Corporativo_SeguridadApp.sql) */

/*---------------------------------------------------------------------------------------*
* Paso 9: job de SQL Server Agent, cada 5 minutos
*-----------------------------------------------------------------------------------------*/

USE msdb;
GO

IF EXISTS (SELECT 1 FROM msdb.dbo.sysjobs WHERE name = N'WWI - Sincronizar estadisticas')
    EXEC msdb.dbo.sp_delete_job @job_name = N'WWI - Sincronizar estadisticas';

EXEC msdb.dbo.sp_add_job
     @job_name         = N'WWI - Sincronizar estadisticas',
     @description      = N'Consolida en el Corporativo las facturas y existencias de San José y Limón.',
     @owner_login_name = N'sa';

EXEC msdb.dbo.sp_add_jobstep
     @job_name      = N'WWI - Sincronizar estadisticas',
     @step_name     = N'Sincronizar',
     @subsystem     = N'TSQL',
     @database_name = N'WideWorldImporters',
     @command       = N'SET QUOTED_IDENTIFIER ON; SET ARITHABORT ON; EXEC Estadisticas.SP_Sincronizar;';

EXEC msdb.dbo.sp_add_jobschedule
     @job_name             = N'WWI - Sincronizar estadisticas',
     @name                 = N'Cada 5 minutos',
     @freq_type            = 4,
     @freq_interval        = 1,
     @freq_subday_type     = 4,
     @freq_subday_interval = 5;

EXEC msdb.dbo.sp_add_jobserver
     @job_name    = N'WWI - Sincronizar estadisticas',
     @server_name = N'(local)';
GO

/*---------------------------------------------------------------------------------------*
* Paso 10: primera sincronización y verificación
*-----------------------------------------------------------------------------------------*/

USE WideWorldImporters;
GO

EXEC Estadisticas.SP_Sincronizar;

/* Resumen consolidado y por sucursal (vistas materializadas). */
EXEC Estadisticas.SP_Resumen_Sucursales;

/* Un reporte del proyecto, consolidado y luego solo Limón: los montos deben cambiar. */
EXEC dbo.SP_Top_ClientesFacturas @Pagina = 1, @TamanoPagina = 5;
EXEC dbo.SP_Top_ClientesFacturas @Sucursal = 2, @Pagina = 1, @TamanoPagina = 5;
GO

SET NOEXEC OFF;
GO
