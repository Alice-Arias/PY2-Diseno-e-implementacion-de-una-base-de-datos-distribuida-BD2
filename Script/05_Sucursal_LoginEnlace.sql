/*---------------------------------------------------------------------------------------*
* NOMBRE: 05_Sucursal_LoginEnlace.sql
* ENTRADA: Ninguna.
* DESCRIPCION: Crea el login enlace_corporativo, que usa el Corporativo para entrar a la sucursal.
* SALIDA: Login enlace_corporativo con permiso de leer, escribir y ejecutar.
* OBJETIVO: Que el Corporativo entre a las sucursales sin usar "sa".
* EJECUTAR: En cada sucursal.
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

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'enlace_corporativo')
    CREATE LOGIN enlace_corporativo
        WITH PASSWORD = N'Enlace#2026Pass',
             DEFAULT_DATABASE = WideWorldImporters,
             CHECK_POLICY = OFF;
GO

USE WideWorldImporters;
GO

IF USER_ID(N'enlace_corporativo') IS NULL
    CREATE USER enlace_corporativo FOR LOGIN enlace_corporativo;
GO

ALTER ROLE db_datareader ADD MEMBER enlace_corporativo;
ALTER ROLE db_datawriter ADD MEMBER enlace_corporativo;
GRANT EXECUTE TO enlace_corporativo;
GO

PRINT N'Login enlace_corporativo listo en ' + @@SERVERNAME + N'.';
GO

SET NOEXEC OFF;
GO
