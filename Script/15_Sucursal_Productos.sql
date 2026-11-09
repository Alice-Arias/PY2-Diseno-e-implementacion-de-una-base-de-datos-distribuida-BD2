/*---------------------------------------------------------------------------------------*
*
* NOMBRE: 15_Sucursal_Productos.sql
*
* DESCRIPCION:
* Procedimientos que usa el Administrador para crear, modificar y eliminar productos.
* Tienen los MISMOS nombres y parámetros que en SP_Inventarios.sql, así que la API y
* la web no cambian (solo Actualizar recibe un parámetro nuevo opcional, @Version).
*
* Pero ahora el producto se divide en dos partes:
*
*   Catálogo (nombre, proveedor, precios, grupos...) -> se guarda en el CORPORATIVO,
*       llamando a Catalogo.SP_Producto_* por el linked server, y la replicación lo
*       copia a las dos sucursales.
*
*   Existencias de ESTA sucursal (cantidad, ubicación, costo, reorden) -> se guardan
*       aquí, en Warehouse.StockItemHoldings (fragmento horizontal de la sucursal).
*
* Flujo de SP_Inventario_Insertar:
*   1. Envía el producto al Corporativo y recibe el StockItemID nuevo.
*   2. Espera (máximo 20 s) a que la replicación traiga el producto a esta sucursal.
*   3. Registra las existencias de esta sucursal.
*
* FALLAS: si el Corporativo no responde, el procedimiento no se cae con un error
* técnico: responde "El Corporativo no está disponible..." y no hace ningún cambio.
* Las consultas y las ventas de la sucursal siguen funcionando con normalidad.
*
* El MISMO script sirve para San José y para Limón.
*
* RESTRICCIONES: Ejecutar SOLO en las sucursales, después de 13_Sucursal_Procedimientos.sql
* y de 14_Corporativo_Catalogo.sql en el Corporativo. Se puede ejecutar más de una vez.
*
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

/*---------------------------------------------------------------------------------------*
* SP_Inventario_Insertar
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
* SP_Inventario_Actualizar
*
* @Version: el valor "Version" que devolvió SP_Inventarios_Detalle al abrir el
* formulario. Si otro usuario modificó el producto mientras tanto, el Corporativo
* rechaza el cambio (estado 7) y no se modifica nada.
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
* SP_Inventario_Eliminar
*
* El Corporativo verifica que el producto no tenga movimientos en NINGUNA sucursal,
* borra las existencias de ambas y elimina el producto; la replicación lo quita aquí.
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Eliminar
    @StockItemID INT
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
