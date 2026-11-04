/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 04_Sucursal_LinkedServer.sql
*
* DESCRIPCION:
* Crea en la sucursal el linked server CORPORATIVO, que apunta al SQL Server de
* Windows. Dentro de los contenedores, el nombre "corporativo" lo resuelve Docker
* con la IP que calcula levantar.sh, así que este script no depende de ninguna IP.
*
* La conexión entra con el login "enlace_sucursal" (ver 03_Corporativo_LoginEnlace.sql).
*
* El MISMO script sirve para San José y para Limón.
*
* RESTRICCIONES: Ejecutar SOLO en las sucursales, después de haber ejecutado
* 03_Corporativo_LoginEnlace.sql en el Corporativo.
*
*-----------------------------------------------------------------------------------------*/

USE master;
GO

DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) NOT IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(N'Este script es para las sucursales (sanjose o limon), pero el servidor actual es %s. No se hizo ningún cambio.', 16, 1, @Servidor);
    SET NOEXEC ON;
END
GO

/* Si ya existía, se elimina para crearlo limpio. */
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'CORPORATIVO')
    EXEC sp_dropserver @server = N'CORPORATIVO', @droplogins = 'droplogins';
GO

EXEC sp_addlinkedserver
     @server     = N'CORPORATIVO',
     @srvproduct = N'',
     @provider   = N'MSOLEDBSQL',
     @datasrc    = N'corporativo,1433',
     @provstr    = N'Encrypt=yes;TrustServerCertificate=yes';
GO

/* Todas las conexiones locales entran al Corporativo como enlace_sucursal. */
EXEC sp_addlinkedsrvlogin
     @rmtsrvname  = N'CORPORATIVO',
     @useself     = N'FALSE',
     @locallogin  = NULL,
     @rmtuser     = N'enlace_sucursal',
     @rmtpassword = N'Enlace#2026Pass';
GO

/* Permite ejecutar procedimientos almacenados del Corporativo desde la sucursal. */
EXEC sp_serveroption @server = N'CORPORATIVO', @optname = N'rpc',     @optvalue = N'true';
EXEC sp_serveroption @server = N'CORPORATIVO', @optname = N'rpc out', @optvalue = N'true';
GO

/* Prueba: reconstruir el cliente completo uniendo los dos fragmentos verticales.
   El nombre sale de la sucursal y el teléfono y la dirección salen del Corporativo. */
USE WideWorldImporters;
GO

SELECT TOP (5)
       c.CustomerID,
       c.CustomerName,              -- fragmento local (sucursal)
       s.PhoneNumber,               -- fragmento sensible (Corporativo)
       s.DeliveryAddressLine1       -- fragmento sensible (Corporativo)
FROM   Sales.Customers AS c
JOIN   CORPORATIVO.WideWorldImporters.Sensible.Clientes AS s
       ON s.CustomerID = c.CustomerID
ORDER BY c.CustomerID;
GO

SET NOEXEC OFF;
GO
