USE WideWorldImporters;

GO

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Procedimientos almacenados del módulo de inventario
*
* DESCRIPCION: Contiene los procedimientos utilizados para listar, consultar,
*              insertar, actualizar y eliminar productos del inventario.
*
* TIPOS DE ERROR:
*     1 = falta un dato obligatorio o el formato es malo
*     2 = valor fuera de rango
*     3 = un registro relacionado no existe
*     4 = duplicado
*     5 = el inventario no existe
*     6 = el inventario tiene registros relacionados y no se puede borrar
*
*-----------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Inventarios_Listar
*
* DESCRIPCION: Devuelve la lista de productos para la tabla principal del inventario.
*              Permite filtrar por nombre, grupo y cantidad disponible.
*
* ENTRADA:
*     @Nombre    nombre o parte del nombre del producto.
*     @Grupo     nombre o parte del grupo de inventario.
*     @Cantidad  cantidad mínima disponible.
*
* SALIDA: Lista de productos con su identificador, nombre, grupo y cantidad disponible.
*
* RESTRICCIONES: Los filtros son opcionales. La cantidad devuelve productos
*                cuya existencia sea mayor o igual al valor indicado.
*
* OBJETIVO: Obtener los productos del inventario para mostrarlos en la tabla principal.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventarios_Listar
    @Nombre NVARCHAR(100) = NULL,
    @Grupo NVARCHAR(100) = NULL,
    @Cantidad INT
AS
BEGIN
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT
        pto.StockItemID,
        pto.StockItemName AS Producto,

        /* Agrupa los grupos asociados al mismo producto. */
        STRING_AGG(g.StockGroupName, ', ')
            WITHIN GROUP (ORDER BY g.StockGroupName)
            AS Grupo,

        pi.QuantityOnHand AS Cantidad_Inventario

    FROM dbo.ProductosActuales AS pto

    /* Relaciona el producto con sus grupos de inventario. */
    INNER JOIN dbo.ItemGrupos AS ig
        ON pto.StockItemID = ig.StockItemID

    INNER JOIN dbo.GruposInventario AS g
        ON ig.StockGroupID = g.StockGroupID

    /* Obtiene la cantidad disponible del producto. */
    INNER JOIN dbo.ProductosInventario AS pi
        ON pto.StockItemID = pi.StockItemID

    WHERE
        (@Nombre IS NULL OR pto.StockItemName LIKE '%' + @Nombre + '%')
        AND
        (@Grupo IS NULL OR g.StockGroupName LIKE '%' + @Grupo + '%')
        AND
        (@Cantidad IS NULL OR pi.QuantityOnHand >= @Cantidad)

    GROUP BY
        pto.StockItemID,
        pto.StockItemName,
        pi.QuantityOnHand

    /* Ordena los productos alfabéticamente. */
    ORDER BY pto.StockItemName ASC;
END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Inventarios_Detalle
*
* DESCRIPCION: Devuelve toda la información disponible de uno o varios productos.
*
* ENTRADA:
*     @StockItemID  identificador o lista de identificadores de productos.
*
* SALIDA: Información detallada del producto, proveedor, color, empaquetamiento,
*         precios, peso, cantidad disponible y ubicación.
*
* RESTRICCIONES: Los identificadores deben ser valores numéricos separados por coma.
*
* OBJETIVO: Obtener la información completa de un producto para mostrarla en su detalle.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventarios_Detalle
    @StockItemID NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT
        pto.StockItemID,
        pto.StockItemName AS Producto,
        p.SupplierID AS Proveedor_ID,
        p.SupplierName AS Proveedor,

        /* Si el color está vacío, muestra un texto descriptivo. */
        ISNULL(NULLIF(LTRIM(RTRIM(c.ColorName)), ''), 'Color sin definir') AS Color,

        /* Si la marca está vacía, muestra un texto descriptivo. */
        ISNULL(NULLIF(LTRIM(RTRIM(pto.Brand)), ''), 'Marca sin definir') AS Marca,

        e.PackageTypeName AS Unidad_Empaquetamiento,
        em.PackageTypeName AS Empaquetamiento,
        pto.QuantityPerOuter AS Cantidad_Empaquetamiento,
        pto.Size AS Talla,

        /* Calcula el impuesto correspondiente al precio unitario. */
        ROUND(pto.UnitPrice * (pto.TaxRate / 100.0), 2) AS Impuesto,

        pto.UnitPrice AS Precio_Unitario,
        pto.RecommendedRetailPrice AS Precio_Venta,
        pto.TypicalWeightPerUnit AS Peso,
        pto.SearchDetails AS Palabras_Clave,
        pi.QuantityOnHand AS Cantidad_Disponible,
        pi.BinLocation AS Ubicacion

    FROM dbo.ProductosActuales AS pto

    /* Obtiene la información del proveedor. */
    INNER JOIN dbo.ProveedoresActuales AS p
        ON pto.SupplierID = p.SupplierID

    /* El color es opcional. */
    LEFT JOIN dbo.ColoresProductos AS c
        ON pto.ColorID = c.ColorID

    /* Obtiene los tipos de empaquetamiento. */
    INNER JOIN dbo.EmpaquetamientoInventario e
        ON pto.UnitPackageID = e.PackageTypeID

    INNER JOIN dbo.EmpaquetamientoInventario AS em
        ON pto.OuterPackageID = em.PackageTypeID

    /* Obtiene la cantidad y ubicación del inventario. */
    INNER JOIN dbo.ProductosInventario AS pi
        ON pto.StockItemID = pi.StockItemID

    WHERE pto.StockItemID IN
    (
        /* Permite recibir uno o varios IDs separados por coma. */
        SELECT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@StockItemID, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL
    );
END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Inventario_Insertar
*
* DESCRIPCION: Registra un nuevo producto en el inventario.
*
* ENTRADA: Datos generales del producto, proveedor, empaquetamiento, precios,
*          características y usuario que realiza el registro.
*
* SALIDA: Identificador del nuevo producto.
*
* RESTRICCIONES: Verifica datos obligatorios, rangos válidos, registros relacionados
*                existentes y que no exista otro producto con el mismo nombre.
*
* OBJETIVO: Crear un nuevo producto de forma segura utilizando una transacción.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Insertar
    @StockItemName NVARCHAR(100),
    @SupplierID INT,
    @ColorID INT,
    @UnitPackageID INT,
    @OuterPackageID INT,
    @Brand NVARCHAR(50),
    @Size NVARCHAR(20),
    @LeadTimeDays INT,
    @QuantityPerOuter INT,
    @IsChillerStock BIT,
    @Barcode NVARCHAR(50),
    @TaxRate DECIMAL(18,3),
    @UnitPrice DECIMAL(18,2),
    @RecommendedRetailPrice DECIMAL(18,2),
    @Weight DECIMAL(18,3),
    @MarketingComments NVARCHAR(MAX),
    @InternalComments NVARCHAR(MAX),
    @Photo VARBINARY(MAX),
    @CustomFields NVARCHAR(MAX),
    @LastEditedBy INT = 1
AS
BEGIN

    /* Verifica los datos obligatorios. */
    IF @StockItemName IS NULL
    BEGIN
        RAISERROR('El nombre del producto es obligatorio.', 16, 1);
        RETURN;
    END

    IF @SupplierID IS NULL
    BEGIN
        RAISERROR('El proveedor es obligatorio.', 16, 1);
        RETURN;
    END

    IF @UnitPackageID IS NULL
    BEGIN
        RAISERROR('El paquete por unidad es obligatorio.', 16, 1);
        RETURN;
    END

    IF @OuterPackageID IS NULL
    BEGIN
        RAISERROR('El paquete exterior es obligatorio.', 16, 1);
        RETURN;
    END

    IF @LeadTimeDays IS NULL
    BEGIN
        RAISERROR('Los días de entrega son obligatorios.', 16, 1);
        RETURN;
    END

    IF @QuantityPerOuter IS NULL
    BEGIN
        RAISERROR('La cantidad por empaque es obligatoria.', 16, 1);
        RETURN;
    END

    IF @IsChillerStock IS NULL
    BEGIN
        RAISERROR('El indicador de almacenamiento refrigerado es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TaxRate IS NULL
    BEGIN
        RAISERROR('La tasa de impuesto es obligatoria.', 16, 1);
        RETURN;
    END

    IF @UnitPrice IS NULL
    BEGIN
        RAISERROR('El precio unitario es obligatorio.', 16, 1);
        RETURN;
    END

    IF @Weight IS NULL
    BEGIN
        RAISERROR('El peso es obligatorio.', 16, 1);
        RETURN;
    END

    /* Verifica que los valores numéricos estén dentro de rangos válidos. */
    IF @LeadTimeDays < 0
    BEGIN
        RAISERROR('Los días de entrega no pueden ser negativos.', 16, 2);
        RETURN;
    END

    IF @QuantityPerOuter <= 0
    BEGIN
        RAISERROR('La cantidad por empaque debe ser mayor que cero.', 16, 2);
        RETURN;
    END

    IF @TaxRate < 0
    BEGIN
        RAISERROR('La tasa de impuesto no puede ser negativa.', 16, 2);
        RETURN;
    END

    IF @UnitPrice < 0
    BEGIN
        RAISERROR('El precio unitario no puede ser negativo.', 16, 2);
        RETURN;
    END

    IF @RecommendedRetailPrice < 0
    BEGIN
        RAISERROR('El precio de venta recomendado no puede ser negativo.', 16, 2);
        RETURN;
    END

    IF @Weight < 0
    BEGIN
        RAISERROR('El peso no puede ser negativo.', 16, 2);
        RETURN;
    END

    /* Verifica que los registros relacionados existan. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProveedoresActuales
        WHERE SupplierID = @SupplierID
    )
    BEGIN
        RAISERROR('El proveedor indicado no existe.', 16, 3);
        RETURN;
    END

    IF @ColorID IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.ColoresProductos
            WHERE ColorID = @ColorID
        )
    BEGIN
        RAISERROR('El color indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.EmpaquetamientoInventario
        WHERE PackageTypeID = @UnitPackageID
    )
    BEGIN
        RAISERROR('El tipo de paquete por unidad indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.EmpaquetamientoInventario
        WHERE PackageTypeID = @OuterPackageID
    )
    BEGIN
        RAISERROR('El tipo de paquete exterior indicado no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que no exista otro producto con el mismo nombre. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ProductosActuales
        WHERE StockItemName = @StockItemName
    )
    BEGIN
        RAISERROR('Ya existe un producto con ese nombre.', 16, 4);
        RETURN;
    END

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* Inserta el nuevo producto. */
        INSERT INTO dbo.ProductosActuales
        (
            StockItemName,
            SupplierID,
            ColorID,
            UnitPackageID,
            OuterPackageID,
            Brand,
            Size,
            LeadTimeDays,
            QuantityPerOuter,
            IsChillerStock,
            Barcode,
            TaxRate,
            UnitPrice,
            RecommendedRetailPrice,
            TypicalWeightPerUnit,
            MarketingComments,
            InternalComments,
            Photo,
            CustomFields,
            LastEditedBy
        )
        VALUES
        (
            @StockItemName,
            @SupplierID,
            @ColorID,
            @UnitPackageID,
            @OuterPackageID,
            @Brand,
            @Size,
            @LeadTimeDays,
            @QuantityPerOuter,
            @IsChillerStock,
            @Barcode,
            @TaxRate,
            @UnitPrice,
            @RecommendedRetailPrice,
            @Weight,
            @MarketingComments,
            @InternalComments,
            @Photo,
            @CustomFields,
            @LastEditedBy
        );

        /* Obtiene el ID generado para el nuevo producto. */
        DECLARE @NuevoID INT;

        SELECT @NuevoID = StockItemID
        FROM dbo.ProductosActuales
        WHERE StockItemName = @StockItemName;

        COMMIT TRANSACTION;

        SELECT @NuevoID AS StockItemID;

    END TRY

    BEGIN CATCH

        /* Deshace la transacción si ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Inventario_Actualizar
*
* DESCRIPCION: Modifica la información de un producto existente.
*
* ENTRADA: ID del producto y sus nuevos datos.
*
* SALIDA: Identificador del producto actualizado.
*
* RESTRICCIONES: El producto debe existir. También se validan datos obligatorios,
*                rangos, relaciones y nombres duplicados.
*
* OBJETIVO: Actualizar un producto de forma segura utilizando una transacción.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Actualizar
    @StockItemID INT,
    @StockItemName NVARCHAR(100),
    @SupplierID INT,
    @ColorID INT,
    @UnitPackageID INT,
    @OuterPackageID INT,
    @Brand NVARCHAR(50),
    @Size NVARCHAR(20),
    @LeadTimeDays INT,
    @QuantityPerOuter INT,
    @IsChillerStock BIT,
    @Barcode NVARCHAR(50),
    @TaxRate DECIMAL(18,3),
    @UnitPrice DECIMAL(18,2),
    @RecommendedRetailPrice DECIMAL(18,2),
    @Weight DECIMAL(18,3),
    @MarketingComments NVARCHAR(MAX),
    @InternalComments NVARCHAR(MAX),
    @Photo VARBINARY(MAX),
    @CustomFields NVARCHAR(MAX),
    @LastEditedBy INT
AS
BEGIN

    /* Verifica que el producto exista. */
    IF @StockItemID IS NULL
    BEGIN
        RAISERROR('El StockItemID es obligatorio.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosActuales
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR('El producto que intenta actualizar no existe.', 16, 5);
        RETURN;
    END

    /* Verifica los datos obligatorios. */
    IF @StockItemName IS NULL
    BEGIN
        RAISERROR('El nombre del producto es obligatorio.', 16, 1);
        RETURN;
    END

    IF @SupplierID IS NULL
    BEGIN
        RAISERROR('El proveedor es obligatorio.', 16, 1);
        RETURN;
    END

    IF @UnitPackageID IS NULL
    BEGIN
        RAISERROR('El paquete por unidad es obligatorio.', 16, 1);
        RETURN;
    END

    IF @OuterPackageID IS NULL
    BEGIN
        RAISERROR('El paquete exterior es obligatorio.', 16, 1);
        RETURN;
    END

    IF @LeadTimeDays IS NULL
    BEGIN
        RAISERROR('Los días de entrega son obligatorios.', 16, 1);
        RETURN;
    END

    IF @QuantityPerOuter IS NULL
    BEGIN
        RAISERROR('La cantidad por empaque es obligatoria.', 16, 1);
        RETURN;
    END

    IF @IsChillerStock IS NULL
    BEGIN
        RAISERROR('El indicador de almacenamiento refrigerado es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TaxRate IS NULL
    BEGIN
        RAISERROR('La tasa de impuesto es obligatoria.', 16, 1);
        RETURN;
    END

    IF @UnitPrice IS NULL
    BEGIN
        RAISERROR('El precio unitario es obligatorio.', 16, 1);
        RETURN;
    END

    IF @Weight IS NULL
    BEGIN
        RAISERROR('El peso es obligatorio.', 16, 1);
        RETURN;
    END

    IF @LastEditedBy IS NULL
    BEGIN
        RAISERROR('El usuario que registra es obligatorio.', 16, 1);
        RETURN;
    END

    /* Valida los rangos permitidos. */
    IF @LeadTimeDays < 0
    BEGIN
        RAISERROR('Los días de entrega no pueden ser negativos.', 16, 2);
        RETURN;
    END

    IF @QuantityPerOuter <= 0
    BEGIN
        RAISERROR('La cantidad por empaque debe ser mayor que cero.', 16, 2);
        RETURN;
    END

    IF @TaxRate < 0
    BEGIN
        RAISERROR('La tasa de impuesto no puede ser negativa.', 16, 2);
        RETURN;
    END

    IF @UnitPrice < 0
    BEGIN
        RAISERROR('El precio unitario no puede ser negativo.', 16, 2);
        RETURN;
    END

    IF @RecommendedRetailPrice < 0
    BEGIN
        RAISERROR('El precio de venta recomendado no puede ser negativo.', 16, 2);
        RETURN;
    END

    IF @Weight < 0
    BEGIN
        RAISERROR('El peso no puede ser negativo.', 16, 2);
        RETURN;
    END

    /* Verifica que los registros relacionados existan. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProveedoresActuales
        WHERE SupplierID = @SupplierID
    )
    BEGIN
        RAISERROR('El proveedor indicado no existe.', 16, 3);
        RETURN;
    END

    IF @ColorID IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.ColoresProductos
            WHERE ColorID = @ColorID
        )
    BEGIN
        RAISERROR('El color indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.EmpaquetamientoInventario
        WHERE PackageTypeID = @UnitPackageID
    )
    BEGIN
        RAISERROR('El tipo de paquete por unidad indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.EmpaquetamientoInventario
        WHERE PackageTypeID = @OuterPackageID
    )
    BEGIN
        RAISERROR('El tipo de paquete exterior indicado no existe.', 16, 3);
        RETURN;
    END

    /* Evita que dos productos tengan el mismo nombre. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ProductosActuales
        WHERE StockItemName = @StockItemName
          AND StockItemID <> @StockItemID
    )
    BEGIN
        RAISERROR('Ya existe un producto con ese nombre.', 16, 4);
        RETURN;
    END

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* Actualiza los datos del producto. */
        UPDATE dbo.ProductosActuales
        SET
            StockItemName = @StockItemName,
            SupplierID = @SupplierID,
            ColorID = @ColorID,
            UnitPackageID = @UnitPackageID,
            OuterPackageID = @OuterPackageID,
            Brand = @Brand,
            Size = @Size,
            LeadTimeDays = @LeadTimeDays,
            QuantityPerOuter = @QuantityPerOuter,
            IsChillerStock = @IsChillerStock,
            Barcode = @Barcode,
            TaxRate = @TaxRate,
            UnitPrice = @UnitPrice,
            RecommendedRetailPrice = @RecommendedRetailPrice,
            TypicalWeightPerUnit = @Weight,
            MarketingComments = @MarketingComments,
            InternalComments = @InternalComments,
            Photo = @Photo,
            CustomFields = @CustomFields,
            LastEditedBy = @LastEditedBy
        WHERE StockItemID = @StockItemID;

        COMMIT TRANSACTION;

        SELECT @StockItemID AS StockItemID;

    END TRY

    BEGIN CATCH

        /* Deshace la transacción si ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Inventario_Eliminar
*
* DESCRIPCION: Elimina un producto del inventario cuando no posee registros
*              relacionados que impidan su eliminación.
*
* ENTRADA: @StockItemID  identificador del producto que se desea eliminar.
*
* SALIDA: Identificador del producto eliminado.
*
* RESTRICCIONES: No permite eliminar productos con transacciones, inventario,
*                pedidos o facturas relacionados.
*
* OBJETIVO: Eliminar el producto y sus relaciones con grupos de inventario
*           de forma segura mediante una transacción.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Eliminar
    @StockItemID INT
AS
BEGIN

    /* Verifica que se haya proporcionado un identificador. */
    IF @StockItemID IS NULL
    BEGIN
        RAISERROR('El StockItemID es obligatorio.', 16, 1);
        RETURN;
    END

    /* Verifica que el producto exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosActuales
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR('El producto que intenta eliminar no existe.', 16, 5);
        RETURN;
    END

    /* Verifica si el producto tiene transacciones. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ProductosTransacciones
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el producto tiene transacciones registradas.',
            16,
            6
        );
        RETURN;
    END

    /* Verifica si el producto tiene registros de inventario. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ProductosInventario
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el producto tiene registros de inventario.',
            16,
            6
        );
        RETURN;
    END

    /* Verifica si el producto pertenece a pedidos. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.DetallesPedido
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el producto pertenece a uno o más pedidos.',
            16,
            6
        );
        RETURN;
    END

    /* Verifica si el producto pertenece a facturas. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.DetallesFactura
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el producto pertenece a una o más facturas.',
            16,
            6
        );
        RETURN;
    END

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* Elimina las relaciones del producto con los grupos. */
        DELETE FROM dbo.ItemGrupos
        WHERE StockItemID = @StockItemID;

        /* Elimina el producto. */
        DELETE FROM dbo.ProductosActuales
        WHERE StockItemID = @StockItemID;

        COMMIT TRANSACTION;

        SELECT @StockItemID AS StockItemID_Eliminado;

    END TRY

    BEGIN CATCH

        /* Deshace la transacción si ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Inventario_Opciones
*
* DESCRIPCION: Obtiene las opciones necesarias para llenar los campos
*              desplegables del formulario de inventario.
*
* ENTRADA: No recibe parámetros.
*
* SALIDA: Devuelve tres conjuntos de resultados:
*         proveedores, colores y tipos de paquete.
*
* RESTRICCIONES: Las opciones se obtienen directamente de los registros
*                disponibles en la base de datos.
*
* OBJETIVO: Proporcionar al frontend las opciones necesarias para crear
*           o editar productos.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_Opciones
AS
BEGIN
    SET NOCOUNT ON;

    /* 1. Proveedores disponibles. */
    SELECT
        SupplierID AS ID,
        SupplierName AS Nombre
    FROM dbo.ProveedoresActuales
    ORDER BY SupplierName;

    /* 2. Colores disponibles. */
    SELECT
        ColorID AS ID,
        ColorName AS Nombre
    FROM dbo.ColoresProductos
    ORDER BY ColorName;

    /* 3. Tipos de paquete disponibles. */
    SELECT
        PackageTypeID AS ID,
        PackageTypeName AS Nombre
    FROM dbo.EmpaquetamientoInventario
    ORDER BY PackageTypeName;
END;

GO