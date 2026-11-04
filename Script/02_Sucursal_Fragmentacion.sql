/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 02_Sucursal_Fragmentacion.sql
*
* DESCRIPCION:
* Convierte una copia completa de WideWorldImporters en un nodo sucursal.
* El MISMO script sirve para San José y para Limón: detecta solo en qué nodo
* está usando @@SERVERNAME ('sanjose' o 'limon').
*
*   Fragmentación vertical:
*     Quita de la sucursal los datos sensibles y de contacto de clientes,
*     proveedores y personas. Esos datos solo quedan en el Corporativo.
*     También elimina el historial de esas tablas (tablas *_Archive), porque
*     guarda versiones anteriores de los mismos datos sensibles.
*
*   Fragmentación horizontal:
*     Deja en la sucursal solo sus pedidos, facturas, órdenes de compra y
*     transacciones. Regla:
*       Pedido par   -> San José (SucursalID = 1)
*       Pedido impar -> Limón    (SucursalID = 2)
*     Las facturas siguen a su pedido (fragmentación horizontal derivada) y las
*     líneas siguen a su encabezado.
*
*   Inventario:
*     Cada sucursal maneja su propio inventario. Las existencias originales se
*     reparten entre las dos sucursales (mitad y mitad).
*
*   Secuencias:
*     Cada sucursal genera números en un rango distinto (San José desde 10 000 000,
*     Limón desde 20 000 000) para que no se repitan IDs al consolidar en el Corporativo.
*
* RESTRICCIONES: Ejecutar SOLO en una sucursal, sobre la base WideWorldImporters
* recién restaurada. Si se ejecuta en otro servidor, se detiene sin hacer cambios.
*
*-----------------------------------------------------------------------------------------*/

USE WideWorldImporters;
GO

SET NOCOUNT ON;
GO

/* Paso 0: verificar que estamos en una sucursal. */
DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) NOT IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(N'Este script es para las sucursales (sanjose o limon), pero el servidor actual es %s. No se hizo ningún cambio.', 16, 1, @Servidor);
    SET NOEXEC ON;
END
GO

/* Paso 1: identidad del nodo. */
IF OBJECT_ID(N'dbo.ConfigNodo', N'U') IS NULL
    CREATE TABLE dbo.ConfigNodo
    (
        Id          TINYINT      NOT NULL CONSTRAINT PK_ConfigNodo PRIMARY KEY
                                          CONSTRAINT CK_ConfigNodo_Id CHECK (Id = 1),
        SucursalID  TINYINT      NOT NULL,
        NombreNodo  NVARCHAR(50) NOT NULL
    );
GO

DELETE FROM dbo.ConfigNodo;
INSERT INTO dbo.ConfigNodo (Id, SucursalID, NombreNodo)
SELECT 1,
       CASE LOWER(@@SERVERNAME) WHEN N'sanjose' THEN 1 ELSE 2 END,
       CASE LOWER(@@SERVERNAME) WHEN N'sanjose' THEN N'San José' ELSE N'Limón' END;
GO

/* Paso 2: eliminar la política de seguridad de ejemplo de WWI. */
IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = N'FilterCustomersBySalesTerritoryRole')
    DROP SECURITY POLICY Application.FilterCustomersBySalesTerritoryRole;
GO

/*---------------------------------------------------------------------------------------*
* Procedimientos auxiliares
*-----------------------------------------------------------------------------------------*/

/* Apaga el versionado temporal de una tabla y borra su tabla de historial. */
CREATE OR ALTER PROCEDURE dbo.usp_DesactivarVersionado
    @Tabla NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Historial NVARCHAR(300);
    DECLARE @sql NVARCHAR(MAX);

    SELECT @Historial = QUOTENAME(SCHEMA_NAME(h.schema_id)) + N'.' + QUOTENAME(h.name)
    FROM   sys.tables t
    JOIN   sys.tables h ON h.object_id = t.history_table_id
    WHERE  t.object_id = OBJECT_ID(@Tabla)
      AND  t.temporal_type = 2;

    IF @Historial IS NULL
        RETURN;

    SET @sql = N'ALTER TABLE ' + @Tabla + N' SET (SYSTEM_VERSIONING = OFF); '
             + N'DROP TABLE ' + @Historial + N';';

    EXEC sp_executesql @sql;

    PRINT N'Versionado desactivado e historial eliminado: ' + @Tabla;
END
GO

/* Elimina una columna junto con todo lo que depende de ella
   (llaves foráneas, índices, restricciones y estadísticas). */
CREATE OR ALTER PROCEDURE dbo.usp_EliminarColumna
    @Esquema SYSNAME,
    @Tabla   SYSNAME,
    @Columna SYSNAME
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NombreTabla NVARCHAR(300) = QUOTENAME(@Esquema) + N'.' + QUOTENAME(@Tabla);
    DECLARE @obj INT = OBJECT_ID(@NombreTabla);
    DECLARE @col INT = COLUMNPROPERTY(@obj, @Columna, 'ColumnId');
    DECLARE @sql NVARCHAR(MAX) = N'';

    IF @col IS NULL
    BEGIN
        PRINT N'Ya no existe: ' + @NombreTabla + N'.' + @Columna;
        RETURN;
    END

    /* Llaves foráneas que usan la columna. */
    SELECT @sql += N'ALTER TABLE ' + @NombreTabla + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';' + NCHAR(10)
    FROM   sys.foreign_keys fk
    WHERE  fk.parent_object_id = @obj
      AND  EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
                   WHERE fkc.constraint_object_id = fk.object_id
                     AND fkc.parent_column_id = @col);

    /* Restricciones UNIQUE que usan la columna. */
    SELECT @sql += N'ALTER TABLE ' + @NombreTabla + N' DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';' + NCHAR(10)
    FROM   sys.key_constraints kc
    WHERE  kc.parent_object_id = @obj
      AND  kc.type = 'UQ'
      AND  EXISTS (SELECT 1 FROM sys.index_columns ic
                   WHERE ic.object_id = @obj
                     AND ic.index_id = kc.unique_index_id
                     AND ic.column_id = @col);

    /* Índices (que no sean llave primaria ni UNIQUE) que usan la columna. */
    SELECT @sql += N'DROP INDEX ' + QUOTENAME(i.name) + N' ON ' + @NombreTabla + N';' + NCHAR(10)
    FROM   sys.indexes i
    WHERE  i.object_id = @obj
      AND  i.name IS NOT NULL
      AND  i.is_primary_key = 0
      AND  i.is_unique_constraint = 0
      AND  EXISTS (SELECT 1 FROM sys.index_columns ic
                   WHERE ic.object_id = i.object_id
                     AND ic.index_id = i.index_id
                     AND ic.column_id = @col);

    /* Valores por defecto. */
    SELECT @sql += N'ALTER TABLE ' + @NombreTabla + N' DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';' + NCHAR(10)
    FROM   sys.default_constraints dc
    WHERE  dc.parent_object_id = @obj
      AND  dc.parent_column_id = @col;

    /* Restricciones CHECK que mencionan la columna. */
    SELECT @sql += N'ALTER TABLE ' + @NombreTabla + N' DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';' + NCHAR(10)
    FROM   sys.check_constraints cc
    WHERE  cc.parent_object_id = @obj
      AND  (cc.parent_column_id = @col OR CHARINDEX(QUOTENAME(@Columna), cc.definition) > 0);

    /* Estadísticas que no pertenecen a un índice. */
    SELECT @sql += N'DROP STATISTICS ' + @NombreTabla + N'.' + QUOTENAME(s.name) + N';' + NCHAR(10)
    FROM   sys.stats s
    WHERE  s.object_id = @obj
      AND  NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.object_id = s.object_id AND i.index_id = s.stats_id)
      AND  EXISTS (SELECT 1 FROM sys.stats_columns sc
                   WHERE sc.object_id = s.object_id
                     AND sc.stats_id = s.stats_id
                     AND sc.column_id = @col);

    /* Por último, la columna. */
    SET @sql += N'ALTER TABLE ' + @NombreTabla + N' DROP COLUMN ' + QUOTENAME(@Columna) + N';';

    EXEC sp_executesql @sql;

    PRINT N'Columna eliminada: ' + @NombreTabla + N'.' + @Columna;
END
GO

/*---------------------------------------------------------------------------------------*
* Paso 3: fragmentación vertical (datos sensibles fuera de la sucursal)
*-----------------------------------------------------------------------------------------*/

EXEC dbo.usp_DesactivarVersionado N'Sales.Customers';
EXEC dbo.usp_DesactivarVersionado N'Purchasing.Suppliers';
EXEC dbo.usp_DesactivarVersionado N'Application.People';
GO

DECLARE @Columnas TABLE (Esquema SYSNAME, Tabla SYSNAME, Columna SYSNAME);

INSERT INTO @Columnas (Esquema, Tabla, Columna) VALUES
    /* Clientes: contacto, teléfonos, web y direcciones exactas. */
    (N'Sales', N'Customers', N'PrimaryContactPersonID'),
    (N'Sales', N'Customers', N'AlternateContactPersonID'),
    (N'Sales', N'Customers', N'PhoneNumber'),
    (N'Sales', N'Customers', N'FaxNumber'),
    (N'Sales', N'Customers', N'WebsiteURL'),
    (N'Sales', N'Customers', N'DeliveryAddressLine1'),
    (N'Sales', N'Customers', N'DeliveryAddressLine2'),
    (N'Sales', N'Customers', N'DeliveryPostalCode'),
    (N'Sales', N'Customers', N'DeliveryLocation'),
    (N'Sales', N'Customers', N'PostalAddressLine1'),
    (N'Sales', N'Customers', N'PostalAddressLine2'),
    (N'Sales', N'Customers', N'PostalPostalCode'),

    /* Proveedores: contacto, teléfonos, web, direcciones y datos bancarios. */
    (N'Purchasing', N'Suppliers', N'PrimaryContactPersonID'),
    (N'Purchasing', N'Suppliers', N'AlternateContactPersonID'),
    (N'Purchasing', N'Suppliers', N'PhoneNumber'),
    (N'Purchasing', N'Suppliers', N'FaxNumber'),
    (N'Purchasing', N'Suppliers', N'WebsiteURL'),
    (N'Purchasing', N'Suppliers', N'DeliveryAddressLine1'),
    (N'Purchasing', N'Suppliers', N'DeliveryAddressLine2'),
    (N'Purchasing', N'Suppliers', N'DeliveryPostalCode'),
    (N'Purchasing', N'Suppliers', N'DeliveryLocation'),
    (N'Purchasing', N'Suppliers', N'PostalAddressLine1'),
    (N'Purchasing', N'Suppliers', N'PostalAddressLine2'),
    (N'Purchasing', N'Suppliers', N'PostalPostalCode'),
    (N'Purchasing', N'Suppliers', N'BankAccountName'),
    (N'Purchasing', N'Suppliers', N'BankAccountBranch'),
    (N'Purchasing', N'Suppliers', N'BankAccountCode'),
    (N'Purchasing', N'Suppliers', N'BankAccountNumber'),
    (N'Purchasing', N'Suppliers', N'BankInternationalCode'),

    /* Personas: forma de contacto, foto y contraseña. */
    (N'Application', N'People', N'PhoneNumber'),
    (N'Application', N'People', N'FaxNumber'),
    (N'Application', N'People', N'EmailAddress'),
    (N'Application', N'People', N'Photo'),
    (N'Application', N'People', N'HashedPassword');

DECLARE @Esq SYSNAME, @Tab SYSNAME, @Col SYSNAME;

DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT Esquema, Tabla, Columna FROM @Columnas;

OPEN cur;
FETCH NEXT FROM cur INTO @Esq, @Tab, @Col;

WHILE @@FETCH_STATUS = 0
BEGIN
    EXEC dbo.usp_EliminarColumna @Esq, @Tab, @Col;
    FETCH NEXT FROM cur INTO @Esq, @Tab, @Col;
END

CLOSE cur;
DEALLOCATE cur;
GO

/*---------------------------------------------------------------------------------------*
* Paso 4: fragmentación horizontal (solo las filas de esta sucursal)
*-----------------------------------------------------------------------------------------*/

SET XACT_ABORT ON;

DECLARE @Suc TINYINT = (SELECT SucursalID FROM dbo.ConfigNodo);
DECLARE @Par TINYINT = CASE @Suc WHEN 1 THEN 0 ELSE 1 END;   /* 0 = pares, 1 = impares */
DECLARE @SucTexto NVARCHAR(10) = CAST(@Suc AS NVARCHAR(10));

IF COL_LENGTH(N'Sales.Orders', N'SucursalID') IS NOT NULL
BEGIN
    PRINT N'La fragmentación horizontal ya se había aplicado. Se omite este paso.';
END
ELSE
BEGIN
    /* Filas que le pertenecen a la OTRA sucursal.
       Se usan variables de tabla: solo existen mientras corre este bloque,
       así que nunca chocan con ejecuciones anteriores. */
    DECLARE @PedidosBorrar  TABLE (OrderID INT PRIMARY KEY);
    DECLARE @FacturasBorrar TABLE (InvoiceID INT PRIMARY KEY);
    DECLARE @ComprasBorrar  TABLE (PurchaseOrderID INT PRIMARY KEY);

    INSERT INTO @PedidosBorrar  SELECT OrderID FROM Sales.Orders WHERE OrderID % 2 <> @Par;
    INSERT INTO @FacturasBorrar SELECT InvoiceID FROM Sales.Invoices WHERE ISNULL(OrderID, InvoiceID) % 2 <> @Par;
    INSERT INTO @ComprasBorrar  SELECT PurchaseOrderID FROM Purchasing.PurchaseOrders WHERE PurchaseOrderID % 2 <> @Par;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* Movimientos de inventario de facturas u órdenes de la otra sucursal. */
        DELETE FROM Warehouse.StockItemTransactions
        WHERE  InvoiceID IN (SELECT InvoiceID FROM @FacturasBorrar)
           OR  PurchaseOrderID IN (SELECT PurchaseOrderID FROM @ComprasBorrar)
           OR  (InvoiceID IS NULL AND PurchaseOrderID IS NULL AND StockItemTransactionID % 2 <> @Par);

        /* Transacciones de clientes. */
        DELETE FROM Sales.CustomerTransactions
        WHERE  InvoiceID IN (SELECT InvoiceID FROM @FacturasBorrar)
           OR  (InvoiceID IS NULL AND CustomerTransactionID % 2 <> @Par);

        /* Facturas y sus líneas. */
        DELETE FROM Sales.InvoiceLines WHERE InvoiceID IN (SELECT InvoiceID FROM @FacturasBorrar);
        DELETE FROM Sales.Invoices     WHERE InvoiceID IN (SELECT InvoiceID FROM @FacturasBorrar);

        /* Un pedido que se queda no puede apuntar a un pedido pendiente que se va. */
        UPDATE Sales.Orders
        SET    BackorderOrderID = NULL
        WHERE  BackorderOrderID IN (SELECT OrderID FROM @PedidosBorrar)
          AND  OrderID NOT IN (SELECT OrderID FROM @PedidosBorrar);

        /* Pedidos y sus líneas. */
        DELETE FROM Sales.OrderLines WHERE OrderID IN (SELECT OrderID FROM @PedidosBorrar);
        DELETE FROM Sales.Orders     WHERE OrderID IN (SELECT OrderID FROM @PedidosBorrar);

        /* Transacciones de proveedores. */
        DELETE FROM Purchasing.SupplierTransactions
        WHERE  PurchaseOrderID IN (SELECT PurchaseOrderID FROM @ComprasBorrar)
           OR  (PurchaseOrderID IS NULL AND SupplierTransactionID % 2 <> @Par);

        /* Órdenes de compra y sus líneas. */
        DELETE FROM Purchasing.PurchaseOrderLines WHERE PurchaseOrderID IN (SELECT PurchaseOrderID FROM @ComprasBorrar);
        DELETE FROM Purchasing.PurchaseOrders     WHERE PurchaseOrderID IN (SELECT PurchaseOrderID FROM @ComprasBorrar);

        /* Inventario propio: las existencias originales se reparten entre las dos sucursales. */
        UPDATE Warehouse.StockItemHoldings
        SET    QuantityOnHand = CASE @Suc
                                    WHEN 1 THEN CEILING(QuantityOnHand / 2.0)
                                    ELSE FLOOR(QuantityOnHand / 2.0)
                                END;

        /* Columna SucursalID: deja explícito el predicado de cada fragmento. */
        EXEC (N'ALTER TABLE Sales.Orders ADD SucursalID TINYINT NOT NULL
                   CONSTRAINT DF_Orders_SucursalID DEFAULT (' + @SucTexto + N')
                   CONSTRAINT CK_Orders_SucursalID CHECK (SucursalID = ' + @SucTexto + N');');

        EXEC (N'ALTER TABLE Sales.Invoices ADD SucursalID TINYINT NOT NULL
                   CONSTRAINT DF_Invoices_SucursalID DEFAULT (' + @SucTexto + N')
                   CONSTRAINT CK_Invoices_SucursalID CHECK (SucursalID = ' + @SucTexto + N');');

        EXEC (N'ALTER TABLE Purchasing.PurchaseOrders ADD SucursalID TINYINT NOT NULL
                   CONSTRAINT DF_PurchaseOrders_SucursalID DEFAULT (' + @SucTexto + N')
                   CONSTRAINT CK_PurchaseOrders_SucursalID CHECK (SucursalID = ' + @SucTexto + N');');

        EXEC (N'ALTER TABLE Warehouse.StockItemHoldings ADD SucursalID TINYINT NOT NULL
                   CONSTRAINT DF_StockItemHoldings_SucursalID DEFAULT (' + @SucTexto + N')
                   CONSTRAINT CK_StockItemHoldings_SucursalID CHECK (SucursalID = ' + @SucTexto + N');');

        COMMIT TRANSACTION;

        PRINT N'Fragmentación horizontal aplicada.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/*---------------------------------------------------------------------------------------*
* Paso 5: secuencias en rangos distintos por sucursal
*-----------------------------------------------------------------------------------------*/

DECLARE @Base BIGINT = (SELECT SucursalID FROM dbo.ConfigNodo) * CAST(10000000 AS BIGINT);
DECLARE @Secuencia SYSNAME;
DECLARE @sql NVARCHAR(400);

DECLARE curSeq CURSOR LOCAL FAST_FORWARD FOR
    SELECT s.name
    FROM   sys.sequences s
    WHERE  SCHEMA_NAME(s.schema_id) = N'Sequences'
      AND  s.name IN (N'OrderID', N'OrderLineID', N'InvoiceID', N'InvoiceLineID',
                      N'PurchaseOrderID', N'PurchaseOrderLineID', N'TransactionID',
                      N'CustomerTransactionID', N'SupplierTransactionID', N'StockItemTransactionID')
      AND  CAST(s.current_value AS BIGINT) < @Base;

OPEN curSeq;
FETCH NEXT FROM curSeq INTO @Secuencia;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'ALTER SEQUENCE Sequences.' + QUOTENAME(@Secuencia)
             + N' RESTART WITH ' + CAST(@Base AS NVARCHAR(20)) + N';';
    EXEC sp_executesql @sql;
    PRINT N'Secuencia reiniciada: Sequences.' + @Secuencia;
    FETCH NEXT FROM curSeq INTO @Secuencia;
END

CLOSE curSeq;
DEALLOCATE curSeq;
GO

/*---------------------------------------------------------------------------------------*
* Paso 6: verificación
*-----------------------------------------------------------------------------------------*/

SELECT  n.NombreNodo,
        (SELECT COUNT(*) FROM Sales.Orders)               AS Pedidos,
        (SELECT COUNT(*) FROM Sales.Invoices)             AS Facturas,
        (SELECT COUNT(*) FROM Sales.InvoiceLines)         AS LineasFactura,
        (SELECT COUNT(*) FROM Purchasing.PurchaseOrders)  AS OrdenesCompra,
        COL_LENGTH(N'Sales.Customers', N'PhoneNumber')    AS TelefonoCliente_DebeSerNULL,
        COL_LENGTH(N'Purchasing.Suppliers', N'BankAccountNumber') AS CuentaProveedor_DebeSerNULL
FROM    dbo.ConfigNodo n;
GO

SET NOEXEC OFF;
GO
