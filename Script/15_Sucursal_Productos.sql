/*---------------------------------------------------------------------------------------*
* NOMBRE: 15_Sucursal_Productos.sql
* ENTRADA: El linked server CORPORATIVO y los procedimientos del 14.
* DESCRIPCION: Crear, modificar y eliminar productos desde la sucursal: el catálogo se guarda
*   en el Corporativo y las existencias de la sucursal se guardan aquí.
*   Si el Corporativo no responde, avisa y no cambia nada.
* SALIDA: SP_Inventario_Insertar, _Actualizar y _Eliminar de la sucursal.
* OBJETIVO: Que el Administrador administre productos desde su sucursal.
* EJECUTAR: En cada sucursal, después del 13 (y del 14 en el Corporativo).
*-----------------------------------------------------------------------------------------*/

USE WideWorldImporters;
GO

DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) NOT IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(N'Este script es para las sucursales (sanjose o limon), pero el servidor actual es %s. No se hizo ningún cambio.', 16, 1, @Servidor);
    SET NOEXEC ON;
END
GO

/* TRUSTWORTHY: permite que los procedimientos WITH EXECUTE AS OWNER usen el
   linked server CORPORATIVO (app_admin no puede usarlo por su cuenta). */
ALTER DATABASE WideWorldImporters SET TRUSTWORTHY ON;
GO

/*---------------------------------------------------------------------------------------*
* SP_Inventario_Insertar: crea el producto en el Corporativo, espera la
* replicación (máx. 20 s) y guarda las existencias de esta sucursal
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Insertar
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
    @QuantityOnHand         INT           = 0,
    @BinLocation            NVARCHAR(20)  = NULL,
    @LastCostPrice          DECIMAL(18,2) = NULL,
    @ReorderLevel           INT           = 0,
    @TargetStockLevel       INT           = 0,
    @LastEditedBy           INT           = 1
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;

    /* Validaciones de las existencias (las del catálogo las hace el Corporativo). */
    IF @QuantityOnHand < 0 BEGIN RAISERROR('La cantidad en inventario no puede ser negativa.', 16, 2); RETURN; END
    IF @LastCostPrice  < 0 BEGIN RAISERROR('El costo no puede ser negativo.', 16, 2); RETURN; END

    DECLARE @NuevoID INT, @Msg NVARCHAR(2048);

    /* 1. Crear el producto en el Corporativo. */
    BEGIN TRY
        EXEC sp_executesql
            N'EXEC CORPORATIVO.WideWorldImporters.Catalogo.SP_Producto_Insertar
                  @StockItemName = @StockItemName, @SupplierID = @SupplierID, @ColorID = @ColorID,
                  @UnitPackageID = @UnitPackageID, @OuterPackageID = @OuterPackageID,
                  @Brand = @Brand, @Size = @Size, @LeadTimeDays = @LeadTimeDays,
                  @QuantityPerOuter = @QuantityPerOuter, @IsChillerStock = @IsChillerStock,
                  @Barcode = @Barcode, @TaxRate = @TaxRate, @UnitPrice = @UnitPrice,
                  @RecommendedRetailPrice = @RecommendedRetailPrice, @Weight = @Weight,
                  @MarketingComments = @MarketingComments, @InternalComments = @InternalComments,
                  @CustomFields = @CustomFields, @StockGroupIDs = @StockGroupIDs,
                  @LastEditedBy = @LastEditedBy, @StockItemID = @NuevoID OUTPUT;',
            N'@StockItemName NVARCHAR(100), @SupplierID INT, @ColorID INT, @UnitPackageID INT,
              @OuterPackageID INT, @Brand NVARCHAR(50), @Size NVARCHAR(20), @LeadTimeDays INT,
              @QuantityPerOuter INT, @IsChillerStock BIT, @Barcode NVARCHAR(50), @TaxRate DECIMAL(18,3),
              @UnitPrice DECIMAL(18,2), @RecommendedRetailPrice DECIMAL(18,2), @Weight DECIMAL(18,3),
              @MarketingComments NVARCHAR(MAX), @InternalComments NVARCHAR(MAX), @CustomFields NVARCHAR(MAX),
              @StockGroupIDs NVARCHAR(MAX), @LastEditedBy INT, @NuevoID INT OUTPUT',
            @StockItemName = @StockItemName, @SupplierID = @SupplierID, @ColorID = @ColorID,
            @UnitPackageID = @UnitPackageID, @OuterPackageID = @OuterPackageID, @Brand = @Brand,
            @Size = @Size, @LeadTimeDays = @LeadTimeDays, @QuantityPerOuter = @QuantityPerOuter,
            @IsChillerStock = @IsChillerStock, @Barcode = @Barcode, @TaxRate = @TaxRate,
            @UnitPrice = @UnitPrice, @RecommendedRetailPrice = @RecommendedRetailPrice, @Weight = @Weight,
            @MarketingComments = @MarketingComments, @InternalComments = @InternalComments,
            @CustomFields = @CustomFields, @StockGroupIDs = @StockGroupIDs,
            @LastEditedBy = @LastEditedBy, @NuevoID = @NuevoID OUTPUT;
    END TRY
    BEGIN CATCH
        /* 50000 = error de negocio del Corporativo (nombre repetido, dato inválido...). */
        IF ERROR_NUMBER() = 50000 THROW;
        SET @Msg = ERROR_MESSAGE();
        RAISERROR('El Corporativo no está disponible en este momento. Los productos solo se pueden crear, modificar o eliminar cuando el Corporativo responde. (%s)', 16, 9, @Msg);
        RETURN;
    END CATCH

    IF @NuevoID IS NULL RETURN;   -- el Corporativo rechazó el producto

    /* 2. Esperar a que la replicación traiga el producto a esta sucursal. */
    DECLARE @Intentos INT = 0;
    WHILE NOT EXISTS (SELECT 1 FROM dbo.ProductosActuales WHERE StockItemID = @NuevoID) AND @Intentos < 40
    BEGIN
        WAITFOR DELAY '00:00:00.500';
        SET @Intentos += 1;
    END

    DECLARE @Replicado BIT = CASE WHEN EXISTS (SELECT 1 FROM dbo.ProductosActuales WHERE StockItemID = @NuevoID) THEN 1 ELSE 0 END;

    /* 3. Existencias de esta sucursal. */
    IF @Replicado = 1 AND NOT EXISTS (SELECT 1 FROM dbo.ProductosInventario WHERE StockItemID = @NuevoID)
        INSERT INTO dbo.ProductosInventario
            (StockItemID, QuantityOnHand, BinLocation, LastStocktakeQuantity,
             LastCostPrice, ReorderLevel, TargetStockLevel, LastEditedBy)
        VALUES
            (@NuevoID, ISNULL(@QuantityOnHand, 0), ISNULL(NULLIF(@BinLocation, ''), N'N/A'),
             ISNULL(@QuantityOnHand, 0), ISNULL(@LastCostPrice, @UnitPrice),
             ISNULL(@ReorderLevel, 0), ISNULL(@TargetStockLevel, 0), @LastEditedBy);

    SELECT @NuevoID       AS StockItemID,
           @StockItemName AS Producto,
           @Replicado     AS Replicado_En_Sucursal;
END
GO

/*---------------------------------------------------------------------------------------*
* SP_Inventario_Actualizar: modifica el producto; si otro usuario lo cambió
* antes (@Version distinta) no se guarda nada
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Actualizar
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
    @QuantityOnHand         INT           = NULL,
    @BinLocation            NVARCHAR(20)  = NULL,
    @LastCostPrice          DECIMAL(18,2) = NULL,
    @ReorderLevel           INT           = NULL,
    @TargetStockLevel       INT           = NULL,
    @LastEditedBy           INT           = 1,
    @Version                NVARCHAR(30)  = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;

    IF @StockItemID IS NULL BEGIN RAISERROR('El StockItemID es obligatorio.', 16, 1); RETURN; END
    IF @QuantityOnHand < 0  BEGIN RAISERROR('La cantidad en inventario no puede ser negativa.', 16, 2); RETURN; END
    IF @LastCostPrice  < 0  BEGIN RAISERROR('El costo no puede ser negativo.', 16, 2); RETURN; END

    DECLARE @Msg NVARCHAR(2048);

    /* Versión local antes del cambio: sirve para saber cuándo llegó la réplica. */
    DECLARE @VersionLocalAntes NVARCHAR(30) =
        (SELECT CONVERT(NVARCHAR(30), ValidFrom, 126) FROM dbo.ProductosActuales WHERE StockItemID = @StockItemID);

    /* 1. Modificar el catálogo en el Corporativo (con control de concurrencia). */
    BEGIN TRY
        EXEC sp_executesql
            N'EXEC CORPORATIVO.WideWorldImporters.Catalogo.SP_Producto_Actualizar
                  @StockItemID = @StockItemID,
                  @StockItemName = @StockItemName, @SupplierID = @SupplierID, @ColorID = @ColorID,
                  @UnitPackageID = @UnitPackageID, @OuterPackageID = @OuterPackageID,
                  @Brand = @Brand, @Size = @Size, @LeadTimeDays = @LeadTimeDays,
                  @QuantityPerOuter = @QuantityPerOuter, @IsChillerStock = @IsChillerStock,
                  @Barcode = @Barcode, @TaxRate = @TaxRate, @UnitPrice = @UnitPrice,
                  @RecommendedRetailPrice = @RecommendedRetailPrice, @Weight = @Weight,
                  @MarketingComments = @MarketingComments, @InternalComments = @InternalComments,
                  @CustomFields = @CustomFields, @StockGroupIDs = @StockGroupIDs,
                  @LastEditedBy = @LastEditedBy, @Version = @Version;',
            N'@StockItemID INT, @StockItemName NVARCHAR(100), @SupplierID INT, @ColorID INT, @UnitPackageID INT,
              @OuterPackageID INT, @Brand NVARCHAR(50), @Size NVARCHAR(20), @LeadTimeDays INT,
              @QuantityPerOuter INT, @IsChillerStock BIT, @Barcode NVARCHAR(50), @TaxRate DECIMAL(18,3),
              @UnitPrice DECIMAL(18,2), @RecommendedRetailPrice DECIMAL(18,2), @Weight DECIMAL(18,3),
              @MarketingComments NVARCHAR(MAX), @InternalComments NVARCHAR(MAX), @CustomFields NVARCHAR(MAX),
              @StockGroupIDs NVARCHAR(MAX), @LastEditedBy INT, @Version NVARCHAR(30)',
            @StockItemID = @StockItemID,
            @StockItemName = @StockItemName, @SupplierID = @SupplierID, @ColorID = @ColorID,
            @UnitPackageID = @UnitPackageID, @OuterPackageID = @OuterPackageID, @Brand = @Brand,
            @Size = @Size, @LeadTimeDays = @LeadTimeDays, @QuantityPerOuter = @QuantityPerOuter,
            @IsChillerStock = @IsChillerStock, @Barcode = @Barcode, @TaxRate = @TaxRate,
            @UnitPrice = @UnitPrice, @RecommendedRetailPrice = @RecommendedRetailPrice, @Weight = @Weight,
            @MarketingComments = @MarketingComments, @InternalComments = @InternalComments,
            @CustomFields = @CustomFields, @StockGroupIDs = @StockGroupIDs,
            @LastEditedBy = @LastEditedBy, @Version = @Version;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() = 50000 THROW;
        SET @Msg = ERROR_MESSAGE();
        RAISERROR('El Corporativo no está disponible en este momento. Los productos solo se pueden crear, modificar o eliminar cuando el Corporativo responde. (%s)', 16, 9, @Msg);
        RETURN;
    END CATCH

    /* 2. Esperar (máximo 10 s) a que la replicación traiga el cambio a esta sucursal,
          para que al recargar la pantalla ya se vean los datos nuevos. */
    DECLARE @Intentos INT = 0;
    WHILE @Intentos < 20
      AND EXISTS (SELECT 1 FROM dbo.ProductosActuales
                  WHERE StockItemID = @StockItemID
                    AND CONVERT(NVARCHAR(30), ValidFrom, 126) = @VersionLocalAntes)
    BEGIN
        WAITFOR DELAY '00:00:00.500';
        SET @Intentos += 1;
    END

    /* 3. Existencias de esta sucursal: si existen se actualizan, si no se crean. */
    IF EXISTS (SELECT 1 FROM dbo.ProductosInventario WITH (UPDLOCK) WHERE StockItemID = @StockItemID)
        UPDATE dbo.ProductosInventario
        SET QuantityOnHand   = ISNULL(@QuantityOnHand, QuantityOnHand),
            BinLocation      = ISNULL(NULLIF(@BinLocation, ''), BinLocation),
            LastCostPrice    = ISNULL(@LastCostPrice, LastCostPrice),
            ReorderLevel     = ISNULL(@ReorderLevel, ReorderLevel),
            TargetStockLevel = ISNULL(@TargetStockLevel, TargetStockLevel),
            LastEditedBy     = @LastEditedBy,
            LastEditedWhen   = SYSDATETIME()
        WHERE StockItemID = @StockItemID;
    ELSE IF EXISTS (SELECT 1 FROM dbo.ProductosActuales WHERE StockItemID = @StockItemID)
        INSERT INTO dbo.ProductosInventario
            (StockItemID, QuantityOnHand, BinLocation, LastStocktakeQuantity,
             LastCostPrice, ReorderLevel, TargetStockLevel, LastEditedBy)
        VALUES
            (@StockItemID, ISNULL(@QuantityOnHand, 0), ISNULL(NULLIF(@BinLocation, ''), N'N/A'),
             ISNULL(@QuantityOnHand, 0), ISNULL(@LastCostPrice, @UnitPrice),
             ISNULL(@ReorderLevel, 0), ISNULL(@TargetStockLevel, 0), @LastEditedBy);

    SELECT @StockItemID AS StockItemID;
END
GO

/*---------------------------------------------------------------------------------------*
* SP_Inventario_Eliminar: lo elimina en el Corporativo si no tiene movimientos
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Eliminar
    @StockItemID INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;

    IF @StockItemID IS NULL BEGIN RAISERROR('El StockItemID es obligatorio.', 16, 1); RETURN; END

    DECLARE @Msg NVARCHAR(2048);

    BEGIN TRY
        EXEC sp_executesql
            N'EXEC CORPORATIVO.WideWorldImporters.Catalogo.SP_Producto_Eliminar @StockItemID = @StockItemID;',
            N'@StockItemID INT',
            @StockItemID = @StockItemID;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() = 50000 THROW;
        SET @Msg = ERROR_MESSAGE();
        RAISERROR('El Corporativo no está disponible en este momento. Los productos solo se pueden crear, modificar o eliminar cuando el Corporativo responde. (%s)', 16, 9, @Msg);
        RETURN;
    END CATCH

    /* Esperar (máximo 10 s) a que la replicación quite el producto de esta sucursal,
       para que la lista ya no lo muestre al recargar. */
    DECLARE @Intentos INT = 0;
    WHILE EXISTS (SELECT 1 FROM dbo.ProductosActuales WHERE StockItemID = @StockItemID) AND @Intentos < 20
    BEGIN
        WAITFOR DELAY '00:00:00.500';
        SET @Intentos += 1;
    END

    SELECT @StockItemID AS StockItemID_Eliminado;
END
GO

/* Permisos para el rol Administrador y verificación. */
EXEC dbo.usp_OtorgarPermisosApp;
GO

SELECT name AS Procedimiento
FROM   sys.procedures
WHERE  name IN (N'SP_Inventario_Insertar', N'SP_Inventario_Actualizar', N'SP_Inventario_Eliminar')
ORDER BY name;
GO

SET NOEXEC OFF;
GO
