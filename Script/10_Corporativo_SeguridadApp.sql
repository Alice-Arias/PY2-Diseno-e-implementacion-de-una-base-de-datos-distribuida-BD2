/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 10_Corporativo_SeguridadApp.sql
*
* DESCRIPCION:
* Relaciona los usuarios de la aplicación con usuarios de base de datos en el
* Corporativo. La API nunca usa "sa": según quién inició sesión, se conecta con
* uno de estos logins, y cada uno solo puede EJECUTAR sus procedimientos
* (no tiene permiso para leer ni modificar tablas directamente).
*
*   Login (servidor)   Rol de base de datos   Puede ejecutar
*   ----------------   --------------------   -------------------------------------------
*   app_login          rol_login              Seguridad.SP_Usuario_Login (solo el login)
*   app_corporativo    rol_corporativo        Procedimientos del esquema Estadisticas
*   app_admin          rol_admin_catalogo     Procedimientos del esquema Catalogo
*                                              (crear, modificar y eliminar productos)
*
* Los permisos se dan a ROLES y no directamente a los logins: si mañana se agrega
* otro login de administrador, basta con meterlo en el rol.
*
* Los esquemas Estadisticas y Catalogo se crean vacíos; sus procedimientos se agregan
* en los siguientes scripts y heredan el permiso automáticamente.
*
* RESTRICCIONES: Ejecutar SOLO en el Corporativo, después de 09_Corporativo_Usuarios.sql.
* Se puede ejecutar más de una vez.
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

/*---------------------------------------------------------------------------------------*
* Paso 1: logins del servidor
*-----------------------------------------------------------------------------------------*/

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'app_login')
    CREATE LOGIN app_login WITH PASSWORD = N'AppLogin#2026', DEFAULT_DATABASE = WideWorldImporters, CHECK_POLICY = OFF;

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'app_corporativo')
    CREATE LOGIN app_corporativo WITH PASSWORD = N'AppCorp#2026', DEFAULT_DATABASE = WideWorldImporters, CHECK_POLICY = OFF;

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'app_admin')
    CREATE LOGIN app_admin WITH PASSWORD = N'AppAdmin#2026', DEFAULT_DATABASE = WideWorldImporters, CHECK_POLICY = OFF;
GO

USE WideWorldImporters;
GO

/*---------------------------------------------------------------------------------------*
* Paso 2: esquemas de la aplicación
*-----------------------------------------------------------------------------------------*/

IF SCHEMA_ID(N'Estadisticas') IS NULL EXEC (N'CREATE SCHEMA Estadisticas');
IF SCHEMA_ID(N'Catalogo')     IS NULL EXEC (N'CREATE SCHEMA Catalogo');
GO

/*---------------------------------------------------------------------------------------*
* Paso 3: roles y permisos
*-----------------------------------------------------------------------------------------*/

IF DATABASE_PRINCIPAL_ID(N'rol_login')          IS NULL CREATE ROLE rol_login;
IF DATABASE_PRINCIPAL_ID(N'rol_corporativo')    IS NULL CREATE ROLE rol_corporativo;
IF DATABASE_PRINCIPAL_ID(N'rol_admin_catalogo') IS NULL CREATE ROLE rol_admin_catalogo;
GO

GRANT EXECUTE ON OBJECT::Seguridad.SP_Usuario_Login TO rol_login;
GRANT EXECUTE ON SCHEMA::Estadisticas TO rol_corporativo;
GRANT EXECUTE ON SCHEMA::Catalogo     TO rol_admin_catalogo;
GO

/*---------------------------------------------------------------------------------------*
* Paso 4: usuarios de la base, cada uno en su rol
*-----------------------------------------------------------------------------------------*/

IF USER_ID(N'app_login')       IS NULL CREATE USER app_login       FOR LOGIN app_login;
IF USER_ID(N'app_corporativo') IS NULL CREATE USER app_corporativo FOR LOGIN app_corporativo;
IF USER_ID(N'app_admin')       IS NULL CREATE USER app_admin       FOR LOGIN app_admin;
GO

ALTER ROLE rol_login          ADD MEMBER app_login;
ALTER ROLE rol_corporativo    ADD MEMBER app_corporativo;
ALTER ROLE rol_admin_catalogo ADD MEMBER app_admin;
GO

/*---------------------------------------------------------------------------------------*
* Paso 5: verificación
*-----------------------------------------------------------------------------------------*/

/* Usuario de base de datos y su rol. */
SELECT  u.name AS UsuarioBD,
        r.name AS Rol
FROM    sys.database_role_members m
JOIN    sys.database_principals r ON r.principal_id = m.role_principal_id
JOIN    sys.database_principals u ON u.principal_id = m.member_principal_id
WHERE   r.name IN (N'rol_login', N'rol_corporativo', N'rol_admin_catalogo')
ORDER BY r.name;

/* Prueba de seguridad: app_login puede iniciar sesión, pero NO puede leer la tabla. */
EXECUTE AS LOGIN = N'app_login';

    PRINT N'--- Probando como app_login ---';

    EXEC Seguridad.SP_Usuario_Login @username = N'admin.limon', @password = N'Admin#2026';
    PRINT N'OK: app_login pudo ejecutar el procedimiento de login.';

    BEGIN TRY
        SELECT TOP (1) * FROM Seguridad.Usuarios;
        PRINT N'ERROR: app_login pudo leer la tabla de usuarios (no debería).';
    END TRY
    BEGIN CATCH
        PRINT N'OK: app_login NO puede leer la tabla de usuarios -> ' + ERROR_MESSAGE();
    END CATCH

    BEGIN TRY
        SELECT TOP (1) * FROM Sales.Invoices;
        PRINT N'ERROR: app_login pudo leer facturas (no debería).';
    END TRY
    BEGIN CATCH
        PRINT N'OK: app_login NO puede leer facturas -> ' + ERROR_MESSAGE();
    END CATCH

REVERT;
GO

SET NOEXEC OFF;
GO
