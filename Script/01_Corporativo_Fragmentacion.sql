/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 01_Corporativo_Fragmentacion.sql
*
* DESCRIPCION:
* Prepara el nodo Corporativo (SQL Server en Windows) dentro del diseño distribuido.
*
*   - Registra la identidad del nodo en dbo.ConfigNodo (SucursalID = 0).
*   - Elimina la política de seguridad de ejemplo de WideWorldImporters, que filtraría
*     los clientes al usar usuarios de base de datos que no sean dueños de la base.
*   - Agrega la columna SucursalID a Pedidos, Facturas y Órdenes de compra para
*     identificar a qué fragmento horizontal pertenece cada fila. El Corporativo
*     conserva la copia consolidada de todas las filas para las estadísticas.
*
*   El Corporativo NO pierde columnas: es el único nodo que guarda los datos
*   sensibles de clientes, proveedores y contactos (fragmentación vertical).
*
* REGLA DE FRAGMENTACIÓN HORIZONTAL (igual en todos los nodos):
*   Pedido par   -> San José (SucursalID = 1)
*   Pedido impar -> Limón    (SucursalID = 2)
*   Las facturas siguen a su pedido; si no tienen pedido, se usa el número de factura.
*   Las órdenes de compra se reparten por la paridad de su número.
*
* RESTRICCIONES: Ejecutar SOLO en el Corporativo, sobre la base WideWorldImporters
* recién restaurada. El script se detiene solo si detecta que está en una sucursal.
*
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
