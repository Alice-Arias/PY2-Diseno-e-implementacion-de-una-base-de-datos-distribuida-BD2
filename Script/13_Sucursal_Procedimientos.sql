/*---------------------------------------------------------------------------------------*
* NOMBRE: 13_Sucursal_Procedimientos.sql
* ENTRADA: Los sinónimos del 12.
* DESCRIPCION: Procedimientos del Administrador: consulta de clientes, proveedores e inventario,
*   y ventas. Los datos sensibles salen como "xxxx".
* SALIDA: Procedimientos SP_ de la sucursal con permiso para app_admin.
* OBJETIVO: Usar los procedimientos del Proyecto 1 sobre los fragmentos.
* EJECUTAR: En cada sucursal, después del 12. Se puede repetir.
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
* SP_Clientes_Listar: lista filtrada y paginada de clientes
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Listar
    /* CORREGIDO PY2: pagina en SQL (OFFSET/FETCH). Resultado 1 = filas de la página,
       resultado 2 = datos de paginación. */
    @Nombre        NVARCHAR(100) = NULL,
    @Categoria     NVARCHAR(100) = NULL,
    @MetodoEntrega NVARCHAR(100) = NULL,
    @Pagina        INT           = 1,
    @TamanoPagina  INT           = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF @Pagina IS NULL OR @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    SELECT
        c.CustomerID,
        c.CustomerName           AS Nombre_Cliente,
        cat.CustomerCategoryName AS Categoria_Cliente,
        dm.DeliveryMethodName    AS Metodo_Entrega
    INTO #Filtrados
    FROM dbo.ClientesActuales AS c
    INNER JOIN dbo.TiposCliente AS cat ON c.CustomerCategoryID = cat.CustomerCategoryID
    INNER JOIN dbo.FormasEntrega AS dm ON c.DeliveryMethodID = dm.DeliveryMethodID
    WHERE
        (@Nombre IS NULL OR c.CustomerName LIKE '%' + @Nombre + '%')
        AND (@Categoria IS NULL OR cat.CustomerCategoryName LIKE '%' + @Categoria + '%')
        AND (@MetodoEntrega IS NULL OR dm.DeliveryMethodName LIKE '%' + @MetodoEntrega + '%');

    DECLARE @Total INT = @@ROWCOUNT;
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;

    /* Si la página pedida ya no existe (ej. se borró el último registro), se ajusta. */
    IF @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    SELECT CustomerID, Nombre_Cliente, Categoria_Cliente, Metodo_Entrega
    FROM #Filtrados
    ORDER BY Nombre_Cliente ASC, CustomerID ASC
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;

    SELECT @Total AS Total_Registros, @Pagina AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Clientes_Resumen: totales de las tarjetas y listas de filtros
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Resumen
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*) FROM dbo.ClientesActuales) AS Total_Clientes,
        (SELECT COUNT(DISTINCT CustomerCategoryID) FROM dbo.ClientesActuales) AS Total_Categorias;

    SELECT DISTINCT cat.CustomerCategoryName AS Nombre
    FROM dbo.ClientesActuales AS c
    INNER JOIN dbo.TiposCliente AS cat ON c.CustomerCategoryID = cat.CustomerCategoryID
    ORDER BY Nombre;

    SELECT DISTINCT dm.DeliveryMethodName AS Nombre
    FROM dbo.ClientesActuales AS c
    INNER JOIN dbo.FormasEntrega AS dm ON c.DeliveryMethodID = dm.DeliveryMethodID
    ORDER BY Nombre;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Clientes_Opciones: listas del formulario de clientes
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Opciones
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CustomerCategoryID AS ID, CustomerCategoryName AS Nombre
    FROM dbo.TiposCliente ORDER BY CustomerCategoryName;

    SELECT BuyingGroupID AS ID, BuyingGroupName AS Nombre
    FROM dbo.GruposCompradores ORDER BY BuyingGroupName;

    SELECT PersonID AS ID, FullName AS Nombre
    FROM dbo.Contactos WHERE IsSalesperson = 0 ORDER BY FullName;

    SELECT CustomerID AS ID, CustomerName AS Nombre
    FROM dbo.ClientesActuales ORDER BY CustomerName;

    SELECT DeliveryMethodID AS ID, DeliveryMethodName AS Nombre
    FROM dbo.FormasEntrega ORDER BY DeliveryMethodName;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Proveedores_Listar: lista filtrada y paginada de proveedores
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Listar
    /* CORREGIDO PY2: pagina en SQL (OFFSET/FETCH). Resultado 1 = filas de la página,
       resultado 2 = datos de paginación. */
    @Nombre        NVARCHAR(100) = NULL,
    @Categoria     NVARCHAR(100) = NULL,
    @MetodoEntrega NVARCHAR(100) = NULL,
    @Pagina        INT           = 1,
    @TamanoPagina  INT           = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF @Pagina IS NULL OR @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    SELECT
        p.SupplierID,
        p.SupplierName           AS Nombre_Proveedor,
        cat.SupplierCategoryName AS Categoria_Proveedor,
        dm.DeliveryMethodName    AS Metodo_Entrega
    INTO #Filtrados
    FROM dbo.ProveedoresActuales AS p
    INNER JOIN dbo.CategoriaProveedores AS cat ON p.SupplierCategoryID = cat.SupplierCategoryID
    INNER JOIN dbo.FormasEntrega AS dm ON p.DeliveryMethodID = dm.DeliveryMethodID
    WHERE
        (@Nombre IS NULL OR p.SupplierName LIKE '%' + @Nombre + '%')
        AND (@Categoria IS NULL OR cat.SupplierCategoryName LIKE '%' + @Categoria + '%')
        AND (@MetodoEntrega IS NULL OR dm.DeliveryMethodName LIKE '%' + @MetodoEntrega + '%');

    DECLARE @Total INT = @@ROWCOUNT;
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;

    /* Si la página pedida ya no existe (ej. se borró el último registro), se ajusta. */
    IF @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    SELECT SupplierID, Nombre_Proveedor, Categoria_Proveedor, Metodo_Entrega
    FROM #Filtrados
    ORDER BY Nombre_Proveedor ASC, SupplierID ASC
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;

    SELECT @Total AS Total_Registros, @Pagina AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Proveedores_Resumen: totales de las tarjetas y listas de filtros
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Resumen
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*) FROM dbo.ProveedoresActuales) AS Total_Proveedores,
        (SELECT COUNT(DISTINCT SupplierCategoryID) FROM dbo.ProveedoresActuales) AS Total_Categorias;

    SELECT DISTINCT cat.SupplierCategoryName AS Nombre
    FROM dbo.ProveedoresActuales AS p
    INNER JOIN dbo.CategoriaProveedores AS cat ON p.SupplierCategoryID = cat.SupplierCategoryID
    ORDER BY Nombre;

    SELECT DISTINCT dm.DeliveryMethodName AS Nombre
    FROM dbo.ProveedoresActuales AS p
    INNER JOIN dbo.FormasEntrega AS dm ON p.DeliveryMethodID = dm.DeliveryMethodID
    ORDER BY Nombre;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Proveedores_Opciones: listas del formulario de proveedores
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Opciones
AS
BEGIN
    SET NOCOUNT ON;

    SELECT SupplierCategoryID AS ID, SupplierCategoryName AS Nombre
    FROM dbo.CategoriaProveedores ORDER BY SupplierCategoryName;

    SELECT PersonID AS ID, FullName AS Nombre
    FROM dbo.Contactos WHERE IsSalesperson = 0 ORDER BY FullName;

    SELECT DeliveryMethodID AS ID, DeliveryMethodName AS Nombre
    FROM dbo.FormasEntrega ORDER BY DeliveryMethodName;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Ciudades_Buscar: busca ciudades por texto (máximo 20)
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ciudades_Buscar
    @Texto  NVARCHAR(50) = NULL,
    @CityID INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @CityID IS NOT NULL
    BEGIN
        SELECT c.CityID AS ID,
               c.CityName + N', ' + sp.StateProvinceName AS Nombre
        FROM dbo.Ciudades AS c
        INNER JOIN Application.StateProvinces AS sp ON c.StateProvinceID = sp.StateProvinceID
        WHERE c.CityID = @CityID;
        RETURN;
    END

    SET @Texto = LTRIM(RTRIM(ISNULL(@Texto, N'')));

    IF LEN(@Texto) < 2
    BEGIN
        SELECT CAST(NULL AS INT) AS ID, CAST(NULL AS NVARCHAR(100)) AS Nombre WHERE 1 = 0;
        RETURN;
    END

    /* Primero las que EMPIEZAN con el texto, luego las que lo CONTIENEN. */
    SELECT TOP (20)
        c.CityID AS ID,
        c.CityName + N', ' + sp.StateProvinceName AS Nombre
    FROM dbo.Ciudades AS c
    INNER JOIN Application.StateProvinces AS sp ON c.StateProvinceID = sp.StateProvinceID
    WHERE c.CityName LIKE N'%' + @Texto + N'%'
    ORDER BY
        CASE WHEN c.CityName LIKE @Texto + N'%' THEN 0 ELSE 1 END,
        c.CityName,
        sp.StateProvinceName;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Inventarios_Listar: lista filtrada y paginada de productos
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
* SP_Inventarios_Resumen: totales de las tarjetas y grupos
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
* SP_Inventarios_Detalle: detalle de productos; "Version" sirve para saber
* si otro usuario cambió el producto antes de guardar
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Inventarios_Detalle
    @StockItemID NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pto.StockItemID,
        pto.StockItemName AS Producto,
        CONVERT(NVARCHAR(30), pto.ValidFrom, 126) AS Version,   -- control de concurrencia
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
* SP_Inventario_Opciones: listas del formulario de productos
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
* SP_Ventas_Listar: lista filtrada y paginada de las facturas de esta sucursal
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Listar
    @NumeroFactura  INT           = NULL,
    @FechaInicio    DATE          = NULL,
    @FechaFin       DATE          = NULL,
    @Cliente        NVARCHAR(100) = NULL,
    @DeliveryMethod NVARCHAR(50)  = NULL,
    @MontoInicio    DECIMAL(18,2) = NULL,
    @MontoFin       DECIMAL(18,2) = NULL,
    @Pagina         INT           = 1,
    @TamanoPagina   INT           = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF @Pagina IS NULL OR @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    /* 1. Facturas que cumplen los filtros, con su monto. */
    SELECT
        f.InvoiceID,
        f.InvoiceDate,
        f.CustomerID,
        c.CustomerName,
        fe.DeliveryMethodName,
        SUM(df.ExtendedPrice) AS Monto
    INTO #Filtradas
    FROM dbo.Facturas AS f
    INNER JOIN dbo.ClientesActuales AS c  ON f.CustomerID = c.CustomerID
    INNER JOIN dbo.FormasEntrega    AS fe ON f.DeliveryMethodID = fe.DeliveryMethodID
    INNER JOIN dbo.DetalleFacturas  AS df ON f.InvoiceID = df.InvoiceID
    WHERE
        (@NumeroFactura  IS NULL OR f.InvoiceID = @NumeroFactura)
        AND (@FechaInicio    IS NULL OR f.InvoiceDate >= @FechaInicio)
        AND (@FechaFin       IS NULL OR f.InvoiceDate <= @FechaFin)
        AND (@Cliente        IS NULL OR c.CustomerName LIKE '%' + @Cliente + '%')
        AND (@DeliveryMethod IS NULL OR fe.DeliveryMethodName LIKE '%' + @DeliveryMethod + '%')
    GROUP BY f.InvoiceID, f.InvoiceDate, f.CustomerID, c.CustomerName, fe.DeliveryMethodName
    HAVING
        (@MontoInicio IS NULL OR SUM(df.ExtendedPrice) >= @MontoInicio)
        AND (@MontoFin IS NULL OR SUM(df.ExtendedPrice) <= @MontoFin)
    OPTION (RECOMPILE); -- plan adecuado según qué filtros vienen en NULL

    DECLARE @Total INT = @@ROWCOUNT;
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;

    IF @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* 2. Solo la página pedida (orden por cliente, desempate por factura). */
    SELECT
        InvoiceID,
        InvoiceDate        AS Fecha_Factura,
        CustomerName       AS Nombre_Cliente,
        DeliveryMethodName AS Metodo_Entrega,
        Monto
    FROM #Filtradas
    ORDER BY CustomerName ASC, InvoiceID ASC
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;

    /* 3. Paginación y estadísticas (antes se calculaban en React con reduce/Set). */
    SELECT
        @Total        AS Total_Registros,
        @Pagina       AS Pagina,
        @TamanoPagina AS Tamano_Pagina,
        @TotalPaginas AS Total_Paginas,
        ISNULL((SELECT SUM(Monto) FROM #Filtradas), 0)                AS Monto_Total,
        (SELECT COUNT(DISTINCT CustomerID) FROM #Filtradas)           AS Clientes_Unicos;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Ventas_Detalle: encabezado y líneas de una factura
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Detalle
    @InvoiceID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    /* Encabezado de la factura. */
    SELECT
        f.InvoiceID,
        f.CustomerID,
        ca.CustomerName AS Nombre_Cliente,
        f.BillToCustomerID,
        bc.CustomerName AS Nombre_Cliente_Facturar,
        f.OrderID,
        f.DeliveryMethodID,
        fe.DeliveryMethodName AS Metodo_Entrega,
        f.ContactPersonID,
        cts.FullName AS Persona_Contacto,
        f.AccountsPersonID,
        acc.FullName AS Persona_Cuentas,
        f.SalespersonPersonID,
        ctos.FullName AS Vendedor,
        f.PackedByPersonID,
        pbp.FullName AS Empacado_Por,
        f.InvoiceDate AS Fecha_Factura,
        f.CustomerPurchaseOrderNumber AS Numero_Orden,
        f.IsCreditNote,
        f.CreditNoteReason,
        f.Comments,
        f.DeliveryInstructions AS Intrucciones_Entrega,
        f.InternalComments,
        f.TotalDryItems,
        f.TotalChillerItems,
        f.DeliveryRun,
        f.RunPosition,
        f.ReturnedDeliveryData
    FROM dbo.Facturas f
    INNER JOIN dbo.ClientesActuales AS ca 
        ON f.CustomerID = ca.CustomerID
    LEFT JOIN dbo.ClientesActuales AS bc 
        ON f.BillToCustomerID = bc.CustomerID
    INNER JOIN dbo.FormasEntrega AS fe 
        ON f.DeliveryMethodID = fe.DeliveryMethodID
    INNER JOIN dbo.Contactos AS cts 
        ON f.ContactPersonID = cts.PersonID
    LEFT JOIN dbo.Contactos AS acc 
        ON f.AccountsPersonID = acc.PersonID
    INNER JOIN dbo.Contactos AS ctos 
        ON f.SalespersonPersonID = ctos.PersonID
    LEFT JOIN dbo.Contactos AS pbp 
        ON f.PackedByPersonID = pbp.PersonID
    WHERE f.InvoiceID = @InvoiceID;

    /* Detalle de productos de la factura. */
    SELECT
        pa.StockItemID,
        pa.StockItemName AS Producto,
        df.Description,
        df.PackageTypeID,
        df.Quantity AS Cantidad,
        df.UnitPrice AS Precio_Unitario,
        df.TaxRate AS Impuesto_Aplicado,
        df.TaxAmount AS Impuesto_Monto,
        df.ExtendedPrice AS Total_Linea
    FROM dbo.DetalleFacturas df
    INNER JOIN dbo.ProductosActuales AS pa 
        ON df.StockItemID = pa.StockItemID
    WHERE df.InvoiceID = @InvoiceID;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Ventas_Insertar: crea la factura; el número sale de la secuencia de la
* sucursal (se obtiene con OUTPUT)
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Insertar

    /* Datos de la factura. */
    @CustomerID INT,
    @BillToCustomerID INT,
    @OrderID INT,
    @DeliveryMethod INT,
    @ContactPersonID INT,
    @AccountsPersonID INT,
    @SalespersonPersonID INT,
    @PackedByPersonID INT,
    @InvoiceDate DATE,
    @CustomerPurchaseOrderNumber NVARCHAR(20),
    @IsCreditNote BIT,
    @CreditNoteReason NVARCHAR(MAX),
    @Comments NVARCHAR(MAX),
    @DeliveryInstructions NVARCHAR(MAX),
    @InternalComments NVARCHAR(MAX),
    @TotalDryItems INT,
    @TotalChillerItems INT,
    @DeliveryRun NVARCHAR(5),
    @RunPosition NVARCHAR(5),
    @ReturnedDeliveryData NVARCHAR(MAX),
    @LastEditedBy INT = 1,

    /* Datos del detalle de factura. */
    @StockItemID INT,
    @Description NVARCHAR(100),
    @PackageTypeID INT,
    @Quantity INT,
    @UnitPrice DECIMAL(18,2),
    @TaxRate DECIMAL(18,2)

AS
BEGIN

    SET NOCOUNT ON;

    /* =====================================================*
       VALIDACIÓN DE CAMPOS OBLIGATORIOS - FACTURA
       ===================================================== */

    IF @CustomerID IS NULL
    BEGIN
        RAISERROR('El CustomerID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @BillToCustomerID IS NULL
    BEGIN
        RAISERROR('El BillToCustomerID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @DeliveryMethod IS NULL
    BEGIN
        RAISERROR('El DeliveryMethodID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @ContactPersonID IS NULL
    BEGIN
        RAISERROR('El ContactPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @AccountsPersonID IS NULL
    BEGIN
        RAISERROR('El AccountsPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @SalespersonPersonID IS NULL
    BEGIN
        RAISERROR('El SalespersonPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @PackedByPersonID IS NULL
    BEGIN
        RAISERROR('El PackedByPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @InvoiceDate IS NULL
    BEGIN
        RAISERROR('La fecha de factura es obligatoria.', 16, 1);
        RETURN;
    END

    IF @IsCreditNote IS NULL
    BEGIN
        RAISERROR('El indicador de nota de crédito es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TotalDryItems IS NULL
    BEGIN
        RAISERROR('El total de artículos secos es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TotalChillerItems IS NULL
    BEGIN
        RAISERROR('El total de artículos refrigerados es obligatorio.', 16, 1);
        RETURN;
    END

    IF @LastEditedBy IS NULL
    BEGIN
        RAISERROR('El LastEditedBy es obligatorio.', 16, 1);
        RETURN;
    END

    /* Validar existencia de clientes. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR('El CustomerID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @BillToCustomerID
    )
    BEGIN
        RAISERROR('El BillToCustomerID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar pedido relacionado. */
    IF @OrderID IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Pedidos
            WHERE OrderID = @OrderID
        )
    BEGIN
        RAISERROR('El OrderID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar método de entrega. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.FormasEntrega
        WHERE DeliveryMethodID = @DeliveryMethod
    )
    BEGIN
        RAISERROR('El DeliveryMethodID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar contactos. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @ContactPersonID
    )
    BEGIN
        RAISERROR('El ContactPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @AccountsPersonID
    )
    BEGIN
        RAISERROR('El AccountsPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @SalespersonPersonID
    )
    BEGIN
        RAISERROR('El SalespersonPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @PackedByPersonID
    )
    BEGIN
        RAISERROR('El PackedByPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar número de orden de compra. */
    IF @CustomerPurchaseOrderNumber IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Pedidos
            WHERE CustomerPurchaseOrderNumber = @CustomerPurchaseOrderNumber
        )
    BEGIN
        RAISERROR(
            'El CustomerPurchaseOrderNumber indicado no existe en los pedidos.',
            16,
            3
        );
        RETURN;
    END

    /* Validar datos del detalle. */
    IF @StockItemID IS NULL
    BEGIN
        RAISERROR('El StockItemID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @Description IS NULL OR @Description = ''
    BEGIN
        RAISERROR('La descripción es obligatoria.', 16, 1);
        RETURN;
    END

    IF @PackageTypeID IS NULL
    BEGIN
        RAISERROR('El PackageTypeID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @Quantity IS NULL
    BEGIN
        RAISERROR('La cantidad es obligatoria.', 16, 1);
        RETURN;
    END

    IF @TaxRate IS NULL
    BEGIN
        RAISERROR('El TaxRate es obligatorio.', 16, 1);
        RETURN;
    END

    /* Validar producto. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosActuales
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR('El StockItemID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar tipo de paquete. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.EmpaquetamientoInventario
        WHERE PackageTypeID = @PackageTypeID
    )
    BEGIN
        RAISERROR('El PackageTypeID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar costo del producto. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosInventario
        WHERE StockItemID = @StockItemID
          AND LastCostPrice IS NOT NULL
    )
    BEGIN
        RAISERROR(
            'El producto no tiene un LastCostPrice disponible para calcular la ganancia.',
            16,
            3
        );
        RETURN;
    END

    /* Validar rangos numéricos. */
    IF @Quantity <= 0
    BEGIN
        RAISERROR('La cantidad debe ser mayor que cero.', 16, 2);
        RETURN;
    END

    IF @TaxRate < 0 OR @TaxRate > 100
    BEGIN
        RAISERROR('El TaxRate debe estar entre 0 y 100.', 16, 2);
        RETURN;
    END

    IF @UnitPrice IS NOT NULL AND @UnitPrice < 0
    BEGIN
        RAISERROR('El UnitPrice no puede ser negativo.', 16, 2);
        RETURN;
    END

    IF @TotalDryItems < 0
    BEGIN
        RAISERROR('El total de artículos secos no puede ser negativo.', 16, 2);
        RETURN;
    END

    IF @TotalChillerItems < 0
    BEGIN
        RAISERROR('El total de artículos refrigerados no puede ser negativo.', 16, 2);
        RETURN;
    END

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* =====================================================*
           INSERTAR FACTURA
           ===================================================== */

        DECLARE @IdsNuevos TABLE (InvoiceID INT);

        INSERT INTO dbo.Facturas
        (
            CustomerID,
            BillToCustomerID,
            OrderID,
            DeliveryMethodID,
            ContactPersonID,
            AccountsPersonID,
            SalespersonPersonID,
            PackedByPersonID,
            InvoiceDate,
            CustomerPurchaseOrderNumber,
            IsCreditNote,
            CreditNoteReason,
            Comments,
            DeliveryInstructions,
            InternalComments,
            TotalDryItems,
            TotalChillerItems,
            DeliveryRun,
            RunPosition,
            ReturnedDeliveryData,
            LastEditedBy
        )
        OUTPUT inserted.InvoiceID INTO @IdsNuevos (InvoiceID)
        VALUES
        (
            @CustomerID,
            @BillToCustomerID,
            @OrderID,
            @DeliveryMethod,
            @ContactPersonID,
            @AccountsPersonID,
            @SalespersonPersonID,
            @PackedByPersonID,
            @InvoiceDate,
            @CustomerPurchaseOrderNumber,
            @IsCreditNote,
            @CreditNoteReason,
            @Comments,
            @DeliveryInstructions,
            @InternalComments,
            @TotalDryItems,
            @TotalChillerItems,
            @DeliveryRun,
            @RunPosition,
            @ReturnedDeliveryData,
            @LastEditedBy
        );

        DECLARE @NuevoInvoiceID INT;
        SELECT @NuevoInvoiceID = InvoiceID FROM @IdsNuevos;

        /* Obtener el costo del producto. */
        DECLARE @LastCostPrice DECIMAL(18,2);

        SELECT @LastCostPrice = LastCostPrice
        FROM dbo.ProductosInventario
        WHERE StockItemID = @StockItemID;

        /* Calcular los valores derivados del detalle. */
        DECLARE @TaxAmount DECIMAL(18,2);
        DECLARE @ExtendedPrice DECIMAL(18,2);
        DECLARE @LineProfit DECIMAL(18,2);

        IF @UnitPrice IS NULL
        BEGIN
            SET @TaxAmount = 0;
            SET @ExtendedPrice = 0;
            SET @LineProfit = 0;
        END
        ELSE
        BEGIN
            SET @TaxAmount =
                (@Quantity * @UnitPrice) * (@TaxRate / 100);

            SET @ExtendedPrice =
                (@Quantity * @UnitPrice) + @TaxAmount;

            SET @LineProfit =
                (@Quantity * @UnitPrice) - (@Quantity * @LastCostPrice);
        END

        /* =====================================================*
           INSERTAR DETALLE DE FACTURA
           ===================================================== */

        INSERT INTO dbo.DetalleFacturas
        (
            InvoiceID,
            StockItemID,
            Description,
            PackageTypeID,
            Quantity,
            UnitPrice,
            TaxRate,
            TaxAmount,
            LineProfit,
            ExtendedPrice,
            LastEditedBy
        )
        VALUES
        (
            @NuevoInvoiceID,
            @StockItemID,
            @Description,
            @PackageTypeID,
            @Quantity,
            @UnitPrice,
            @TaxRate,
            @TaxAmount,
            @LineProfit,
            @ExtendedPrice,
            @LastEditedBy
        );

        COMMIT TRANSACTION;

        /* Retornar el ID generado. */
        SELECT @NuevoInvoiceID AS InvoiceID;

    END TRY
    BEGIN CATCH
        /* Deshacer la transacción si ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Ventas_Actualizar: modifica la factura y sus líneas
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Actualizar

    /* Se utiliza para identificar la factura. */
    @InvoiceID INT,

    /* Datos de la factura. */
    @CustomerID INT,
    @BillToCustomerID INT,
    @OrderID INT,
    @DeliveryMethod INT,
    @ContactPersonID INT,
    @AccountsPersonID INT,
    @SalespersonPersonID INT,
    @PackedByPersonID INT,
    @InvoiceDate DATE,
    @CustomerPurchaseOrderNumber NVARCHAR(20),
    @IsCreditNote BIT,
    @CreditNoteReason NVARCHAR(MAX),
    @Comments NVARCHAR(MAX),
    @DeliveryInstructions NVARCHAR(MAX),
    @InternalComments NVARCHAR(MAX),
    @TotalDryItems INT,
    @TotalChillerItems INT,
    @DeliveryRun NVARCHAR(5),
    @RunPosition NVARCHAR(5),
    @ReturnedDeliveryData NVARCHAR(MAX),
    @LastEditedBy INT = 1,

    /* Datos del detalle de factura. */
    @StockItemID INT,
    @Description NVARCHAR(100),
    @PackageTypeID INT,
    @Quantity INT,
    @UnitPrice DECIMAL(18,2),
    @TaxRate DECIMAL(18,2)

AS
BEGIN

    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    IF @InvoiceID IS NULL
    BEGIN
        RAISERROR('El InvoiceID es obligatorio.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Facturas
        WHERE InvoiceID = @InvoiceID
    )
    BEGIN
        RAISERROR('La factura que intenta actualizar no existe.', 16, 5);
        RETURN;
    END

    IF @StockItemID IS NULL
    BEGIN
        RAISERROR('El StockItemID es obligatorio.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.DetalleFacturas
        WHERE InvoiceID = @InvoiceID
          AND StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR(
            'El producto indicado no existe dentro del detalle de la factura.',
            16,
            5
        );
        RETURN;
    END

    IF @CustomerID IS NULL
    BEGIN
        RAISERROR('El CustomerID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @BillToCustomerID IS NULL
    BEGIN
        RAISERROR('El BillToCustomerID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @DeliveryMethod IS NULL
    BEGIN
        RAISERROR('El DeliveryMethodID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @ContactPersonID IS NULL
    BEGIN
        RAISERROR('El ContactPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @AccountsPersonID IS NULL
    BEGIN
        RAISERROR('El AccountsPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @SalespersonPersonID IS NULL
    BEGIN
        RAISERROR('El SalespersonPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @PackedByPersonID IS NULL
    BEGIN
        RAISERROR('El PackedByPersonID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @InvoiceDate IS NULL
    BEGIN
        RAISERROR('La fecha de factura es obligatoria.', 16, 1);
        RETURN;
    END

    IF @IsCreditNote IS NULL
    BEGIN
        RAISERROR('El indicador de nota de crédito es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TotalDryItems IS NULL
    BEGIN
        RAISERROR('El total de artículos secos es obligatorio.', 16, 1);
        RETURN;
    END

    IF @TotalChillerItems IS NULL
    BEGIN
        RAISERROR('El total de artículos refrigerados es obligatorio.', 16, 1);
        RETURN;
    END

    IF @LastEditedBy IS NULL
    BEGIN
        RAISERROR('El LastEditedBy es obligatorio.', 16, 1);
        RETURN;
    END

    /* Validar existencia de clientes. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR('El CustomerID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @BillToCustomerID
    )
    BEGIN
        RAISERROR('El BillToCustomerID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar pedido. */
    IF @OrderID IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Pedidos
            WHERE OrderID = @OrderID
        )
    BEGIN
        RAISERROR('El OrderID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar método de entrega. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.FormasEntrega
        WHERE DeliveryMethodID = @DeliveryMethod
    )
    BEGIN
        RAISERROR('El DeliveryMethodID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar contactos. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @ContactPersonID
    )
    BEGIN
        RAISERROR('El ContactPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @AccountsPersonID
    )
    BEGIN
        RAISERROR('El AccountsPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @SalespersonPersonID
    )
    BEGIN
        RAISERROR('El SalespersonPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @PackedByPersonID
    )
    BEGIN
        RAISERROR('El PackedByPersonID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar número de orden de compra. */
    IF @CustomerPurchaseOrderNumber IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Pedidos
            WHERE CustomerPurchaseOrderNumber = @CustomerPurchaseOrderNumber
        )
    BEGIN
        RAISERROR(
            'El CustomerPurchaseOrderNumber indicado no existe en los pedidos.',
            16,
            3
        );
        RETURN;
    END

    /* Validar detalle. */
    IF @Description IS NULL OR @Description = ''
    BEGIN
        RAISERROR('La descripción es obligatoria.', 16, 1);
        RETURN;
    END

    IF @PackageTypeID IS NULL
    BEGIN
        RAISERROR('El PackageTypeID es obligatorio.', 16, 1);
        RETURN;
    END

    IF @Quantity IS NULL
    BEGIN
        RAISERROR('La cantidad es obligatoria.', 16, 1);
        RETURN;
    END

    IF @TaxRate IS NULL
    BEGIN
        RAISERROR('El TaxRate es obligatorio.', 16, 1);
        RETURN;
    END

    /* Validar producto. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosActuales
        WHERE StockItemID = @StockItemID
    )
    BEGIN
        RAISERROR('El StockItemID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar tipo de paquete. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.EmpaquetamientoInventario
        WHERE PackageTypeID = @PackageTypeID
    )
    BEGIN
        RAISERROR('El PackageTypeID indicado no existe.', 16, 3);
        RETURN;
    END

    /* Validar costo del producto. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductosInventario
        WHERE StockItemID = @StockItemID
          AND LastCostPrice IS NOT NULL
    )
    BEGIN
        RAISERROR(
            'El producto no tiene un LastCostPrice disponible para calcular la ganancia.',
            16,
            3
        );
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        /* =================================================*
           ACTUALIZAR FACTURA
           ================================================= */

        UPDATE dbo.Facturas
        SET
            CustomerID = @CustomerID,
            BillToCustomerID = @BillToCustomerID,
            OrderID = @OrderID,
            DeliveryMethodID = @DeliveryMethod,
            ContactPersonID = @ContactPersonID,
            AccountsPersonID = @AccountsPersonID,
            SalespersonPersonID = @SalespersonPersonID,
            PackedByPersonID = @PackedByPersonID,
            InvoiceDate = @InvoiceDate,
            CustomerPurchaseOrderNumber = @CustomerPurchaseOrderNumber,
            IsCreditNote = @IsCreditNote,
            CreditNoteReason = @CreditNoteReason,
            Comments = @Comments,
            DeliveryInstructions = @DeliveryInstructions,
            InternalComments = @InternalComments,
            TotalDryItems = @TotalDryItems,
            TotalChillerItems = @TotalChillerItems,
            DeliveryRun = @DeliveryRun,
            RunPosition = @RunPosition,
            ReturnedDeliveryData = @ReturnedDeliveryData,
            LastEditedBy = @LastEditedBy
        WHERE InvoiceID = @InvoiceID;

        /* Obtener el costo del producto. */
        DECLARE @LastCostPrice DECIMAL(18,2);

        SELECT @LastCostPrice = LastCostPrice
        FROM dbo.ProductosInventario
        WHERE StockItemID = @StockItemID;

        /* Calcular los valores derivados. */
        DECLARE @TaxAmount DECIMAL(18,2);
        DECLARE @ExtendedPrice DECIMAL(18,2);
        DECLARE @LineProfit DECIMAL(18,2);

        IF @UnitPrice IS NULL
        BEGIN
            SET @TaxAmount = 0;
            SET @ExtendedPrice = 0;
            SET @LineProfit = 0;
        END
        ELSE
        BEGIN
            SET @TaxAmount =
                (@Quantity * @UnitPrice) * (@TaxRate / 100);

            SET @ExtendedPrice =
                (@Quantity * @UnitPrice) + @TaxAmount;

            SET @LineProfit =
                @ExtendedPrice - (@Quantity * @LastCostPrice);
        END

        /* =================================================*
           ACTUALIZAR DETALLE DE FACTURA
           ================================================= */

        UPDATE dbo.DetalleFacturas
        SET
            Description = @Description,
            PackageTypeID = @PackageTypeID,
            Quantity = @Quantity,
            UnitPrice = @UnitPrice,
            TaxRate = @TaxRate,
            TaxAmount = @TaxAmount,
            LineProfit = @LineProfit,
            ExtendedPrice = @ExtendedPrice,
            LastEditedBy = @LastEditedBy
        WHERE InvoiceID = @InvoiceID
          AND StockItemID = @StockItemID;

        COMMIT TRANSACTION;

        /* Retornar los identificadores actualizados. */
        SELECT
            @InvoiceID AS InvoiceID,
            @StockItemID AS StockItemID;

    END TRY
    BEGIN CATCH
        /* Deshacer la transacción si ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Ventas_Opciones: listas del formulario de ventas
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Ventas_Opciones
AS
BEGIN
    SET NOCOUNT ON;

    /* 1. Clientes. */
    SELECT
        CustomerID AS ID,
        CustomerName AS Nombre
    FROM dbo.ClientesActuales
    ORDER BY CustomerName;

    /* 2. Métodos de entrega. */
    SELECT
        DeliveryMethodID AS ID,
        DeliveryMethodName AS Nombre
    FROM dbo.FormasEntrega
    ORDER BY DeliveryMethodName;

    /* 3. Contactos generales. */
    SELECT
        PersonID AS ID,
        FullName AS Nombre
    FROM dbo.Contactos
    WHERE IsSalesperson = 0
    ORDER BY FullName;

    /* 4. Vendedores. */
    SELECT
        PersonID AS ID,
        FullName AS Nombre
    FROM dbo.Contactos
    WHERE IsSalesperson = 1
    ORDER BY FullName;

    /* 5. Pedidos. */
    /* PY2: se quitó la lista de ~73 000 pedidos (hacía lenta la página de Ventas).
       El pedido ahora se escribe como número y SP_Ventas_Insertar/Actualizar valida que exista. */

    /* 6. Productos. */
    SELECT
        StockItemID AS ID,
        StockItemName AS Nombre
    FROM dbo.ProductosActuales
    ORDER BY StockItemName;

    /* 7. Tipos de paquete. */
    SELECT
        PackageTypeID AS ID,
        PackageTypeName AS Nombre
    FROM dbo.EmpaquetamientoInventario
    ORDER BY PackageTypeName;
END;
GO
GO

/*---------------------------------------------------------------------------------------*
* SP_Clientes_Detalle: detalle del cliente; los datos sensibles salen como "xxxx"
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Detalle
    @CustomerID NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CustomerID,
        c.CustomerName                 AS Nombre_Cliente,
        c.CustomerCategoryID           AS Categoria_ID,
        cat.CustomerCategoryName       AS Categoria,
        c.BuyingGroupID                AS Grupo_Compra_ID,
        bg.BuyingGroupName             AS Grupo_Compra,
        CAST(NULL AS INT)              AS Contacto_Primario_ID,
        N'xxxx'                        AS Contacto_Primario,
        CAST(NULL AS INT)              AS Contacto_Alternativo_ID,
        N'xxxx'                        AS Contacto_Alternativo,
        c.BillToCustomerID             AS Cliente_Por_Facturar_ID,
        bc.CustomerName                AS Cliente_Por_Facturar,
        c.DeliveryMethodID             AS Metodo_Entrega_ID,
        dm.DeliveryMethodName          AS Metodo_Entrega,
        c.DeliveryCityID               AS Ciudad_Entrega_ID,
        ciu.CityName                   AS Ciudad_Entrega,
        N'xxxx'                        AS Codigo_Postal,
        N'xxxx'                        AS Telefono,
        N'xxxx'                        AS Fax,
        N'xxxx'                        AS Sitio_Web,
        c.PaymentDays                  AS Dias_De_Gracia,
        c.CreditLimit                  AS Limite_Credito,
        c.StandardDiscountPercentage   AS Descuento,
        N'xxxx'                        AS Direccion_Entrega1,
        CAST(NULL AS NVARCHAR(60))     AS Direccion_Entrega2,
        N'xxxx'                        AS Direccion_Postal1,
        CAST(NULL AS NVARCHAR(60))     AS Direccion_Postal2,
        CAST(NULL AS FLOAT)            AS Latitud,
        CAST(NULL AS FLOAT)            AS Longitud,
        CAST(1 AS BIT)                 AS Datos_Protegidos
    FROM dbo.ClientesActuales AS c
    INNER JOIN dbo.TiposCliente AS cat     ON c.CustomerCategoryID = cat.CustomerCategoryID
    LEFT JOIN dbo.GruposCompradores AS bg  ON c.BuyingGroupID = bg.BuyingGroupID
    LEFT JOIN dbo.ClientesActuales AS bc   ON c.BillToCustomerID = bc.CustomerID
    LEFT JOIN dbo.FormasEntrega AS dm      ON c.DeliveryMethodID = dm.DeliveryMethodID
    LEFT JOIN dbo.Ciudades AS ciu          ON c.DeliveryCityID = ciu.CityID
    WHERE c.CustomerID IN (SELECT TRY_CAST(value AS INT)
                           FROM STRING_SPLIT(@CustomerID, ',')
                           WHERE TRY_CAST(value AS INT) IS NOT NULL);
END
GO


/*---------------------------------------------------------------------------------------*
* SP_Proveedores_Detalle: detalle del proveedor; los datos sensibles salen como "xxxx"
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Detalle
    @SupplierID NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.SupplierID,
        p.SupplierName                 AS Nombre_Proveedor,
        p.SupplierCategoryID           AS Categoria_ID,
        cat.SupplierCategoryName       AS Categoria,
        CAST(NULL AS INT)              AS Contacto_Primario_ID,
        N'xxxx'                        AS Contacto_Primario,
        CAST(NULL AS INT)              AS Contacto_Alternativo_ID,
        N'xxxx'                        AS Contacto_Alternativo,
        p.DeliveryMethodID             AS Metodo_Entrega_ID,
        dm.DeliveryMethodName          AS Metodo_Entrega,
        p.DeliveryCityID               AS Ciudad_Entrega_ID,
        ciu.CityName                   AS Ciudad_Entrega,
        N'xxxx'                        AS Codigo_Postal,
        p.SupplierReference            AS Referencia_Proveedor,
        N'xxxx'                        AS Nombre_Cuenta_Bancaria,
        N'xxxx'                        AS Sucursal_Cuenta_Bancaria,
        N'xxxx'                        AS Codigo_Cuenta_Bancaria,
        N'xxxx'                        AS Numero_Cuenta_Bancaria,
        N'xxxx'                        AS Codigo_Bancario_Internacional,
        p.PaymentDays                  AS Dias_De_Gracia,
        p.InternalComments             AS Comentarios_Internos,
        N'xxxx'                        AS Telefono,
        N'xxxx'                        AS Fax,
        N'xxxx'                        AS Sitio_Web,
        N'xxxx'                        AS Direccion_Entrega1,
        CAST(NULL AS NVARCHAR(60))     AS Direccion_Entrega2,
        N'xxxx'                        AS Codigo_Postal_Entrega,
        N'xxxx'                        AS Direccion_Postal1,
        CAST(NULL AS NVARCHAR(60))     AS Direccion_Postal2,
        CAST(NULL AS FLOAT)            AS Latitud,
        CAST(NULL AS FLOAT)            AS Longitud,
        p.PostalCityID                 AS Ciudad_Postal_ID,
        pc.CityName                    AS Ciudad_Postal,
        N'xxxx'                        AS Codigo_Postal_Postal,
        CAST(1 AS BIT)                 AS Datos_Protegidos
    FROM dbo.ProveedoresActuales AS p
    INNER JOIN dbo.CategoriaProveedores AS cat ON p.SupplierCategoryID = cat.SupplierCategoryID
    LEFT JOIN dbo.FormasEntrega AS dm          ON p.DeliveryMethodID = dm.DeliveryMethodID
    LEFT JOIN dbo.Ciudades AS ciu              ON p.DeliveryCityID = ciu.CityID
    LEFT JOIN dbo.Ciudades AS pc               ON p.PostalCityID = pc.CityID
    WHERE p.SupplierID IN (SELECT TRY_CAST(value AS INT)
                           FROM STRING_SPLIT(@SupplierID, ',')
                           WHERE TRY_CAST(value AS INT) IS NOT NULL);
END
GO


/*---------------------------------------------------------------------------------------*
* Permisos y verificación
*-----------------------------------------------------------------------------------------*/

/* Control de acceso: el Administrador no puede leer los datos sensibles desde la sucursal. */
IF OBJECT_ID(N'dbo.ClientesSensibles', N'SN') IS NOT NULL
BEGIN
    REVOKE SELECT ON dbo.ClientesSensibles    FROM rol_admin_sucursal;
    REVOKE SELECT ON dbo.ProveedoresSensibles FROM rol_admin_sucursal;
    REVOKE SELECT ON dbo.ContactosSensibles   FROM rol_admin_sucursal;
END
GO

EXEC dbo.usp_OtorgarPermisosApp;
GO

/* Procedimientos disponibles para el rol Administrador en esta sucursal. */
SELECT  OBJECT_NAME(p.major_id) AS Procedimiento
FROM    sys.database_permissions p
WHERE   p.grantee_principal_id = DATABASE_PRINCIPAL_ID(N'rol_admin_sucursal')
  AND   p.permission_name = N'EXECUTE'
ORDER BY Procedimiento;

/* Prueba: detalle de un cliente (los datos sensibles salen como xxxx). */
EXEC dbo.SP_Clientes_Detalle @CustomerID = N'1';
GO

SET NOEXEC OFF;
GO
