/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 06_Corporativo_LinkedServers.sql
*
* DESCRIPCION:
* Crea en el Corporativo los linked servers hacia las sucursales:
*
*   LS_SANJOSE -> alias de Windows "sanjose" (127.0.0.1, puerto 1434)
*   LS_LIMON   -> alias de Windows "limon"   (127.0.0.1, puerto 1435)
*
* Los alias se crearon en el registro de Windows, así que los linked servers no
* dependen de la IP de WSL, que cambia al reiniciar.
*
* Se llaman LS_SANJOSE y LS_LIMON (y no SANJOSE y LIMON) para no chocar con los
* nombres que usará la replicación, que exige el nombre real de cada servidor.
*
* La conexión entra con el login "enlace_corporativo" (ver 05_Sucursal_LoginEnlace.sql).
*
* RESTRICCIONES: Ejecutar SOLO en el Corporativo, después de 05_Sucursal_LoginEnlace.sql
* en las dos sucursales.
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

/* LS_SANJOSE */
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'LS_SANJOSE')
    EXEC sp_dropserver @server = N'LS_SANJOSE', @droplogins = 'droplogins';
GO

EXEC sp_addlinkedserver
     @server     = N'LS_SANJOSE',
     @srvproduct = N'',
     @provider   = N'MSOLEDBSQL',
     @datasrc    = N'sanjose',
     @provstr    = N'Encrypt=yes;TrustServerCertificate=yes';

EXEC sp_addlinkedsrvlogin
     @rmtsrvname  = N'LS_SANJOSE',
     @useself     = N'FALSE',
     @locallogin  = NULL,
     @rmtuser     = N'enlace_corporativo',
     @rmtpassword = N'Enlace#2026Pass';

/* Mapeo explícito para el login con el que entran las sucursales: la regla general
   (@locallogin = NULL) no se aplica cuando la orden llega desde otra sucursal. */
EXEC sp_addlinkedsrvlogin
     @rmtsrvname  = N'LS_SANJOSE',
     @useself     = N'FALSE',
     @locallogin  = N'enlace_sucursal',
     @rmtuser     = N'enlace_corporativo',
     @rmtpassword = N'Enlace#2026Pass';

EXEC sp_serveroption @server = N'LS_SANJOSE', @optname = N'rpc',     @optvalue = N'true';
EXEC sp_serveroption @server = N'LS_SANJOSE', @optname = N'rpc out', @optvalue = N'true';
GO

/* LS_LIMON */
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'LS_LIMON')
    EXEC sp_dropserver @server = N'LS_LIMON', @droplogins = 'droplogins';
GO

EXEC sp_addlinkedserver
     @server     = N'LS_LIMON',
     @srvproduct = N'',
     @provider   = N'MSOLEDBSQL',
     @datasrc    = N'limon',
     @provstr    = N'Encrypt=yes;TrustServerCertificate=yes';

EXEC sp_addlinkedsrvlogin
     @rmtsrvname  = N'LS_LIMON',
     @useself     = N'FALSE',
     @locallogin  = NULL,
     @rmtuser     = N'enlace_corporativo',
     @rmtpassword = N'Enlace#2026Pass';

/* Mapeo explícito para el login con el que entran las sucursales: la regla general
   (@locallogin = NULL) no se aplica cuando la orden llega desde otra sucursal. */
EXEC sp_addlinkedsrvlogin
     @rmtsrvname  = N'LS_LIMON',
     @useself     = N'FALSE',
     @locallogin  = N'enlace_sucursal',
     @rmtuser     = N'enlace_corporativo',
     @rmtpassword = N'Enlace#2026Pass';

EXEC sp_serveroption @server = N'LS_LIMON', @optname = N'rpc',     @optvalue = N'true';
EXEC sp_serveroption @server = N'LS_LIMON', @optname = N'rpc out', @optvalue = N'true';
GO

/* Prueba: el Corporativo consulta las facturas de cada sucursal y las compara
   con su copia consolidada. Las dos columnas de conteo deben coincidir. */
USE WideWorldImporters;
GO

SELECT  N'San José' AS Sucursal,
        (SELECT COUNT(*) FROM LS_SANJOSE.WideWorldImporters.Sales.Invoices) AS FacturasEnSucursal,
        (SELECT COUNT(*) FROM Sales.Invoices WHERE SucursalID = 1)          AS FacturasEnCorporativo
UNION ALL
SELECT  N'Limón',
        (SELECT COUNT(*) FROM LS_LIMON.WideWorldImporters.Sales.Invoices),
        (SELECT COUNT(*) FROM Sales.Invoices WHERE SucursalID = 2);
GO

SET NOEXEC OFF;
GO
