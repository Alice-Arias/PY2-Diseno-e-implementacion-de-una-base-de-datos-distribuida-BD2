/*---------------------------------------------------------------------------------------*
* SCRIPT: 01_verificar_nodo.sql
* DÓNDE: ejecutar en SAN JOSÉ (Windows) y en LIMÓN (Docker), uno por uno.
* OBJETIVO: confirmar que el nodo cumple los requisitos para la replicación.
*           Todas las filas deben decir "OK".
*-----------------------------------------------------------------------------------------*/
SET NOCOUNT ON;

DECLARE @nombreReal  SYSNAME = CAST(SERVERPROPERTY('ServerName') AS SYSNAME);
DECLARE @edicion     NVARCHAR(128) = CAST(SERVERPROPERTY('Edition') AS NVARCHAR(128));
DECLARE @agente      INT = (SELECT COUNT(*) FROM sys.dm_exec_sessions
                            WHERE program_name LIKE N'SQLAgent%');
DECLARE @replicacion INT = 0;

BEGIN TRY
    -- Si la replicación está instalada, este SP existe y responde.
    EXEC @replicacion = sp_MS_replication_installed;
    SET @replicacion = 1;
END TRY
BEGIN CATCH
    SET @replicacion = 0;
END CATCH;

SELECT Revision, Requisito, Valor, Estado
FROM (VALUES
    (1, N'@@SERVERNAME', @@SERVERNAME,
        CASE WHEN @@SERVERNAME = @nombreReal THEN N'OK'
             ELSE N'ERROR: ejecute la sección "Arreglar nombre" de abajo' END),
    (2, N'Nombre real (SERVERPROPERTY)', @nombreReal, N'OK'),
    (3, N'Edición', @edicion,
        CASE WHEN @edicion LIKE N'Express%'
             THEN N'ERROR: Express no tiene SQL Agent ni puede publicar. Instale Developer.'
             ELSE N'OK' END),
    (4, N'Versión', CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(128)),
        CASE WHEN CAST(PARSENAME(CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(128)), 4) AS INT) >= 15
             THEN N'OK' ELSE N'AVISO: se recomienda SQL Server 2019 o 2022' END),
    (5, N'SQL Server Agent', CASE WHEN @agente > 0 THEN N'Corriendo' ELSE N'Detenido' END,
        CASE WHEN @agente > 0 THEN N'OK'
             ELSE N'ERROR: inicie SQL Server Agent (Windows: services.msc / Docker: MSSQL_AGENT_ENABLED)' END),
    (6, N'Componentes de replicación', CASE WHEN @replicacion = 1 THEN N'Instalados' ELSE N'No instalados' END,
        CASE WHEN @replicacion = 1 THEN N'OK'
             ELSE N'ERROR: en Windows agregue la característica "Replicación de SQL Server" con el instalador' END),
    (7, N'Autenticación', CASE WHEN SERVERPROPERTY('IsIntegratedSecurityOnly') = 1
                               THEN N'Solo Windows' ELSE N'Mixta' END,
        CASE WHEN SERVERPROPERTY('IsIntegratedSecurityOnly') = 1
             THEN N'ERROR: active el modo mixto (la replicación a Azure usa usuario SQL)'
             ELSE N'OK' END),
    (8, N'WideWorldImporters', CASE WHEN DB_ID(N'WideWorldImporters') IS NULL
                                    THEN N'No existe' ELSE N'Existe' END,
        CASE WHEN DB_ID(N'WideWorldImporters') IS NULL
             THEN N'ERROR: restaure la base (en Limón: 02_restaurar_wwi_limon.sql)' ELSE N'OK' END)
) AS R(Revision, Requisito, Valor, Estado)
ORDER BY Revision;
GO

/*---------------------------------------------------------------------------------------*
* ARREGLAR NOMBRE (solo si la revisión 1 dio ERROR)
* Pasa cuando se le cambió el nombre a la computadora después de instalar SQL Server.
* Ejecutar, y luego REINICIAR el servicio de SQL Server.
*-----------------------------------------------------------------------------------------*
DECLARE @viejo SYSNAME = @@SERVERNAME;
DECLARE @nuevo SYSNAME = CAST(SERVERPROPERTY('ServerName') AS SYSNAME);
EXEC sp_dropserver @viejo;
EXEC sp_addserver  @nuevo, 'local';
*/
