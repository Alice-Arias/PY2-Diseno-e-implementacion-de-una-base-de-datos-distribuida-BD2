/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 07_Todos_PrepararCatalogo.sql
*
* DESCRIPCION:
* Prepara las tablas del catálogo de productos para la replicación transaccional.
*
* En WideWorldImporters estas tablas son "temporales" (guardan historial automático
* con las columnas ValidFrom y ValidTo). La replicación transaccional no admite
* tablas temporales en el publicador, y en el suscriptor no podría escribir en
* columnas GENERATED ALWAYS. Por eso, en cada tabla del catálogo:
*
*   1. Se apaga el versionado y se elimina la tabla de historial (*_Archive).
*   2. Se elimina el PERIOD, con lo que ValidFrom y ValidTo pasan a ser columnas normales.
*   3. Se les agrega un valor por defecto, para que los INSERT existentes
*      (procedimientos del Proyecto 1) sigan funcionando sin mencionarlas.
*
* Tablas: Warehouse.Colors, Warehouse.PackageTypes, Warehouse.StockGroups,
*         Warehouse.StockItems, Warehouse.StockItemStockGroups
*
* RESTRICCIONES: Ejecutar en los TRES nodos (Corporativo, San José y Limón),
* antes de 08_Corporativo_Replicacion.sql. Se puede ejecutar más de una vez.
*
*-----------------------------------------------------------------------------------------*/

USE WideWorldImporters;
GO

SET NOCOUNT ON;
GO

DECLARE @Tablas TABLE (Nombre NVARCHAR(256));

INSERT INTO @Tablas (Nombre) VALUES
    (N'Warehouse.Colors'),
    (N'Warehouse.PackageTypes'),
    (N'Warehouse.StockGroups'),
    (N'Warehouse.StockItems'),
    (N'Warehouse.StockItemStockGroups');

DECLARE @Tabla NVARCHAR(256), @Obj INT, @Historial NVARCHAR(300), @Corto SYSNAME, @sql NVARCHAR(MAX);

DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT Nombre FROM @Tablas;
OPEN cur;
FETCH NEXT FROM cur INTO @Tabla;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @Obj   = OBJECT_ID(@Tabla);
    SET @Corto = PARSENAME(@Tabla, 1);

    /* 1. Versionado e historial */
    SET @Historial = NULL;
    SELECT @Historial = QUOTENAME(SCHEMA_NAME(h.schema_id)) + N'.' + QUOTENAME(h.name)
    FROM   sys.tables t
    JOIN   sys.tables h ON h.object_id = t.history_table_id
    WHERE  t.object_id = @Obj AND t.temporal_type = 2;

    IF @Historial IS NOT NULL
    BEGIN
        SET @sql = N'ALTER TABLE ' + @Tabla + N' SET (SYSTEM_VERSIONING = OFF); DROP TABLE ' + @Historial + N';';
        EXEC sp_executesql @sql;
        PRINT N'Versionado apagado e historial eliminado: ' + @Tabla;
    END

    /* 2. PERIOD */
    IF EXISTS (SELECT 1 FROM sys.periods WHERE object_id = @Obj)
    BEGIN
        SET @sql = N'ALTER TABLE ' + @Tabla + N' DROP PERIOD FOR SYSTEM_TIME;';
        EXEC sp_executesql @sql;
        PRINT N'PERIOD eliminado: ' + @Tabla;
    END

    /* 3. Valores por defecto para ValidFrom y ValidTo */
    IF COL_LENGTH(@Tabla, N'ValidFrom') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.default_constraints
                       WHERE parent_object_id = @Obj
                         AND parent_column_id = COLUMNPROPERTY(@Obj, N'ValidFrom', 'ColumnId'))
    BEGIN
        SET @sql = N'ALTER TABLE ' + @Tabla + N' ADD CONSTRAINT ' + QUOTENAME(N'DF_' + @Corto + N'_ValidFrom')
                 + N' DEFAULT (SYSUTCDATETIME()) FOR ValidFrom;';
        EXEC sp_executesql @sql;
    END

    IF COL_LENGTH(@Tabla, N'ValidTo') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.default_constraints
                       WHERE parent_object_id = @Obj
                         AND parent_column_id = COLUMNPROPERTY(@Obj, N'ValidTo', 'ColumnId'))
    BEGIN
        SET @sql = N'ALTER TABLE ' + @Tabla + N' ADD CONSTRAINT ' + QUOTENAME(N'DF_' + @Corto + N'_ValidTo')
                 + N' DEFAULT (CONVERT(DATETIME2(7), ''9999-12-31 23:59:59.9999999'')) FOR ValidTo;';
        EXEC sp_executesql @sql;
    END

    FETCH NEXT FROM cur INTO @Tabla;
END

CLOSE cur;
DEALLOCATE cur;
GO

/* Verificación: ninguna tabla del catálogo debe seguir siendo temporal. */
SELECT  @@SERVERNAME AS Nodo,
        SCHEMA_NAME(t.schema_id) + N'.' + t.name AS Tabla,
        t.temporal_type_desc AS Tipo,
        CASE WHEN EXISTS (SELECT 1 FROM sys.periods p WHERE p.object_id = t.object_id)
             THEN N'Sí' ELSE N'No' END AS TienePeriod
FROM    sys.tables t
WHERE   t.object_id IN (OBJECT_ID(N'Warehouse.Colors'), OBJECT_ID(N'Warehouse.PackageTypes'),
                        OBJECT_ID(N'Warehouse.StockGroups'), OBJECT_ID(N'Warehouse.StockItems'),
                        OBJECT_ID(N'Warehouse.StockItemStockGroups'))
ORDER BY Tabla;
GO
