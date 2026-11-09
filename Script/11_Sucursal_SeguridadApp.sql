/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 11_Sucursal_SeguridadApp.sql
*
* DESCRIPCION:
* Relaciona el usuario Administrador de la aplicación con un usuario de base de
* datos en la sucursal. Cuando un Administrador inicia sesión, la API se conecta a
* SU sucursal con el login "app_admin", que solo puede EJECUTAR los procedimientos
* de la aplicación (los SP_... del Proyecto 1: clientes, proveedores, inventario y
* ventas). No tiene permiso para leer ni modificar tablas directamente.
*
*   Login (servidor)   Rol de base de datos    Puede ejecutar
*   ----------------   ---------------------   ---------------------------------
*   app_admin          rol_admin_sucursal      Procedimientos dbo.SP_...
*
* Los permisos se otorgan con el procedimiento dbo.usp_OtorgarPermisosApp, que da
* EXECUTE sobre cada procedimiento cuyo nombre empiece con "SP_". Hay que volver a
* ejecutarlo cada vez que se agreguen procedimientos nuevos a la sucursal.
* (Los procedimientos internos, como usp_EliminarColumna, NO quedan disponibles.)
*
* El MISMO script sirve para San José y para Limón.
*
* RESTRICCIONES: Ejecutar SOLO en las sucursales. Se puede ejecutar más de una vez.
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

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'app_admin')
    CREATE LOGIN app_admin WITH PASSWORD = N'AppAdmin#2026', DEFAULT_DATABASE = WideWorldImporters, CHECK_POLICY = OFF;
GO

USE WideWorldImporters;
GO

IF DATABASE_PRINCIPAL_ID(N'rol_admin_sucursal') IS NULL CREATE ROLE rol_admin_sucursal;
IF USER_ID(N'app_admin') IS NULL CREATE USER app_admin FOR LOGIN app_admin;
GO

ALTER ROLE rol_admin_sucursal ADD MEMBER app_admin;
GO

/* Da EXECUTE al rol sobre todos los procedimientos de la aplicación (SP_...). */
CREATE OR ALTER PROCEDURE dbo.usp_OtorgarPermisosApp
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Proc NVARCHAR(300), @sql NVARCHAR(500), @Total INT = 0;

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name)
        FROM   sys.procedures
        WHERE  name COLLATE Latin1_General_CS_AS LIKE N'SP[_]%'   -- solo "SP_" en mayúscula
          AND  name NOT LIKE N'sp[_]MS%';                          -- nunca los de la replicación

    OPEN cur;
    FETCH NEXT FROM cur INTO @Proc;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'GRANT EXECUTE ON ' + @Proc + N' TO rol_admin_sucursal;';
        EXEC sp_executesql @sql;
        SET @Total += 1;
        FETCH NEXT FROM cur INTO @Proc;
    END

    CLOSE cur;
    DEALLOCATE cur;

    PRINT N'Permiso EXECUTE otorgado sobre ' + CAST(@Total AS NVARCHAR(10)) + N' procedimientos SP_.';
END
GO

EXEC dbo.usp_OtorgarPermisosApp;
GO

/* Verificación: app_admin no puede leer tablas directamente. */
EXECUTE AS LOGIN = N'app_admin';

    PRINT N'--- Probando como app_admin en ' + @@SERVERNAME + N' ---';

    BEGIN TRY
        SELECT TOP (1) * FROM Sales.Invoices;
        PRINT N'ERROR: app_admin pudo leer facturas directamente (no debería).';
    END TRY
    BEGIN CATCH
        PRINT N'OK: app_admin NO puede leer tablas directamente -> ' + ERROR_MESSAGE();
    END CATCH

REVERT;
GO

SET NOEXEC OFF;
GO
