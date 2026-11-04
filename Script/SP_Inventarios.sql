/*---------------------------------------------------------------------------------------*
*
* SCRIPT CORREGIDO: SP_Inventarios.sql
*
* CORRECCIONES RESPECTO AL PROYECTO 1:
*   1. SP_Inventarios_Listar ahora PAGINA en SQL Server (OFFSET / FETCH) y devuelve
*      el total de registros. La app web ya no recibe todos los productos.
*   2. Se usan LEFT JOIN: un producto sin inventario o sin grupo ya no "desaparece".
*   3. SP_Inventario_Insertar ahora también crea el registro de inventario
*      (StockItemHoldings) y los grupos (StockItemStockGroups).
*   4. SP_Inventario_Actualizar también modifica inventario (holdings) y grupos.
*   5. SP_Inventarios_Detalle devuelve TODOS los IDs que el formulario de edición
*      necesita (antes faltaban y el formulario quedaba con campos vacíos).
*   6. SP_Inventarios_Resumen calcula las estadísticas de las tarjetas en SQL.
*   7. La validación de nombre duplicado usa UPDLOCK/HOLDLOCK dentro de la
*      transacción (concurrencia: dos usuarios no pueden crear el mismo nombre).
*
*-----------------------------------------------------------------------------------------*/
USE WideWorldImporters;
GO

/*---------------------------------------------------------------------------------------*
* NOMBRE: SP_Inventarios_Listar
* DESCRIPCION: Lista productos con filtros acumulativos y paginación en el servidor.
* ENTRADA: @Nombre, @Grupo, @Cantidad (opcionales), @Pagina, @TamanoPagina.
* SALIDA: Resultado 1 -> filas de la página. Resultado 2 -> datos de paginación.
* OBJETIVO: Que la paginación y el filtrado se hagan en SQL, no en la app web.
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventarios_Listar
    @Nombre       NVARCHAR(100) = NULL,
    @Grupo        NVARCHAR(100) = NULL,
    @Cantidad     INT           = NULL,
    @Pagina       INT           = 1,
    @TamanoPagina INT           = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF @Pagina IS NULL OR @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    /* 1. Productos que cumplen los filtros (solo columnas livianas). */
    SELECT
        pto.StockItemID,
        pto.StockItemName,
        pi.QuantityOnHand
    INTO #Filtrados
    FROM dbo.ProductosActuales AS pto
    LEFT JOIN dbo.ProductosInventario AS pi
        ON pi.StockItemID = pto.StockItemID
    WHERE
        (@Nombre IS NULL OR pto.StockItemName LIKE '%' + @Nombre + '%')
        AND (@Cantidad IS NULL OR pi.QuantityOnHand >= @Cantidad)
        AND (@Grupo IS NULL OR EXISTS
            (
                SELECT 1
                FROM dbo.ItemGrupos AS ig
                INNER JOIN dbo.GruposInventario AS g
                    ON g.StockGroupID = ig.StockGroupID
                WHERE ig.StockItemID = pto.StockItemID
                  AND g.StockGroupName LIKE '%' + @Grupo + '%'
            ));

    DECLARE @Total INT = @@ROWCOUNT;
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1
             ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;

    /* Si la página pedida ya no existe (ej: se borró el último registro), se ajusta. */
    IF @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* 2. Solo la página solicitada. Los grupos se arman únicamente para estas filas. */
    SELECT
        f.StockItemID,
        f.StockItemName AS Producto,
        (
            SELECT STRING_AGG(g.StockGroupName, ', ')
                   WITHIN GROUP (ORDER BY g.StockGroupName)
            FROM dbo.ItemGrupos AS ig
            INNER JOIN dbo.GruposInventario AS g
                ON g.StockGroupID = ig.StockGroupID
            WHERE ig.StockItemID = f.StockItemID
              AND (@Grupo IS NULL OR g.StockGroupName LIKE '%' + @Grupo + '%')
        ) AS Grupo,
        f.QuantityOnHand AS Cantidad_Inventario
    FROM #Filtrados AS f
    ORDER BY f.StockItemName ASC
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;

    /* 3. Información de paginación. */
    SELECT
        @Total        AS Total_Registros,
        @Pagina       AS Pagina,
        @TamanoPagina AS Tamano_Pagina,
        @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* NOMBRE: SP_Inventarios_Resumen
* DESCRIPCION: Estadísticas de las tarjetas superiores del módulo.
* SALIDA: Resultado 1 -> totales. Resultado 2 -> lista de grupos (para el filtro).
* OBJETIVO: Que los conteos se calculen en SQL y no en React.
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventarios_Resumen
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*) FROM dbo.ProductosActuales)            AS Total_Productos,
        (SELECT COUNT(*) FROM dbo.GruposInventario)             AS Total_Grupos,
        (SELECT COUNT(*) FROM dbo.ProductosInventario
          WHERE QuantityOnHand <= 0)                            AS Productos_Sin_Stock;

    SELECT StockGroupID AS ID, StockGroupName AS Nombre
    FROM dbo.GruposInventario
    ORDER BY StockGroupName;
END
GO

/*---------------------------------------------------------------------------------------*
* NOMBRE: SP_Inventarios_Detalle
* DESCRIPCION: Detalle de uno o varios productos (IDs separados por coma).
*              Devuelve los IDs que necesita el formulario de edición.
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventarios_Detalle
    @StockItemID NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pto.StockItemID,
        pto.StockItemName AS Producto,
        pto.SupplierID   AS Proveedor_ID,
        p.SupplierName   AS Proveedor,
        pto.ColorID      AS Color_ID,
        ISNULL(NULLIF(LTRIM(RTRIM(c.ColorName)), ''), 'Color sin definir') AS Color,
        ISNULL(NULLIF(LTRIM(RTRIM(pto.Brand)), ''), 'Marca sin definir')   AS Marca,
        pto.Brand        AS Brand,
        pto.UnitPackageID,
        e.PackageTypeName  AS Unidad_Empaquetamiento,
        pto.OuterPackageID,
        em.PackageTypeName AS Empaquetamiento,
        pto.QuantityPerOuter AS Cantidad_Empaquetamiento,
        pto.Size         AS Talla,
        pto.LeadTimeDays,
        pto.IsChillerStock,
        pto.Barcode,
        pto.TaxRate,
        ROUND(pto.UnitPrice * (pto.TaxRate / 100.0), 2) AS Impuesto,
        pto.UnitPrice    AS Precio_Unitario,
        pto.RecommendedRetailPrice AS Precio_Venta,
        pto.TypicalWeightPerUnit   AS Peso,
        pto.MarketingComments,
        pto.InternalComments,
        pto.CustomFields,
        pto.SearchDetails AS Palabras_Clave,
        pi.QuantityOnHand AS Cantidad_Disponible,
        pi.BinLocation    AS Ubicacion,
        pi.LastCostPrice,
        pi.ReorderLevel,
        pi.TargetStockLevel,
        (
            SELECT STRING_AGG(CAST(ig.StockGroupID AS NVARCHAR(10)), ',')
            FROM dbo.ItemGrupos AS ig
            WHERE ig.StockItemID = pto.StockItemID
        ) AS Grupos_IDs,
        (
            SELECT STRING_AGG(g.StockGroupName, ', ')
            FROM dbo.ItemGrupos AS ig
            INNER JOIN dbo.GruposInventario AS g ON g.StockGroupID = ig.StockGroupID
            WHERE ig.StockItemID = pto.StockItemID
        ) AS Grupos
    FROM dbo.ProductosActuales AS pto
    LEFT JOIN dbo.ProveedoresActuales AS p
        ON pto.SupplierID = p.SupplierID
    LEFT JOIN dbo.ColoresProductos AS c
        ON pto.ColorID = c.ColorID
    LEFT JOIN dbo.EmpaquetamientoInventario AS e
        ON pto.UnitPackageID = e.PackageTypeID
    LEFT JOIN dbo.EmpaquetamientoInventario AS em
        ON pto.OuterPackageID = em.PackageTypeID
    LEFT JOIN dbo.ProductosInventario AS pi      -- antes era INNER: el producto nuevo no aparecía
        ON pto.StockItemID = pi.StockItemID
    WHERE pto.StockItemID IN
    (
        SELECT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@StockItemID, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL
    );
END
GO

/*---------------------------------------------------------------------------------------*
* NOMBRE: SP_Inventario_Insertar
* DESCRIPCION: Crea el producto, su registro de inventario (holdings) y sus grupos,
*              todo dentro de una misma transacción.
* NUEVOS PARAMETROS: @StockGroupIDs (CSV, al menos uno), @QuantityOnHand,
*              @BinLocation, @LastCostPrice, @ReorderLevel, @TargetStockLevel.
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Insertar
    @StockItemName          NVARCHAR(100),
    @SupplierID             INT,
    @ColorID                INT = NULL,
    @UnitPackageID          INT,
    @OuterPackageID         INT,
    @Brand                  NVARCHAR(50) = NULL,
    @Size                   NVARCHAR(20) = NULL,
    @LeadTimeDays           INT,
    @QuantityPerOuter       INT,
    @IsChillerStock         BIT,
    @Barcode                NVARCHAR(50) = NULL,
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
    SET XACT_ABORT ON;

    /* --- Tipo 1: obligatorios --- */
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

    /* --- Tipo 2: rangos --- */
    IF @LeadTimeDays < 0      BEGIN RAISERROR('Los días de entrega no pueden ser negativos.', 16, 2); RETURN; END
    IF @QuantityPerOuter <= 0 BEGIN RAISERROR('La cantidad por empaque debe ser mayor que cero.', 16, 2); RETURN; END
    IF @TaxRate < 0           BEGIN RAISERROR('La tasa de impuesto no puede ser negativa.', 16, 2); RETURN; END
    IF @UnitPrice < 0         BEGIN RAISERROR('El precio unitario no puede ser negativo.', 16, 2); RETURN; END
    IF @RecommendedRetailPrice < 0 BEGIN RAISERROR('El precio de venta recomendado no puede ser negativo.', 16, 2); RETURN; END
    IF @Weight < 0            BEGIN RAISERROR('El peso no puede ser negativo.', 16, 2); RETURN; END
    IF @QuantityOnHand < 0    BEGIN RAISERROR('La cantidad en inventario no puede ser negativa.', 16, 2); RETURN; END
    IF @LastCostPrice < 0     BEGIN RAISERROR('El costo no puede ser negativo.', 16, 2); RETURN; END

    /* --- Tipo 3: relacionados --- */
    IF NOT EXISTS (SELECT 1 FROM dbo.ProveedoresActuales WHERE SupplierID = @SupplierID)
        BEGIN RAISERROR('El proveedor indicado no existe.', 16, 3); RETURN; END
    IF @ColorID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.ColoresProductos WHERE ColorID = @ColorID)
        BEGIN RAISERROR('El color indicado no existe.', 16, 3); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM dbo.EmpaquetamientoInventario WHERE PackageTypeID = @UnitPackageID)
        BEGIN RAISERROR('El tipo de paquete por unidad indicado no existe.', 16, 3); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM dbo.EmpaquetamientoInventario WHERE PackageTypeID = @OuterPackageID)
        BEGIN RAISERROR('El tipo de paquete exterior indicado no existe.', 16, 3); RETURN; END

    DECLARE @Grupos TABLE (StockGroupID INT PRIMARY KEY);
    INSERT INTO @Grupos (StockGroupID)
    SELECT DISTINCT TRY_CAST(value AS INT)
    FROM STRING_SPLIT(@StockGroupIDs, ',')
    WHERE TRY_CAST(value AS INT) IS NOT NULL;

    IF NOT EXISTS (SELECT 1 FROM @Grupos)
       OR EXISTS (SELECT 1 FROM @Grupos AS x
                  WHERE NOT EXISTS (SELECT 1 FROM dbo.GruposInventario AS g WHERE g.StockGroupID = x.StockGroupID))
        BEGIN RAISERROR('Uno o más grupos indicados no existen.', 16, 3); RETURN; END

    BEGIN TRY
        BEGIN TRANSACTION;

        /* Tipo 4 (dentro de la transacción + bloqueo): evita que dos usuarios
           creen al mismo tiempo un producto con el mismo nombre. */
        IF EXISTS (SELECT 1 FROM dbo.ProductosActuales WITH (UPDLOCK, HOLDLOCK)
                   WHERE StockItemName = @StockItemName)
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR('Ya existe un producto con ese nombre.', 16, 4);
            RETURN;
        END

        DECLARE @Nuevo TABLE (StockItemID INT);

        INSERT INTO dbo.ProductosActuales
        (
            StockItemName, SupplierID, ColorID, UnitPackageID, OuterPackageID,
            Brand, Size, LeadTimeDays, QuantityPerOuter, IsChillerStock, Barcode,
            TaxRate, UnitPrice, RecommendedRetailPrice, TypicalWeightPerUnit,
            MarketingComments, InternalComments, CustomFields, LastEditedBy
        )
        OUTPUT inserted.StockItemID INTO @Nuevo (StockItemID)
        VALUES
        (
            @StockItemName, @SupplierID, @ColorID, @UnitPackageID, @OuterPackageID,
            @Brand, @Size, @LeadTimeDays, @QuantityPerOuter, @IsChillerStock, @Barcode,
            @TaxRate, @UnitPrice, @RecommendedRetailPrice, @Weight,
            @MarketingComments, @InternalComments, @CustomFields, @LastEditedBy
        );

        DECLARE @NuevoID INT = (SELECT StockItemID FROM @Nuevo);

        /* Registro de inventario: sin esto el producto no aparecía en la tabla. */
        INSERT INTO dbo.ProductosInventario
        (
            StockItemID, QuantityOnHand, BinLocation, LastStocktakeQuantity,
            LastCostPrice, ReorderLevel, TargetStockLevel, LastEditedBy
        )
        VALUES
        (
            @NuevoID, ISNULL(@QuantityOnHand, 0), ISNULL(NULLIF(@BinLocation, ''), N'N/A'),
            ISNULL(@QuantityOnHand, 0), ISNULL(@LastCostPrice, @UnitPrice),
            ISNULL(@ReorderLevel, 0), ISNULL(@TargetStockLevel, 0), @LastEditedBy
        );

        /* Grupos del producto. */
        INSERT INTO dbo.ItemGrupos (StockItemID, StockGroupID, LastEditedBy)
        SELECT @NuevoID, StockGroupID, @LastEditedBy
        FROM @Grupos;

        COMMIT TRANSACTION;

        SELECT @NuevoID AS StockItemID, @StockItemName AS Producto;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO

/*---------------------------------------------------------------------------------------*
* NOMBRE: SP_Inventario_Actualizar
* DESCRIPCION: Modifica el producto, su inventario (holdings) y sus grupos.
*              Si el producto no tenía holdings, los crea.
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Actualizar
    @StockItemID            INT,
    @StockItemName          NVARCHAR(100),
    @SupplierID             INT,
    @ColorID                INT = NULL,
    @UnitPackageID          INT,
    @OuterPackageID         INT,
    @Brand                  NVARCHAR(50) = NULL,
    @Size                   NVARCHAR(20) = NULL,
    @LeadTimeDays           INT,
    @QuantityPerOuter       INT,
    @IsChillerStock         BIT,
    @Barcode                NVARCHAR(50) = NULL,
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
    @LastEditedBy           INT           = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @StockItemID IS NULL BEGIN RAISERROR('El StockItemID es obligatorio.', 16, 1); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM dbo.ProductosActuales WHERE StockItemID = @StockItemID)
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

    IF @LeadTimeDays < 0      BEGIN RAISERROR('Los días de entrega no pueden ser negativos.', 16, 2); RETURN; END
    IF @QuantityPerOuter <= 0 BEGIN RAISERROR('La cantidad por empaque debe ser mayor que cero.', 16, 2); RETURN; END
    IF @TaxRate < 0           BEGIN RAISERROR('La tasa de impuesto no puede ser negativa.', 16, 2); RETURN; END
    IF @UnitPrice < 0         BEGIN RAISERROR('El precio unitario no puede ser negativo.', 16, 2); RETURN; END
    IF @RecommendedRetailPrice < 0 BEGIN RAISERROR('El precio de venta recomendado no puede ser negativo.', 16, 2); RETURN; END
    IF @Weight < 0            BEGIN RAISERROR('El peso no puede ser negativo.', 16, 2); RETURN; END
    IF @QuantityOnHand < 0    BEGIN RAISERROR('La cantidad en inventario no puede ser negativa.', 16, 2); RETURN; END
    IF @LastCostPrice < 0     BEGIN RAISERROR('El costo no puede ser negativo.', 16, 2); RETURN; END

    IF NOT EXISTS (SELECT 1 FROM dbo.ProveedoresActuales WHERE SupplierID = @SupplierID)
        BEGIN RAISERROR('El proveedor indicado no existe.', 16, 3); RETURN; END
    IF @ColorID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.ColoresProductos WHERE ColorID = @ColorID)
        BEGIN RAISERROR('El color indicado no existe.', 16, 3); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM dbo.EmpaquetamientoInventario WHERE PackageTypeID = @UnitPackageID)
        BEGIN RAISERROR('El tipo de paquete por unidad indicado no existe.', 16, 3); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM dbo.EmpaquetamientoInventario WHERE PackageTypeID = @OuterPackageID)
        BEGIN RAISERROR('El tipo de paquete exterior indicado no existe.', 16, 3); RETURN; END

    DECLARE @Grupos TABLE (StockGroupID INT PRIMARY KEY);
    INSERT INTO @Grupos (StockGroupID)
    SELECT DISTINCT TRY_CAST(value AS INT)
    FROM STRING_SPLIT(@StockGroupIDs, ',')
    WHERE TRY_CAST(value AS INT) IS NOT NULL;

    IF NOT EXISTS (SELECT 1 FROM @Grupos)
       OR EXISTS (SELECT 1 FROM @Grupos AS x
                  WHERE NOT EXISTS (SELECT 1 FROM dbo.GruposInventario AS g WHERE g.StockGroupID = x.StockGroupID))
        BEGIN RAISERROR('Uno o más grupos indicados no existen.', 16, 3); RETURN; END

    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM dbo.ProductosActuales WITH (UPDLOCK, HOLDLOCK)
                   WHERE StockItemName = @StockItemName AND StockItemID <> @StockItemID)
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR('Ya existe otro producto con ese nombre.', 16, 4);
            RETURN;
        END

        UPDATE dbo.ProductosActuales
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
            CustomFields           = ISNULL(@CustomFields, CustomFields), -- no borra lo existente
            LastEditedBy           = @LastEditedBy
        WHERE StockItemID = @StockItemID;

        /* Holdings: si existe se actualiza, si no existe se crea. */
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
        ELSE
            INSERT INTO dbo.ProductosInventario
            (StockItemID, QuantityOnHand, BinLocation, LastStocktakeQuantity,
             LastCostPrice, ReorderLevel, TargetStockLevel, LastEditedBy)
            VALUES
            (@StockItemID, ISNULL(@QuantityOnHand, 0), ISNULL(NULLIF(@BinLocation, ''), N'N/A'),
             ISNULL(@QuantityOnHand, 0), ISNULL(@LastCostPrice, @UnitPrice),
             ISNULL(@ReorderLevel, 0), ISNULL(@TargetStockLevel, 0), @LastEditedBy);

        /* Grupos: se quitan los que ya no vienen y se agregan los nuevos. */
        DELETE ig
        FROM dbo.ItemGrupos AS ig
        WHERE ig.StockItemID = @StockItemID
          AND ig.StockGroupID NOT IN (SELECT StockGroupID FROM @Grupos);

        INSERT INTO dbo.ItemGrupos (StockItemID, StockGroupID, LastEditedBy)
        SELECT @StockItemID, x.StockGroupID, @LastEditedBy
        FROM @Grupos AS x
        WHERE NOT EXISTS (SELECT 1 FROM dbo.ItemGrupos AS ig
                          WHERE ig.StockItemID = @StockItemID AND ig.StockGroupID = x.StockGroupID);

        COMMIT TRANSACTION;

        SELECT @StockItemID AS StockItemID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO

/*---------------------------------------------------------------------------------------*
* NOMBRE: SP_Inventario_Eliminar
* DESCRIPCION: Elimina un producto que no tenga movimientos. Ahora el registro de
*              inventario (holdings) se borra junto con el producto, porque todo
*              producto nuevo tiene uno (antes eso bloqueaba la eliminación).
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Eliminar
    @StockItemID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @StockItemID IS NULL BEGIN RAISERROR('El StockItemID es obligatorio.', 16, 1); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM dbo.ProductosActuales WHERE StockItemID = @StockItemID)
        BEGIN RAISERROR('El producto que intenta eliminar no existe.', 16, 5); RETURN; END
    IF EXISTS (SELECT 1 FROM dbo.ProductosTransacciones WHERE StockItemID = @StockItemID)
        BEGIN RAISERROR('No se puede eliminar: el producto tiene transacciones registradas.', 16, 6); RETURN; END
    IF EXISTS (SELECT 1 FROM dbo.DetallesPedido WHERE StockItemID = @StockItemID)
        BEGIN RAISERROR('No se puede eliminar: el producto pertenece a uno o más pedidos.', 16, 6); RETURN; END
    IF EXISTS (SELECT 1 FROM dbo.DetallesFactura WHERE StockItemID = @StockItemID)
        BEGIN RAISERROR('No se puede eliminar: el producto pertenece a una o más facturas.', 16, 6); RETURN; END
    IF EXISTS (SELECT 1 FROM Purchasing.PurchaseOrderLines WHERE StockItemID = @StockItemID)
        BEGIN RAISERROR('No se puede eliminar: el producto pertenece a órdenes de compra.', 16, 6); RETURN; END
    IF EXISTS (SELECT 1 FROM Sales.SpecialDeals WHERE StockItemID = @StockItemID)
        BEGIN RAISERROR('No se puede eliminar: el producto tiene ofertas especiales.', 16, 6); RETURN; END

    BEGIN TRY
        BEGIN TRANSACTION;
        DELETE FROM dbo.ItemGrupos          WHERE StockItemID = @StockItemID;
        DELETE FROM dbo.ProductosInventario WHERE StockItemID = @StockItemID;
        DELETE FROM dbo.ProductosActuales   WHERE StockItemID = @StockItemID;
        COMMIT TRANSACTION;

        SELECT @StockItemID AS StockItemID_Eliminado;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO

/*---------------------------------------------------------------------------------------*
* NOMBRE: SP_Inventario_Opciones
* DESCRIPCION: Listas del formulario. Se agrega la lista de grupos (4to resultado).
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Opciones
AS
BEGIN
    SET NOCOUNT ON;
    SELECT SupplierID AS ID, SupplierName AS Nombre FROM dbo.ProveedoresActuales ORDER BY SupplierName;
    SELECT ColorID AS ID, ColorName AS Nombre FROM dbo.ColoresProductos ORDER BY ColorName;
    SELECT PackageTypeID AS ID, PackageTypeName AS Nombre FROM dbo.EmpaquetamientoInventario ORDER BY PackageTypeName;
    SELECT StockGroupID AS ID, StockGroupName AS Nombre FROM dbo.GruposInventario ORDER BY StockGroupName;
END
GO

/*---------------------------------------------------------------------------------------*
* PRUEBAS RÁPIDAS (ejecutar en SSMS para verificar)
*-----------------------------------------------------------------------------------------*
EXEC dbo.SP_Inventarios_Listar @Pagina = 1, @TamanoPagina = 10;
EXEC dbo.SP_Inventarios_Listar @Nombre = N'mug', @Pagina = 2;
EXEC dbo.SP_Inventarios_Resumen;

EXEC dbo.SP_Inventario_Insertar
     @StockItemName = N'Producto prueba PY2', @SupplierID = 1, @UnitPackageID = 7,
     @OuterPackageID = 7, @LeadTimeDays = 7, @QuantityPerOuter = 1, @IsChillerStock = 0,
     @TaxRate = 15, @UnitPrice = 10, @Weight = 0.5, @StockGroupIDs = N'1,2',
     @QuantityOnHand = 50, @BinLocation = N'L-1';

EXEC dbo.SP_Inventarios_Listar @Nombre = N'prueba PY2';   -- ahora SÍ aparece
*/
