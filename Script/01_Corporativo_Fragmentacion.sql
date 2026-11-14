/*---------------------------------------------------------------------------------------*
* NOMBRE: 01_Corporativo_Fragmentacion.sql
* ENTRADA: La base WideWorldImporters recién restaurada.
* DESCRIPCION: Prepara el Corporativo: lo registra como nodo 0, quita la política de
*   ejemplo de WWI y marca cada pedido, factura y orden de compra con su sucursal.
*   Regla: pedido par -> San José (1), impar -> Limón (2). La factura sigue a su pedido.
* SALIDA: Columna SucursalID en las tablas y cuántas filas tiene cada sucursal.
* OBJETIVO: Que el Corporativo guarde todo: datos sensibles y copia de las dos sucursales.
* EJECUTAR: Solo en el Corporativo.
*-----------------------------------------------------------------------------------------*/

USE WideWorldImporters;
GO

SET NOCOUNT ON;
GO

/* Paso 0: verificar que estamos en el Corporativo. */
DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(N'Este script es para el Corporativo, pero el servidor actual es %s. No se hizo ningún cambio.', 16, 1, @Servidor);
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
INSERT INTO dbo.ConfigNodo (Id, SucursalID, NombreNodo) VALUES (1, 0, N'Corporativo');
GO

/* Paso 2: eliminar la política de seguridad de ejemplo de WWI. */
IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = N'FilterCustomersBySalesTerritoryRole')
    DROP SECURITY POLICY Application.FilterCustomersBySalesTerritoryRole;
GO

/* Paso 3: marcar cada fila con la sucursal a la que pertenece. */
IF COL_LENGTH(N'Sales.Orders', N'SucursalID') IS NULL
BEGIN
    EXEC (N'ALTER TABLE Sales.Orders ADD SucursalID TINYINT NULL;');
    EXEC (N'UPDATE Sales.Orders SET SucursalID = CASE WHEN OrderID % 2 = 0 THEN 1 ELSE 2 END;');
    EXEC (N'ALTER TABLE Sales.Orders ALTER COLUMN SucursalID TINYINT NOT NULL;');
    EXEC (N'ALTER TABLE Sales.Orders ADD CONSTRAINT CK_Orders_SucursalID CHECK (SucursalID IN (1, 2));');
    PRINT N'Sales.Orders: SucursalID agregado.';
END
GO

IF COL_LENGTH(N'Sales.Invoices', N'SucursalID') IS NULL
BEGIN
    EXEC (N'ALTER TABLE Sales.Invoices ADD SucursalID TINYINT NULL;');
    EXEC (N'UPDATE Sales.Invoices SET SucursalID = CASE WHEN ISNULL(OrderID, InvoiceID) % 2 = 0 THEN 1 ELSE 2 END;');
    EXEC (N'ALTER TABLE Sales.Invoices ALTER COLUMN SucursalID TINYINT NOT NULL;');
    EXEC (N'ALTER TABLE Sales.Invoices ADD CONSTRAINT CK_Invoices_SucursalID CHECK (SucursalID IN (1, 2));');
    PRINT N'Sales.Invoices: SucursalID agregado.';
END
GO

IF COL_LENGTH(N'Purchasing.PurchaseOrders', N'SucursalID') IS NULL
BEGIN
    EXEC (N'ALTER TABLE Purchasing.PurchaseOrders ADD SucursalID TINYINT NULL;');
    EXEC (N'UPDATE Purchasing.PurchaseOrders SET SucursalID = CASE WHEN PurchaseOrderID % 2 = 0 THEN 1 ELSE 2 END;');
    EXEC (N'ALTER TABLE Purchasing.PurchaseOrders ALTER COLUMN SucursalID TINYINT NOT NULL;');
    EXEC (N'ALTER TABLE Purchasing.PurchaseOrders ADD CONSTRAINT CK_PurchaseOrders_SucursalID CHECK (SucursalID IN (1, 2));');
    PRINT N'Purchasing.PurchaseOrders: SucursalID agregado.';
END
GO

/* Paso 4: verificación. Estos totales deben coincidir con lo que quede en cada sucursal. */
SELECT  SucursalID,
        CASE SucursalID WHEN 1 THEN N'San José' ELSE N'Limón' END AS Sucursal,
        COUNT(*) AS Facturas
FROM    Sales.Invoices
GROUP BY SucursalID
ORDER BY SucursalID;

SELECT  SucursalID,
        CASE SucursalID WHEN 1 THEN N'San José' ELSE N'Limón' END AS Sucursal,
        COUNT(*) AS Pedidos
FROM    Sales.Orders
GROUP BY SucursalID
ORDER BY SucursalID;
GO

SET NOEXEC OFF;
GO
