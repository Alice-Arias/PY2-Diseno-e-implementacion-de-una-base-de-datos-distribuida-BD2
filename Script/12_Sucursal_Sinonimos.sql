/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 12_Sucursal_Sinonimos.sql
*
* DESCRIPCION:
* Crea en la sucursal los sinónimos que usan los procedimientos almacenados.
*
*   1. Los mismos sinónimos del Proyecto 1 (ClientesActuales, Facturas, ...).
*      Apuntan a las tablas LOCALES de la sucursal, que ya están fragmentadas.
*
*   2. Sinónimos nuevos hacia los datos sensibles, que viven SOLO en el
*      Corporativo y se leen por el linked server CORPORATIVO:
*
*        dbo.ClientesSensibles    -> CORPORATIVO...Sensible.Clientes
*        dbo.ProveedoresSensibles -> CORPORATIVO...Sensible.Proveedores
*        dbo.ContactosSensibles   -> CORPORATIVO...Sensible.Personas
*
* Gracias a los sinónimos, los procedimientos no necesitan saber en qué servidor
* está cada dato (transparencia de ubicación).
*
* El MISMO script sirve para San José y para Limón.
*
* RESTRICCIONES: Ejecutar SOLO en las sucursales, después de 04_Sucursal_LinkedServer.sql
* y 11_Sucursal_SeguridadApp.sql. Se puede ejecutar más de una vez.
*
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

/* El rol Administrador NO tiene permiso sobre estos tres sinónimos: los datos
   sensibles solo se entregan desde el Corporativo, con autorización
   (17_Corporativo_SolicitudesAcceso.sql). */
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
