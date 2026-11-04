/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 08_Corporativo_Replicacion.sql
*
* DESCRIPCION:
* Configura la replicación transaccional del catálogo de productos.
*
*   Publicador y distribuidor: Corporativo (SQL Server en Windows).
*   Suscriptores (push):        sanjose y limon (SQL Server en Linux).
*   Publicación:                CatalogoProductos
*
*   Artículos (tablas replicadas):
*     Warehouse.Colors, Warehouse.PackageTypes, Warehouse.StockGroups,
*     Warehouse.StockItems, Warehouse.StockItemStockGroups
*
* Todo cambio del catálogo (INSERT, UPDATE o DELETE) se hace en el Corporativo, y el
* Distribution Agent lo aplica en las dos sucursales. Al haber un solo punto de
* escritura no hay conflictos de concurrencia entre sucursales.
*
* Las suscripciones usan "replication support only": las sucursales ya tienen
* exactamente los mismos datos del catálogo (las tres bases se restauraron del mismo
* backup), así que no se envía una instantánea inicial; solo se crean los
* procedimientos que aplican los cambios.
*
* RESTRICCIONES:
*   - Ejecutar SOLO en el Corporativo, conectado con Windows Authentication.
*   - Antes: 07_Todos_PrepararCatalogo.sql en los tres nodos.
*   - SQL Server Agent del Corporativo debe estar en ejecución.
*   - Los nodos deben estar levantados (./levantar.sh) para que existan los alias
*     "sanjose" y "limon".
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
* Paso 1: el Corporativo como distribuidor
*-----------------------------------------------------------------------------------------*/

DECLARE @Servidor SYSNAME = @@SERVERNAME;

IF NOT EXISTS (SELECT 1 FROM sys.servers WHERE name = N'repl_distributor')
BEGIN
    EXEC sp_adddistributor @distributor = @Servidor, @password = N'Distrib#2026Pass';
    PRINT N'Distribuidor configurado.';
END

IF DB_ID(N'distribution') IS NULL
BEGIN
    EXEC sp_adddistributiondb @database = N'distribution', @security_mode = 1;
    PRINT N'Base distribution creada.';
END
GO

DECLARE @Servidor SYSNAME = @@SERVERNAME;

BEGIN TRY
    EXEC sp_adddistpublisher @publisher = @Servidor, @distribution_db = N'distribution', @security_mode = 1;
    PRINT N'Corporativo registrado como publicador.';
END TRY
BEGIN CATCH
    PRINT N'El publicador ya estaba registrado: ' + ERROR_MESSAGE();
END CATCH
GO

/*---------------------------------------------------------------------------------------*
* Paso 2: habilitar WideWorldImporters para publicar
*-----------------------------------------------------------------------------------------*/

EXEC sp_replicationdboption
     @dbname  = N'WideWorldImporters',
     @optname = N'publish',
     @value   = N'true';
GO

USE WideWorldImporters;
GO

/* Log Reader Agent: lee el log de transacciones y pasa los cambios al distribuidor. */
IF NOT EXISTS (SELECT 1 FROM distribution.dbo.MSlogreader_agents WHERE publisher_db = N'WideWorldImporters')
BEGIN
    EXEC sp_addlogreader_agent @publisher_security_mode = 1;
    PRINT N'Log Reader Agent creado.';
END
GO

/*---------------------------------------------------------------------------------------*
* Paso 3: publicación y artículos
*-----------------------------------------------------------------------------------------*/

IF NOT EXISTS (SELECT 1 FROM dbo.syspublications WHERE name = N'CatalogoProductos')
BEGIN
    EXEC sp_addpublication
         @publication       = N'CatalogoProductos',
         @description       = N'Catálogo de productos replicado del Corporativo a las sucursales',
         @sync_method       = N'concurrent',
         @repl_freq         = N'continuous',
         @status            = N'active',
         @allow_push        = N'true',
         @allow_pull        = N'false',
         @allow_anonymous   = N'false',
         @immediate_sync    = N'false',
         @independent_agent = N'true';
    PRINT N'Publicación CatalogoProductos creada.';
END
GO

DECLARE @Articulos TABLE (Esquema SYSNAME, Tabla SYSNAME, Orden INT);

INSERT INTO @Articulos VALUES
    (N'Warehouse', N'Colors',               1),
    (N'Warehouse', N'PackageTypes',         2),
    (N'Warehouse', N'StockGroups',          3),
    (N'Warehouse', N'StockItems',           4),
    (N'Warehouse', N'StockItemStockGroups', 5);

DECLARE @Esq SYSNAME, @Tab SYSNAME, @Articulo SYSNAME;

DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT Esquema, Tabla FROM @Articulos ORDER BY Orden;

OPEN cur;
FETCH NEXT FROM cur INTO @Esq, @Tab;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @Articulo = @Esq + N'_' + @Tab;

    IF NOT EXISTS (SELECT 1 FROM dbo.sysarticles WHERE name = @Articulo)
    BEGIN
        EXEC sp_addarticle
             @publication                  = N'CatalogoProductos',
             @article                      = @Articulo,
             @source_owner                 = @Esq,
             @source_object                = @Tab,
             @destination_owner            = @Esq,
             @destination_table            = @Tab,
             @type                         = N'logbased',
             @pre_creation_cmd             = N'none',
             @identityrangemanagementoption = N'manual';
        PRINT N'Artículo agregado: ' + @Esq + N'.' + @Tab;
    END

    FETCH NEXT FROM cur INTO @Esq, @Tab;
END

CLOSE cur;
DEALLOCATE cur;
GO

/*---------------------------------------------------------------------------------------*
* Paso 4: suscripciones push hacia las sucursales
*-----------------------------------------------------------------------------------------*/

DECLARE @Suscriptores TABLE (Servidor SYSNAME, Clave NVARCHAR(128));

INSERT INTO @Suscriptores VALUES
    (N'sanjose', N'SanJose#2026Pass'),
    (N'limon',   N'Limon#2026Pass');

DECLARE @Sub SYSNAME, @Clave NVARCHAR(128);

DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT Servidor, Clave FROM @Suscriptores;
OPEN cur;
FETCH NEXT FROM cur INTO @Sub, @Clave;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.syssubscriptions WHERE srvname = @Sub)
    BEGIN
        EXEC sp_addsubscription
             @publication       = N'CatalogoProductos',
             @subscriber        = @Sub,
             @destination_db    = N'WideWorldImporters',
             @subscription_type = N'Push',
             @sync_type         = N'replication support only',
             @article           = N'all',
             @update_mode       = N'read only';

        EXEC sp_addpushsubscription_agent
             @publication              = N'CatalogoProductos',
             @subscriber               = @Sub,
             @subscriber_db            = N'WideWorldImporters',
             @subscriber_security_mode = 0,
             @subscriber_login         = N'sa',
             @subscriber_password      = @Clave;

        PRINT N'Suscripción creada: ' + @Sub;
    END

    FETCH NEXT FROM cur INTO @Sub, @Clave;
END

CLOSE cur;
DEALLOCATE cur;
GO

/*---------------------------------------------------------------------------------------*
* Verificación
*-----------------------------------------------------------------------------------------*/

SELECT  p.name   AS Publicacion,
        a.name   AS Articulo
FROM    dbo.syspublications p
JOIN    dbo.sysarticles a ON a.pubid = p.pubid
ORDER BY a.name;

SELECT DISTINCT srvname AS Suscriptor, dest_db AS BaseDestino
FROM   dbo.syssubscriptions
WHERE  srvname IN (N'sanjose', N'limon');
GO

SET NOEXEC OFF;
GO
