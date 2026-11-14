/*---------------------------------------------------------------------------------------*
* NOMBRE: 12_Sucursal_Sinonimos.sql
* ENTRADA: Las tablas de la sucursal y el linked server CORPORATIVO.
* DESCRIPCION: Sinónimos del Proyecto 1 hacia las tablas locales y sinónimos nuevos
*   hacia los datos sensibles del Corporativo.
* SALIDA: Los sinónimos creados.
* OBJETIVO: Que los procedimientos no dependan de dónde está cada dato.
* EJECUTAR: En cada sucursal, después del 04 y 11. Se puede repetir.
*-----------------------------------------------------------------------------------------*/

USE WideWorldImporters;
GO

DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) NOT IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(N'Este script es para las sucursales (sanjose o limon), pero el servidor actual es %s. No se hizo ningún cambio.', 16, 1, @Servidor);
    SET NOEXEC ON;
END
GO

DECLARE @Sinonimos TABLE (Nombre SYSNAME, Destino NVARCHAR(400));

INSERT INTO @Sinonimos (Nombre, Destino) VALUES
    /* Proyecto 1: tablas locales de la sucursal */
    (N'ClientesActuales',          N'Sales.Customers'),
    (N'TiposCliente',              N'Sales.CustomerCategories'),
    (N'GruposCompradores',         N'Sales.BuyingGroups'),
    (N'DetallesPedido',            N'Sales.OrderLines'),
    (N'Pedidos',                   N'Sales.Orders'),
    (N'DetallesFactura',           N'Sales.InvoiceLines'),
    (N'Contactos',                 N'Application.People'),
    (N'FormasEntrega',             N'Application.DeliveryMethods'),
    (N'Ciudades',                  N'Application.Cities'),
    (N'ProveedoresActuales',       N'Purchasing.Suppliers'),
    (N'CategoriaProveedores',      N'Purchasing.SupplierCategories'),
    (N'TransaccionesProveedores',  N'Purchasing.SupplierTransactions'),
    (N'OrdenesCompra',             N'Purchasing.PurchaseOrders'),
    (N'DetalleOrdenCompra',        N'Purchasing.PurchaseOrderLines'),
    (N'ProductosActuales',         N'Warehouse.StockItems'),
    (N'ProductosInventario',       N'Warehouse.StockItemHoldings'),
    (N'GruposInventario',          N'Warehouse.StockGroups'),
    (N'ItemGrupos',                N'Warehouse.StockItemStockGroups'),
    (N'ColoresProductos',          N'Warehouse.Colors'),
    (N'EmpaquetamientoInventario', N'Warehouse.PackageTypes'),
    (N'ProductosTransacciones',    N'Warehouse.StockItemTransactions'),
    (N'Facturas',                  N'Sales.Invoices'),
    (N'DetalleFacturas',           N'Sales.InvoiceLines'),

    /* Proyecto 2: datos sensibles en el Corporativo */
    (N'ClientesSensibles',         N'CORPORATIVO.WideWorldImporters.Sensible.Clientes'),
    (N'ProveedoresSensibles',      N'CORPORATIVO.WideWorldImporters.Sensible.Proveedores'),
    (N'ContactosSensibles',        N'CORPORATIVO.WideWorldImporters.Sensible.Personas');

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

/* Sin permiso para el Administrador: los datos sensibles se piden con autorización (17). */
REVOKE SELECT ON dbo.ClientesSensibles    FROM rol_admin_sucursal;
REVOKE SELECT ON dbo.ProveedoresSensibles FROM rol_admin_sucursal;
REVOKE SELECT ON dbo.ContactosSensibles   FROM rol_admin_sucursal;
GO

/* Verificación */
SELECT  name AS Sinonimo,
        base_object_name AS ApuntaA,
        CASE WHEN base_object_name LIKE N'%CORPORATIVO%' THEN N'Corporativo' ELSE N'Local' END AS Ubicacion
FROM    sys.synonyms
ORDER BY Ubicacion, name;
GO

SET NOEXEC OFF;
GO
