/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 03_Corporativo_LoginEnlace.sql
*
* DESCRIPCION:
* Crea en el Corporativo el login "enlace_sucursal", que usan las sucursales para
* conectarse al Corporativo por medio del linked server CORPORATIVO.
*
* Se usa un login propio en lugar de "sa" para que las sucursales no tengan control
* total del Corporativo: solo pueden leer y escribir datos de WideWorldImporters y
* ejecutar procedimientos almacenados.
*
* RESTRICCIONES: Ejecutar SOLO en el Corporativo.
*
*-----------------------------------------------------------------------------------------*/

USE master;
GO

DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(N'Este script es para el Corporativo, pero el servidor actual es %s. No se hizo ningún cambio.', 16, 1, @Servidor);
    SET NOEXEC ON;
END
GO

/* Login a nivel de servidor. */
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'enlace_sucursal')
    CREATE LOGIN enlace_sucursal
        WITH PASSWORD = N'Enlace#2026Pass',
             DEFAULT_DATABASE = WideWorldImporters,
             CHECK_POLICY = OFF;
GO

USE WideWorldImporters;
GO

/* Usuario dentro de la base y sus permisos. */
IF USER_ID(N'enlace_sucursal') IS NULL
    CREATE USER enlace_sucursal FOR LOGIN enlace_sucursal;
GO

ALTER ROLE db_datareader ADD MEMBER enlace_sucursal;
ALTER ROLE db_datawriter ADD MEMBER enlace_sucursal;
GRANT EXECUTE TO enlace_sucursal;
GO

PRINT N'Login enlace_sucursal listo en el Corporativo.';
GO

/*---------------------------------------------------------------------------------------*
* Vistas de datos sensibles
*
* Las sucursales leen los datos sensibles a través de estas vistas. No exponen las
* columnas de tipo geography (SQL Server no permite leerlas por linked server); la
* ubicación se entrega como latitud y longitud.
*-----------------------------------------------------------------------------------------*/

IF SCHEMA_ID(N'Sensible') IS NULL
    EXEC (N'CREATE SCHEMA Sensible');
GO

CREATE OR ALTER VIEW Sensible.Clientes
AS
SELECT  c.CustomerID,
        c.PrimaryContactPersonID,
        c.AlternateContactPersonID,
        c.PhoneNumber,
        c.FaxNumber,
        c.WebsiteURL,
        c.DeliveryAddressLine1,
        c.DeliveryAddressLine2,
        c.DeliveryPostalCode,
        c.DeliveryLocation.Lat  AS DeliveryLatitude,
        c.DeliveryLocation.Long AS DeliveryLongitude,
        c.PostalAddressLine1,
        c.PostalAddressLine2,
        c.PostalPostalCode
FROM    Sales.Customers AS c;
GO

CREATE OR ALTER VIEW Sensible.Proveedores
AS
SELECT  s.SupplierID,
        s.PrimaryContactPersonID,
        s.AlternateContactPersonID,
        s.PhoneNumber,
        s.FaxNumber,
        s.WebsiteURL,
        s.DeliveryAddressLine1,
        s.DeliveryAddressLine2,
        s.DeliveryPostalCode,
        s.DeliveryLocation.Lat  AS DeliveryLatitude,
        s.DeliveryLocation.Long AS DeliveryLongitude,
        s.PostalAddressLine1,
        s.PostalAddressLine2,
        s.PostalPostalCode,
        s.BankAccountName,
        s.BankAccountBranch,
        s.BankAccountCode,
        s.BankAccountNumber,
        s.BankInternationalCode
FROM    Purchasing.Suppliers AS s;
GO

CREATE OR ALTER VIEW Sensible.Personas
AS
SELECT  p.PersonID,
        p.FullName,
        p.PhoneNumber,
        p.FaxNumber,
        p.EmailAddress
FROM    Application.People AS p;
GO

PRINT N'Vistas Sensible.Clientes, Sensible.Proveedores y Sensible.Personas listas.';
GO

SET NOEXEC OFF;
GO
