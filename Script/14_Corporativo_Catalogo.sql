/*---------------------------------------------------------------------------------------*
* NOMBRE: 14_Corporativo_Catalogo.sql
* ENTRADA: Las tablas del catálogo y los linked servers a las sucursales.
* DESCRIPCION: Crear, modificar y eliminar productos en el Corporativo (dueño del catálogo).
*   Controla nombres repetidos, cambios a la vez (versión) y sucursales caídas.
*   Errores (estado): 1 obligatorio, 2 rango, 3 no existe relacionado, 4 repetido,
*   5 no existe, 6 tiene movimientos, 7 otro usuario lo cambió, 8 sucursal caída.
* SALIDA: Catalogo.SP_Producto_Insertar, _Actualizar y _Eliminar.
* OBJETIVO: Modificar el catálogo en un solo nodo sin conflictos.
* EJECUTAR: Solo en el Corporativo, después del 10.
*-----------------------------------------------------------------------------------------*/

USE WideWorldImporters;
GO

DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(N'Este script es para el Corporativo, pero el servidor actual es %s. No se hizo ningún cambio.', 16, 1, @Servidor);
    SET NOEXEC ON;
END
GO

IF SCHEMA_ID(N'Catalogo') IS NULL EXEC (N'CREATE SCHEMA Catalogo');
GO

/* TRUSTWORTHY: permite que SP_Producto_Eliminar (WITH EXECUTE AS OWNER) consulte las
   sucursales; enlace_sucursal no puede usar los linked servers por su cuenta. */
ALTER DATABASE WideWorldImporters SET TRUSTWORTHY ON;
GO

/*---------------------------------------------------------------------------------------*
* Catalogo.SP_Producto_Insertar: crea el producto y sus grupos
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Catalogo.SP_Producto_Insertar
    @StockItemName          NVARCHAR(100),
    @SupplierID             INT,
    @ColorID                INT           = NULL,
    @UnitPackageID          INT,
    @OuterPackageID         INT,
    @Brand                  NVARCHAR(50)  = NULL,
    @Size                   NVARCHAR(20)  = NULL,
    @LeadTimeDays           INT,
    @QuantityPerOuter       INT,
    @IsChillerStock         BIT,
    @Barcode                NVARCHAR(50)  = NULL,
    @TaxRate                DECIMAL(18,3),
    @UnitPrice              DECIMAL(18,2),
    @RecommendedRetailPrice DECIMAL(18,2) = NULL,
    @Weight                 DECIMAL(18,3),
    @MarketingComments      NVARCHAR(MAX) = NULL,
    @InternalComments       NVARCHAR(MAX) = NULL,
    @CustomFields           NVARCHAR(MAX) = NULL,
    @StockGroupIDs          NVARCHAR(MAX),
    @LastEditedBy           INT           = 1,
    @StockItemID            INT           OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    /* Obligatorios */
    IF NULLIF(LTRIM(RTRIM(@StockItemName)), '') IS NULL BEGIN RAISERROR('El nombre del producto es obligatorio.', 16, 1); RETURN; END
    IF @SupplierID       IS NULL BEGIN RAISERROR('El proveedor es obligatorio.', 16, 1); RETURN; END
    IF @UnitPackageID    IS NULL BEGIN RAISERROR('El paquete por unidad es obligatorio.', 16, 1); RETURN; END
    IF @OuterPackageID   IS NULL BEGIN RAISERROR('El paquete exterior es obligatorio.', 16, 1); RETURN; END
    IF @LeadTimeDays     IS NULL BEGIN RAISERROR('Los días de entrega son obligatorios.', 16, 1); RETURN; END
    IF @QuantityPerOuter IS NULL BEGIN RAISERROR('La cantidad por empaque es obligatoria.', 16, 1); RETURN; END
    IF @IsChillerStock   IS NULL BEGIN RAISERROR('El indicador de almacenamiento refrigerado es obligatorio.', 16, 1); RETURN; END
    IF @TaxRate          IS NULL BEGIN RAISERROR('La tasa de impuesto es obligatoria.', 16, 1); RETURN; END
    IF @UnitPrice        IS NULL BEGIN RAISERROR('El precio unitario es obligatorio.', 16, 1); RETURN; END
    IF @Weight           IS NULL BEGIN RAISERROR('El peso es obligatorio.', 16, 1); RETURN; END
    IF NULLIF(LTRIM(RTRIM(@StockGroupIDs)), '') IS NULL BEGIN RAISERROR('Debe seleccionar al menos un grupo.', 16, 1); RETURN; END

    /* Rangos */
    IF @LeadTimeDays < 0           BEGIN RAISERROR('Los días de entrega no pueden ser negativos.', 16, 2); RETURN; END
    IF @QuantityPerOuter <= 0      BEGIN RAISERROR('La cantidad por empaque debe ser mayor que cero.', 16, 2); RETURN; END
    IF @TaxRate < 0                BEGIN RAISERROR('La tasa de impuesto no puede ser negativa.', 16, 2); RETURN; END
    IF @UnitPrice < 0              BEGIN RAISERROR('El precio unitario no puede ser negativo.', 16, 2); RETURN; END
    IF @RecommendedRetailPrice < 0 BEGIN RAISERROR('El precio de venta recomendado no puede ser negativo.', 16, 2); RETURN; END
    IF @Weight < 0                 BEGIN RAISERROR('El peso no puede ser negativo.', 16, 2); RETURN; END

    /* Relacionados */
    IF NOT EXISTS (SELECT 1 FROM Purchasing.Suppliers WHERE SupplierID = @SupplierID)
        BEGIN RAISERROR('El proveedor indicado no existe.', 16, 3); RETURN; END
    IF @ColorID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Warehouse.Colors WHERE ColorID = @ColorID)
        BEGIN RAISERROR('El color indicado no existe.', 16, 3); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM Warehouse.PackageTypes WHERE PackageTypeID = @UnitPackageID)
        BEGIN RAISERROR('El tipo de paquete por unidad indicado no existe.', 16, 3); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM Warehouse.PackageTypes WHERE PackageTypeID = @OuterPackageID)
        BEGIN RAISERROR('El tipo de paquete exterior indicado no existe.', 16, 3); RETURN; END

    DECLARE @Grupos TABLE (StockGroupID INT PRIMARY KEY);
    INSERT INTO @Grupos (StockGroupID)
    SELECT DISTINCT TRY_CAST(value AS INT)
    FROM   STRING_SPLIT(@StockGroupIDs, ',')
    WHERE  TRY_CAST(value AS INT) IS NOT NULL;

    IF NOT EXISTS (SELECT 1 FROM @Grupos)
       OR EXISTS (SELECT 1 FROM @Grupos AS x
                  WHERE NOT EXISTS (SELECT 1 FROM Warehouse.StockGroups AS g WHERE g.StockGroupID = x.StockGroupID))
        BEGIN RAISERROR('Uno o más grupos indicados no existen.', 16, 3); RETURN; END

    BEGIN TRY
        BEGIN TRANSACTION;

        /* Concurrencia: nombre único para TODAS las sucursales. */
        IF EXISTS (SELECT 1 FROM Warehouse.StockItems WITH (UPDLOCK, HOLDLOCK)
                   WHERE StockItemName = @StockItemName)
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR('Ya existe un producto con ese nombre.', 16, 4);
            RETURN;
        END

        DECLARE @Nuevo TABLE (StockItemID INT);

        INSERT INTO Warehouse.StockItems
        (
            StockItemName, SupplierID, ColorID, UnitPackageID, OuterPackageID,
            Brand, Size, LeadTimeDays, QuantityPerOuter, IsChillerStock, Barcode,
            TaxRate, UnitPrice, RecommendedRetailPrice, TypicalWeightPerUnit,
            MarketingComments, InternalComments, CustomFields, LastEditedBy,
            ValidFrom
        )
        OUTPUT inserted.StockItemID INTO @Nuevo (StockItemID)
        VALUES
        (
            @StockItemName, @SupplierID, @ColorID, @UnitPackageID, @OuterPackageID,
            @Brand, @Size, @LeadTimeDays, @QuantityPerOuter, @IsChillerStock, @Barcode,
            @TaxRate, @UnitPrice, @RecommendedRetailPrice, @Weight,
            @MarketingComments, @InternalComments, @CustomFields, @LastEditedBy,
            SYSUTCDATETIME()
        );

        SET @StockItemID = (SELECT StockItemID FROM @Nuevo);

        INSERT INTO Warehouse.StockItemStockGroups (StockItemID, StockGroupID, LastEditedBy)
        SELECT @StockItemID, StockGroupID, @LastEditedBy
        FROM   @Grupos;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO

/*---------------------------------------------------------------------------------------*
* Catalogo.SP_Producto_Actualizar: modifica el producto y sus grupos.
* @Version: la que se leyó al abrir el formulario (NULL = no se revisa).
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Catalogo.SP_Producto_Actualizar
    @StockItemID            INT,
    @StockItemName          NVARCHAR(100),
    @SupplierID             INT,
    @ColorID                INT           = NULL,
    @UnitPackageID          INT,
    @OuterPackageID         INT,
    @Brand                  NVARCHAR(50)  = NULL,
    @Size                   NVARCHAR(20)  = NULL,
    @LeadTimeDays           INT,
    @QuantityPerOuter       INT,
    @IsChillerStock         BIT,
    @Barcode                NVARCHAR(50)  = NULL,
    @TaxRate                DECIMAL(18,3),
    @UnitPrice              DECIMAL(18,2),
    @RecommendedRetailPrice DECIMAL(18,2) = NULL,
    @Weight                 DECIMAL(18,3),
    @MarketingComments      NVARCHAR(MAX) = NULL,
    @InternalComments       NVARCHAR(MAX) = NULL,
    @CustomFields           NVARCHAR(MAX) = NULL,
    @StockGroupIDs          NVARCHAR(MAX),
    @LastEditedBy           INT           = 1,
    @Version                NVARCHAR(30)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @StockItemID IS NULL BEGIN RAISERROR('El StockItemID es obligatorio.', 16, 1); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM Warehouse.StockItems WHERE StockItemID = @StockItemID)
        BEGIN RAISERROR('El producto que intenta actualizar no existe.', 16, 5); RETURN; END

    IF NULLIF(LTRIM(RTRIM(@StockItemName)), '') IS NULL BEGIN RAISERROR('El nombre del producto es obligatorio.', 16, 1); RETURN; END
    IF @SupplierID       IS NULL BEGIN RAISERROR('El proveedor es obligatorio.', 16, 1); RETURN; END
    IF @UnitPackageID    IS NULL BEGIN RAISERROR('El paquete por unidad es obligatorio.', 16, 1); RETURN; END
    IF @OuterPackageID   IS NULL BEGIN RAISERROR('El paquete exterior es obligatorio.', 16, 1); RETURN; END
    IF @LeadTimeDays     IS NULL BEGIN RAISERROR('Los días de entrega son obligatorios.', 16, 1); RETURN; END
    IF @QuantityPerOuter IS NULL BEGIN RAISERROR('La cantidad por empaque es obligatoria.', 16, 1); RETURN; END
    IF @IsChillerStock   IS NULL BEGIN RAISERROR('El indicador de almacenamiento refrigerado es obligatorio.', 16, 1); RETURN; END
    IF @TaxRate          IS NULL BEGIN RAISERROR('La tasa de impuesto es obligatoria.', 16, 1); RETURN; END
    IF @UnitPrice        IS NULL BEGIN RAISERROR('El precio unitario es obligatorio.', 16, 1); RETURN; END
    IF @Weight           IS NULL BEGIN RAISERROR('El peso es obligatorio.', 16, 1); RETURN; END
    IF NULLIF(LTRIM(RTRIM(@StockGroupIDs)), '') IS NULL BEGIN RAISERROR('Debe seleccionar al menos un grupo.', 16, 1); RETURN; END

    IF @LeadTimeDays < 0           BEGIN RAISERROR('Los días de entrega no pueden ser negativos.', 16, 2); RETURN; END
    IF @QuantityPerOuter <= 0      BEGIN RAISERROR('La cantidad por empaque debe ser mayor que cero.', 16, 2); RETURN; END
    IF @TaxRate < 0                BEGIN RAISERROR('La tasa de impuesto no puede ser negativa.', 16, 2); RETURN; END
    IF @UnitPrice < 0              BEGIN RAISERROR('El precio unitario no puede ser negativo.', 16, 2); RETURN; END
    IF @RecommendedRetailPrice < 0 BEGIN RAISERROR('El precio de venta recomendado no puede ser negativo.', 16, 2); RETURN; END
    IF @Weight < 0                 BEGIN RAISERROR('El peso no puede ser negativo.', 16, 2); RETURN; END

    IF NOT EXISTS (SELECT 1 FROM Purchasing.Suppliers WHERE SupplierID = @SupplierID)
        BEGIN RAISERROR('El proveedor indicado no existe.', 16, 3); RETURN; END
    IF @ColorID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Warehouse.Colors WHERE ColorID = @ColorID)
        BEGIN RAISERROR('El color indicado no existe.', 16, 3); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM Warehouse.PackageTypes WHERE PackageTypeID = @UnitPackageID)
        BEGIN RAISERROR('El tipo de paquete por unidad indicado no existe.', 16, 3); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM Warehouse.PackageTypes WHERE PackageTypeID = @OuterPackageID)
        BEGIN RAISERROR('El tipo de paquete exterior indicado no existe.', 16, 3); RETURN; END

    DECLARE @Grupos TABLE (StockGroupID INT PRIMARY KEY);
    INSERT INTO @Grupos (StockGroupID)
    SELECT DISTINCT TRY_CAST(value AS INT)
    FROM   STRING_SPLIT(@StockGroupIDs, ',')
    WHERE  TRY_CAST(value AS INT) IS NOT NULL;

    IF NOT EXISTS (SELECT 1 FROM @Grupos)
       OR EXISTS (SELECT 1 FROM @Grupos AS x
                  WHERE NOT EXISTS (SELECT 1 FROM Warehouse.StockGroups AS g WHERE g.StockGroupID = x.StockGroupID))
        BEGIN RAISERROR('Uno o más grupos indicados no existen.', 16, 3); RETURN; END

    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM Warehouse.StockItems WITH (UPDLOCK, HOLDLOCK)
                   WHERE StockItemName = @StockItemName AND StockItemID <> @StockItemID)
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR('Ya existe otro producto con ese nombre.', 16, 4);
            RETURN;
        END

        /* Control optimista: solo actualiza si nadie cambió el producto desde que se leyó. */
        UPDATE Warehouse.StockItems
        SET StockItemName          = @StockItemName,
            SupplierID             = @SupplierID,
            ColorID                = @ColorID,
            UnitPackageID          = @UnitPackageID,
            OuterPackageID         = @OuterPackageID,
            Brand                  = @Brand,
            Size                   = @Size,
            LeadTimeDays           = @LeadTimeDays,
            QuantityPerOuter       = @QuantityPerOuter,
            IsChillerStock         = @IsChillerStock,
            Barcode                = @Barcode,
            TaxRate                = @TaxRate,
            UnitPrice              = @UnitPrice,
            RecommendedRetailPrice = @RecommendedRetailPrice,
            TypicalWeightPerUnit   = @Weight,
            MarketingComments      = @MarketingComments,
            InternalComments       = @InternalComments,
            CustomFields           = ISNULL(@CustomFields, CustomFields),
            LastEditedBy           = @LastEditedBy,
            ValidFrom              = SYSUTCDATETIME()      -- nueva versión
        WHERE StockItemID = @StockItemID
          AND (@Version IS NULL OR CONVERT(NVARCHAR(30), ValidFrom, 126) = @Version);

        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR('Otro usuario modificó este producto mientras usted lo editaba. Recargue el producto y vuelva a intentarlo.', 16, 7);
            RETURN;
        END

        DELETE ig
        FROM   Warehouse.StockItemStockGroups AS ig
        WHERE  ig.StockItemID = @StockItemID
          AND  ig.StockGroupID NOT IN (SELECT StockGroupID FROM @Grupos);

        INSERT INTO Warehouse.StockItemStockGroups (StockItemID, StockGroupID, LastEditedBy)
        SELECT @StockItemID, x.StockGroupID, @LastEditedBy
        FROM   @Grupos AS x
        WHERE  NOT EXISTS (SELECT 1 FROM Warehouse.StockItemStockGroups AS ig
                           WHERE ig.StockItemID = @StockItemID AND ig.StockGroupID = x.StockGroupID);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO

/*---------------------------------------------------------------------------------------*
* Catalogo.SP_Producto_Eliminar: lo elimina si no tiene movimientos en ninguna sucursal
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Catalogo.SP_Producto_Eliminar
    @StockItemID INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @StockItemID IS NULL BEGIN RAISERROR('El StockItemID es obligatorio.', 16, 1); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM Warehouse.StockItems WHERE StockItemID = @StockItemID)
        BEGIN RAISERROR('El producto que intenta eliminar no existe.', 16, 5); RETURN; END

    /* 1. Movimientos registrados en el Corporativo (historial consolidado). */
    IF EXISTS (SELECT 1 FROM Warehouse.StockItemTransactions WHERE StockItemID = @StockItemID)
       OR EXISTS (SELECT 1 FROM Sales.OrderLines            WHERE StockItemID = @StockItemID)
       OR EXISTS (SELECT 1 FROM Sales.InvoiceLines          WHERE StockItemID = @StockItemID)
       OR EXISTS (SELECT 1 FROM Purchasing.PurchaseOrderLines WHERE StockItemID = @StockItemID)
       OR EXISTS (SELECT 1 FROM Sales.SpecialDeals          WHERE StockItemID = @StockItemID)
        BEGIN RAISERROR('No se puede eliminar: el producto tiene ventas, pedidos, compras u ofertas registradas.', 16, 6); RETURN; END

    /* 2. Movimientos en cada sucursal (por linked server). */
    DECLARE @Sucursales TABLE (Orden INT, Enlace SYSNAME, Nombre NVARCHAR(30));
    INSERT INTO @Sucursales VALUES (1, N'LS_SANJOSE', N'San José'), (2, N'LS_LIMON', N'Limón');

    DECLARE @Enlace SYSNAME, @Nombre NVARCHAR(30), @Usos INT, @sql NVARCHAR(MAX), @Detalle NVARCHAR(2048);

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT Enlace, Nombre FROM @Sucursales ORDER BY Orden;
    OPEN cur;
    FETCH NEXT FROM cur INTO @Enlace, @Nombre;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @Usos = NULL;
        SET @sql = N'SELECT @u =
              (SELECT COUNT(*) FROM ' + @Enlace + N'.WideWorldImporters.Sales.InvoiceLines             WHERE StockItemID = @id)
            + (SELECT COUNT(*) FROM ' + @Enlace + N'.WideWorldImporters.Sales.OrderLines               WHERE StockItemID = @id)
            + (SELECT COUNT(*) FROM ' + @Enlace + N'.WideWorldImporters.Purchasing.PurchaseOrderLines  WHERE StockItemID = @id)
            + (SELECT COUNT(*) FROM ' + @Enlace + N'.WideWorldImporters.Warehouse.StockItemTransactions WHERE StockItemID = @id);';

        BEGIN TRY
            EXEC sp_executesql @sql, N'@id INT, @u INT OUTPUT', @id = @StockItemID, @u = @Usos OUTPUT;
        END TRY
        BEGIN CATCH
            SET @Detalle = ERROR_MESSAGE();
            CLOSE cur; DEALLOCATE cur;
            RAISERROR('No se puede eliminar: la sucursal %s no responde y no se puede verificar que el producto no tenga ventas allá. Intente más tarde. (%s)', 16, 8, @Nombre, @Detalle);
            RETURN;
        END CATCH

        IF @Usos > 0
        BEGIN
            CLOSE cur; DEALLOCATE cur;
            RAISERROR('No se puede eliminar: el producto tiene movimientos en la sucursal %s.', 16, 6, @Nombre);
            RETURN;
        END

        FETCH NEXT FROM cur INTO @Enlace, @Nombre;
    END

    CLOSE cur;
    DEALLOCATE cur;

    /* 3. Existencias en cada sucursal: se borran antes, para que la replicación
          pueda eliminar el producto allá sin chocar con la llave foránea. */
    DECLARE cur2 CURSOR LOCAL FAST_FORWARD FOR SELECT Enlace, Nombre FROM @Sucursales ORDER BY Orden;
    OPEN cur2;
    FETCH NEXT FROM cur2 INTO @Enlace, @Nombre;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'DELETE FROM ' + @Enlace + N'.WideWorldImporters.Warehouse.StockItemHoldings WHERE StockItemID = @id;';

        BEGIN TRY
            EXEC sp_executesql @sql, N'@id INT', @id = @StockItemID;
        END TRY
        BEGIN CATCH
            SET @Detalle = ERROR_MESSAGE();
            CLOSE cur2; DEALLOCATE cur2;
            RAISERROR('No se pudo eliminar: la sucursal %s dejó de responder. Intente más tarde. (%s)', 16, 8, @Nombre, @Detalle);
            RETURN;
        END CATCH

        FETCH NEXT FROM cur2 INTO @Enlace, @Nombre;
    END

    CLOSE cur2;
    DEALLOCATE cur2;

    /* 4. Eliminación en el Corporativo: la replicación la lleva a las sucursales. */
    BEGIN TRY
        BEGIN TRANSACTION;
        DELETE FROM Warehouse.StockItemStockGroups WHERE StockItemID = @StockItemID;
        DELETE FROM Warehouse.StockItemHoldings    WHERE StockItemID = @StockItemID;
        DELETE FROM Warehouse.StockItems           WHERE StockItemID = @StockItemID;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO

/* Verificación */
SELECT SCHEMA_NAME(schema_id) + N'.' + name AS Procedimiento
FROM   sys.procedures
WHERE  SCHEMA_NAME(schema_id) = N'Catalogo'
ORDER BY name;
GO

SET NOEXEC OFF;
GO
