/*---------------------------------------------------------------------------------------*
*
* SCRIPT: SP_Reportes.sql (CORREGIDO PY2)
*
* CAMBIOS RESPECTO AL PROYECTO 1:
*   - Todos los reportes reciben @Pagina y @TamanoPagina y paginan en SQL Server.
*     Resultado 1 = filas de la página. Resultado 2 = datos de paginación.
*   - @Pagina = NULL devuelve todas las filas (se usa para exportar a CSV).
*   - El orden de las filas lo define SQL con ROW_NUMBER() (columna interna Fila).
*   - Ya no se devuelven columnas ID que la página web tenía que ocultar.
*   - Los reportes con ROLLUP ahora tienen un orden garantizado: filas de la
*     categoría, luego su subtotal y al final el total general.
*
*-----------------------------------------------------------------------------------------*/
USE WideWorldImporters;
GO

/*---------------------------------------------------------------------------------------*
* 1. SP_Reporte_ComprasProveedores (ROLLUP)
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Reporte_ComprasProveedores
    @SupplierCategoryName NVARCHAR(50)  = NULL,
    @SupplierName         NVARCHAR(100) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH ComprasPorOrden AS
    (
        SELECT
            oc.PurchaseOrderID,
            pa.SupplierName,
            catp.SupplierCategoryName,
            SUM(doc.OrderedOuters * doc.ExpectedUnitPricePerOuter) AS Monto_Orden
        FROM dbo.OrdenesCompra AS oc
        INNER JOIN dbo.ProveedoresActuales  AS pa   ON oc.SupplierID = pa.SupplierID
        INNER JOIN dbo.CategoriaProveedores AS catp ON pa.SupplierCategoryID = catp.SupplierCategoryID
        INNER JOIN dbo.DetalleOrdenCompra   AS doc  ON oc.PurchaseOrderID = doc.PurchaseOrderID
        WHERE (@SupplierName IS NULL OR pa.SupplierName LIKE '%' + @SupplierName + '%')
          AND (@SupplierCategoryName IS NULL OR catp.SupplierCategoryName LIKE '%' + @SupplierCategoryName + '%')
        GROUP BY oc.PurchaseOrderID, pa.SupplierName, catp.SupplierCategoryName
    ),
    Agrupado AS
    (
        SELECT
            SupplierCategoryName,
            SupplierName,
            GROUPING(SupplierCategoryName) AS G_Categoria,
            GROUPING(SupplierName)         AS G_Proveedor,
            MAX(Monto_Orden) AS Monto_Maximo,
            MIN(Monto_Orden) AS Monto_Minimo,
            AVG(Monto_Orden) AS Monto_Promedio
        FROM ComprasPorOrden
        GROUP BY ROLLUP (SupplierCategoryName, SupplierName)
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY G_Categoria, SupplierCategoryName, G_Proveedor, SupplierName) AS Fila,
        CASE
            WHEN G_Proveedor = 1 AND G_Categoria = 0 THEN N'Subtotal Categoría'
            WHEN G_Proveedor = 1 AND G_Categoria = 1 THEN N'Total General'
            ELSE SupplierName
        END AS Nombre_Proveedor,
        CASE WHEN G_Categoria = 1 THEN N'-' ELSE SupplierCategoryName END AS Categoria_Proveedor,
        Monto_Maximo,
        Monto_Minimo,
        Monto_Promedio
    INTO #R
    FROM Agrupado;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Nombre_Proveedor, Categoria_Proveedor, Monto_Maximo, Monto_Minimo, Monto_Promedio
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* 2. SP_Reporte_VentasToClientes (ROLLUP)
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Reporte_VentasToClientes
    @CustomerCategoryName NVARCHAR(50)  = NULL,
    @CustomerName         NVARCHAR(100) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH VentasPorFactura AS
    (
        SELECT
            f.InvoiceID,
            ca.CustomerName,
            tc.CustomerCategoryName,
            SUM(df.ExtendedPrice) AS Monto_Factura
        FROM dbo.Facturas AS f
        INNER JOIN dbo.ClientesActuales AS ca ON f.CustomerID = ca.CustomerID
        INNER JOIN dbo.TiposCliente     AS tc ON ca.CustomerCategoryID = tc.CustomerCategoryID
        INNER JOIN dbo.DetalleFacturas  AS df ON f.InvoiceID = df.InvoiceID
        WHERE (@CustomerName IS NULL OR ca.CustomerName LIKE '%' + @CustomerName + '%')
          AND (@CustomerCategoryName IS NULL OR tc.CustomerCategoryName LIKE '%' + @CustomerCategoryName + '%')
        GROUP BY f.InvoiceID, ca.CustomerName, tc.CustomerCategoryName
    ),
    Agrupado AS
    (
        SELECT
            CustomerCategoryName,
            CustomerName,
            GROUPING(CustomerCategoryName) AS G_Categoria,
            GROUPING(CustomerName)         AS G_Cliente,
            MIN(Monto_Factura) AS Monto_Minimo,
            MAX(Monto_Factura) AS Monto_Maximo,
            AVG(Monto_Factura) AS Monto_Promedio
        FROM VentasPorFactura
        GROUP BY ROLLUP (CustomerCategoryName, CustomerName)
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY G_Categoria, CustomerCategoryName, G_Cliente, CustomerName) AS Fila,
        CASE
            WHEN G_Cliente = 1 AND G_Categoria = 0 THEN N'Subtotal Categoría'
            WHEN G_Cliente = 1 AND G_Categoria = 1 THEN N'Total General'
            ELSE CustomerName
        END AS Nombre_Cliente,
        CASE WHEN G_Categoria = 1 THEN N'-' ELSE CustomerCategoryName END AS Categoria_Cliente,
        Monto_Minimo,
        Monto_Maximo,
        Monto_Promedio
    INTO #R
    FROM Agrupado;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Nombre_Cliente, Categoria_Cliente, Monto_Minimo, Monto_Maximo, Monto_Promedio
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* 3. SP_Top_GananciaProductos (DENSE_RANK + PARTITION BY)
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Top_GananciaProductos
    @Anio INT = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH GananciaPorProducto AS
    (
        SELECT
            YEAR(f.InvoiceDate) AS Anio,
            pa.StockItemID,
            pa.StockItemName AS Producto,
            SUM(df.LineProfit) AS Ganancia_Total
        FROM dbo.DetalleFacturas AS df
        INNER JOIN dbo.ProductosActuales AS pa ON df.StockItemID = pa.StockItemID
        INNER JOIN dbo.Facturas          AS f  ON df.InvoiceID = f.InvoiceID
        WHERE @Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio
        GROUP BY YEAR(f.InvoiceDate), pa.StockItemID, pa.StockItemName
    ),
    RankingProductos AS
    (
        SELECT Anio, StockItemID, Producto, Ganancia_Total,
               DENSE_RANK() OVER (PARTITION BY Anio ORDER BY Ganancia_Total DESC) AS Posicion
        FROM GananciaPorProducto
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY Anio, Posicion, Producto) AS Fila,
        Anio, Producto, Ganancia_Total, Posicion
    INTO #R
    FROM RankingProductos
    WHERE Posicion <= 5;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Anio, Producto, Ganancia_Total, Posicion
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* 4. SP_Top_ClientesFacturas (DENSE_RANK + PARTITION BY)
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Top_ClientesFacturas
    @Anio INT = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH PorCliente AS
    (
        SELECT
            YEAR(f.InvoiceDate) AS Anio,
            f.CustomerID,
            ca.CustomerName AS Nombre_Cliente,
            COUNT(DISTINCT f.InvoiceID) AS Cantidad_Facturas,
            SUM(df.ExtendedPrice) AS Monto_Total_Facturado
        FROM dbo.Facturas AS f
        INNER JOIN dbo.ClientesActuales AS ca ON f.CustomerID = ca.CustomerID
        INNER JOIN dbo.DetalleFacturas  AS df ON f.InvoiceID = df.InvoiceID
        WHERE @Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio
        GROUP BY YEAR(f.InvoiceDate), f.CustomerID, ca.CustomerName
    ),
    RankingClientes AS
    (
        SELECT Anio, Nombre_Cliente, Cantidad_Facturas, Monto_Total_Facturado,
               DENSE_RANK() OVER (PARTITION BY Anio ORDER BY Cantidad_Facturas DESC) AS Posicion
        FROM PorCliente
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY Anio, Posicion, Nombre_Cliente) AS Fila,
        Anio, Nombre_Cliente, Cantidad_Facturas, Posicion, Monto_Total_Facturado
    INTO #R
    FROM RankingClientes
    WHERE Posicion <= 5;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Anio, Nombre_Cliente, Cantidad_Facturas, Posicion, Monto_Total_Facturado
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* 5. SP_Top_ProveedoresOrdenes (DENSE_RANK + PARTITION BY)
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Top_ProveedoresOrdenes
    @Anio INT = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH TotOrdenesProveedor AS
    (
        SELECT
            YEAR(oc.OrderDate) AS Anio,
            oc.SupplierID,
            pa.SupplierName AS Nombre_Proveedor,
            COUNT(DISTINCT oc.PurchaseOrderID) AS Cantidad_Ordenes,
            SUM(doc.ReceivedOuters * doc.ExpectedUnitPricePerOuter) AS Monto
        FROM dbo.ProveedoresActuales AS pa
        INNER JOIN dbo.OrdenesCompra      AS oc  ON pa.SupplierID = oc.SupplierID
        INNER JOIN dbo.DetalleOrdenCompra AS doc ON oc.PurchaseOrderID = doc.PurchaseOrderID
        WHERE @Anio IS NULL OR YEAR(oc.OrderDate) = @Anio
        GROUP BY YEAR(oc.OrderDate), oc.SupplierID, pa.SupplierName
    ),
    RankingProveedores AS
    (
        SELECT Anio, Nombre_Proveedor, Cantidad_Ordenes, Monto,
               DENSE_RANK() OVER (PARTITION BY Anio ORDER BY Cantidad_Ordenes DESC) AS Posicion
        FROM TotOrdenesProveedor
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY Anio, Posicion, Nombre_Proveedor) AS Fila,
        Anio, Nombre_Proveedor, Cantidad_Ordenes, Posicion, Monto
    INTO #R
    FROM RankingProveedores
    WHERE Posicion <= 5;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Anio, Nombre_Proveedor, Cantidad_Ordenes, Posicion, Monto
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* 6. SP_Resumen_VentasCategorias (PIVOT dinámico)
*    Como las columnas (años) son dinámicas, la paginación se hace dentro del
*    mismo SQL dinámico. @Pagina y @TamanoPagina se pasan con sp_executesql.
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Resumen_VentasCategorias
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    DECLARE @Columnas NVARCHAR(MAX);
    DECLARE @SQL NVARCHAR(MAX);

    SELECT @Columnas = STRING_AGG(QUOTENAME(Anio), ',') WITHIN GROUP (ORDER BY Anio)
    FROM (SELECT DISTINCT YEAR(InvoiceDate) AS Anio FROM dbo.Facturas) AS Anios;

    SET @SQL = N'
    WITH VentasPorCategoria AS
    (
        SELECT
            YEAR(f.InvoiceDate) AS Anio,
            g.StockGroupName AS Categoria,
            SUM(df.ExtendedPrice) AS Monto
        FROM dbo.ProductosActuales AS pa
        INNER JOIN dbo.ItemGrupos       AS ig ON pa.StockItemID = ig.StockItemID
        INNER JOIN dbo.GruposInventario AS g  ON ig.StockGroupID = g.StockGroupID
        INNER JOIN dbo.DetalleFacturas  AS df ON pa.StockItemID = df.StockItemID
        INNER JOIN dbo.Facturas         AS f  ON df.InvoiceID = f.InvoiceID
        GROUP BY YEAR(f.InvoiceDate), g.StockGroupName
    )
    SELECT ROW_NUMBER() OVER (ORDER BY Categoria) AS Fila, Categoria, ' + @Columnas + N'
    INTO #R
    FROM VentasPorCategoria
    PIVOT (SUM(Monto) FOR Anio IN (' + @Columnas + N')) AS Matriz;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT = CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    SELECT Categoria, ' + @Columnas + N'
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;';

    EXEC sp_executesql @SQL,
         N'@Pagina INT, @TamanoPagina INT',
         @Pagina = @Pagina, @TamanoPagina = @TamanoPagina;
END
GO

/*---------------------------------------------------------------------------------------*
* 7. SP_Seguimiento_Compras_Clientes
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Seguimiento_Compras_Clientes
    @Anio              INT          = NULL,
    @Mes               INT          = NULL,
    @CategoriaProducto NVARCHAR(50) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    SELECT
        ROW_NUMBER() OVER (ORDER BY ca.CustomerName, YEAR(f.InvoiceDate), MONTH(f.InvoiceDate)) AS Fila,
        ca.CustomerName AS Cliente,
        YEAR(f.InvoiceDate) AS Anio,
        CASE MONTH(f.InvoiceDate)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END AS Mes,
        SUM(df.ExtendedPrice) AS Monto_Total,
        MIN(f.InvoiceDate)    AS Primera_Factura,
        MAX(f.InvoiceDate)    AS Ultima_Factura,
        SUM(df.Quantity)      AS Cantidad_Total,
        MIN(df.Quantity)      AS Cantidad_Minima,
        MAX(df.Quantity)      AS Cantidad_Maxima
    INTO #R
    FROM dbo.ClientesActuales AS ca
    INNER JOIN dbo.Facturas         AS f  ON ca.CustomerID = f.CustomerID
    INNER JOIN dbo.DetalleFacturas  AS df ON f.InvoiceID = df.InvoiceID
    INNER JOIN dbo.ItemGrupos       AS ig ON df.StockItemID = ig.StockItemID
    INNER JOIN dbo.GruposInventario AS g  ON ig.StockGroupID = g.StockGroupID
    WHERE (@Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio)
      AND (@Mes IS NULL OR MONTH(f.InvoiceDate) = @Mes)
      AND (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
    GROUP BY ca.CustomerID, ca.CustomerName, YEAR(f.InvoiceDate), MONTH(f.InvoiceDate);

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Cliente, Anio, Mes, Monto_Total, Primera_Factura, Ultima_Factura, Cantidad_Total, Cantidad_Minima, Cantidad_Maxima
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* 8. SP_Seguimiento_Compras_Proveedores
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Seguimiento_Compras_Proveedores
    @Anio              INT          = NULL,
    @Mes               INT          = NULL,
    @CategoriaProducto NVARCHAR(50) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    SELECT
        ROW_NUMBER() OVER (ORDER BY pa.SupplierName, YEAR(oc.OrderDate), MONTH(oc.OrderDate)) AS Fila,
        pa.SupplierName AS Proveedor,
        YEAR(oc.OrderDate) AS Anio,
        CASE MONTH(oc.OrderDate)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END AS Mes,
        SUM(doc.OrderedOuters * doc.ExpectedUnitPricePerOuter) AS Monto_Total,
        MIN(oc.OrderDate)      AS Primera_Orden,
        MAX(oc.OrderDate)      AS Ultima_Orden,
        SUM(doc.OrderedOuters) AS Cantidad_Total,
        MIN(doc.OrderedOuters) AS Cantidad_Minima,
        MAX(doc.OrderedOuters) AS Cantidad_Maxima
    INTO #R
    FROM dbo.ProveedoresActuales AS pa
    INNER JOIN dbo.OrdenesCompra      AS oc  ON pa.SupplierID = oc.SupplierID
    INNER JOIN dbo.DetalleOrdenCompra AS doc ON oc.PurchaseOrderID = doc.PurchaseOrderID
    INNER JOIN dbo.ItemGrupos         AS ig  ON doc.StockItemID = ig.StockItemID
    INNER JOIN dbo.GruposInventario   AS g   ON ig.StockGroupID = g.StockGroupID
    WHERE (@Anio IS NULL OR YEAR(oc.OrderDate) = @Anio)
      AND (@Mes IS NULL OR MONTH(oc.OrderDate) = @Mes)
      AND (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
    GROUP BY pa.SupplierID, pa.SupplierName, YEAR(oc.OrderDate), MONTH(oc.OrderDate);

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Proveedor, Anio, Mes, Monto_Total, Primera_Orden, Ultima_Orden, Cantidad_Total, Cantidad_Minima, Cantidad_Maxima
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* 9. SP_Rotacion_Inventario
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Rotacion_Inventario
    @CategoriaProducto NVARCHAR(50)  = NULL,
    @Anio              INT           = NULL,
    @Proveedor         NVARCHAR(100) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    DECLARE @FechaInicio DATETIME2;
    DECLARE @FechaFin    DATETIME2;
    DECLARE @DiasPeriodo INT;

    IF @Anio IS NOT NULL
    BEGIN
        SET @FechaInicio = DATEFROMPARTS(@Anio, 1, 1);
        SET @FechaFin    = DATEFROMPARTS(@Anio + 1, 1, 1);
    END
    ELSE
    BEGIN
        SELECT @FechaInicio = MIN(TransactionOccurredWhen),
               @FechaFin    = DATEADD(DAY, 1, MAX(TransactionOccurredWhen))
        FROM dbo.ProductosTransacciones;
    END;

    SET @DiasPeriodo = DATEDIFF(DAY, @FechaInicio, @FechaFin);

    ;WITH Consumo AS
    (
        SELECT pt.StockItemID, SUM(ABS(pt.Quantity)) AS Cantidad_Consumida
        FROM dbo.ProductosTransacciones AS pt
        WHERE pt.Quantity < 0
          AND pt.TransactionOccurredWhen >= @FechaInicio
          AND pt.TransactionOccurredWhen <  @FechaFin
        GROUP BY pt.StockItemID
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY pa.StockItemName, g.StockGroupName) AS Fila,
        pa.StockItemName AS Nombre_Producto,
        g.StockGroupName AS Categoria_Producto,
        p.SupplierName   AS Proveedor,
        pi.QuantityOnHand AS Stock_Actual,
        c.Cantidad_Consumida,
        CASE WHEN c.Cantidad_Consumida > 0
             THEN ROUND(CAST(pi.QuantityOnHand AS DECIMAL(18,4)) * @DiasPeriodo / c.Cantidad_Consumida, 2)
        END AS Dias_Rotacion
    INTO #R
    FROM dbo.ProductosActuales AS pa
    INNER JOIN dbo.ProductosInventario AS pi ON pa.StockItemID = pi.StockItemID
    INNER JOIN dbo.ItemGrupos          AS ig ON pa.StockItemID = ig.StockItemID
    INNER JOIN dbo.GruposInventario    AS g  ON ig.StockGroupID = g.StockGroupID
    INNER JOIN dbo.ProveedoresActuales AS p  ON pa.SupplierID = p.SupplierID
    INNER JOIN Consumo                 AS c  ON pa.StockItemID = c.StockItemID
    WHERE (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
      AND (@Proveedor IS NULL OR p.SupplierName LIKE '%' + @Proveedor + '%');

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Nombre_Producto, Categoria_Producto, Proveedor, Stock_Actual, Cantidad_Consumida, Dias_Rotacion
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* 10. SP_Metodo_Envio_Favorito (DENSE_RANK + PARTITION BY)
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Metodo_Envio_Favorito
    @Anio              INT           = NULL,
    @Mes               INT           = NULL,
    @CategoriaCliente  NVARCHAR(50)  = NULL,
    @CategoriaProducto NVARCHAR(50)  = NULL,
    @Producto          NVARCHAR(100) = NULL,
    @Pagina       INT = 1,      -- NULL = todas las filas (CSV)
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina IS NOT NULL AND @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 100 SET @TamanoPagina = 10;

    ;WITH VentasFiltradas AS
    (
        SELECT DISTINCT
            f.InvoiceID,
            YEAR(f.InvoiceDate)    AS Anio,
            MONTH(f.InvoiceDate)   AS Mes,
            c.CityID               AS ID_Ciudad,
            c.CityName             AS Ciudad,
            f.DeliveryMethodID     AS ID_MetodoEnvio,
            fe.DeliveryMethodName  AS Metodo_Envio,
            tc.CustomerCategoryName AS Categoria_Cliente,
            g.StockGroupName       AS Categoria_Producto,
            pa.StockItemName       AS Producto
        FROM dbo.Facturas AS f
        INNER JOIN dbo.ClientesActuales  AS ca ON f.CustomerID = ca.CustomerID
        INNER JOIN dbo.TiposCliente      AS tc ON ca.CustomerCategoryID = tc.CustomerCategoryID
        INNER JOIN dbo.FormasEntrega     AS fe ON f.DeliveryMethodID = fe.DeliveryMethodID
        INNER JOIN dbo.Ciudades          AS c  ON ca.DeliveryCityID = c.CityID
        INNER JOIN dbo.DetalleFacturas   AS df ON f.InvoiceID = df.InvoiceID
        INNER JOIN dbo.ProductosActuales AS pa ON df.StockItemID = pa.StockItemID
        INNER JOIN dbo.ItemGrupos        AS ig ON pa.StockItemID = ig.StockItemID
        INNER JOIN dbo.GruposInventario  AS g  ON ig.StockGroupID = g.StockGroupID
        WHERE (@Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio)
          AND (@Mes IS NULL OR MONTH(f.InvoiceDate) = @Mes)
          AND (@CategoriaCliente IS NULL OR tc.CustomerCategoryName LIKE '%' + @CategoriaCliente + '%')
          AND (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
          AND (@Producto IS NULL OR pa.StockItemName LIKE '%' + @Producto + '%')
    ),
    VentasPorMetodo AS
    (
        SELECT Anio, Mes, ID_Ciudad, Ciudad, ID_MetodoEnvio, Metodo_Envio,
               COUNT(DISTINCT InvoiceID) AS Cantidad_Ventas
        FROM VentasFiltradas
        GROUP BY Anio, Mes, ID_Ciudad, Ciudad, ID_MetodoEnvio, Metodo_Envio
    ),
    RankingMetodos AS
    (
        SELECT *, DENSE_RANK() OVER (PARTITION BY ID_Ciudad, Anio, Mes
                                     ORDER BY Cantidad_Ventas DESC) AS Posicion
        FROM VentasPorMetodo
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY r.Cantidad_Ventas DESC, r.Ciudad, r.Anio, r.Mes,
                                    vf.Categoria_Producto, vf.Producto) AS Fila,
        r.Anio,
        CASE r.Mes
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END AS Mes,
        r.Ciudad,
        r.Metodo_Envio,
        r.Cantidad_Ventas,
        vf.Categoria_Cliente,
        vf.Categoria_Producto,
        vf.Producto
    INTO #R
    FROM RankingMetodos AS r
    INNER JOIN
    (
        SELECT DISTINCT Anio, Mes, ID_Ciudad, ID_MetodoEnvio,
               Categoria_Cliente, Categoria_Producto, Producto
        FROM VentasFiltradas
    ) AS vf
        ON  r.Anio = vf.Anio AND r.Mes = vf.Mes
        AND r.ID_Ciudad = vf.ID_Ciudad AND r.ID_MetodoEnvio = vf.ID_MetodoEnvio
    WHERE r.Posicion = 1;

    DECLARE @Total INT = (SELECT COUNT(*) FROM #R);
    DECLARE @TotalPaginas INT =
        CASE WHEN @Total = 0 THEN 1 ELSE CEILING(@Total * 1.0 / @TamanoPagina) END;
    IF @Pagina IS NOT NULL AND @Pagina > @TotalPaginas SET @Pagina = @TotalPaginas;

    /* @Pagina NULL = todas las filas (exportar CSV). Si no, solo la página. */
    SELECT Anio, Mes, Ciudad, Metodo_Envio, Cantidad_Ventas, Categoria_Cliente, Categoria_Producto, Producto
    FROM #R
    WHERE @Pagina IS NULL
       OR Fila BETWEEN (@Pagina - 1) * @TamanoPagina + 1 AND @Pagina * @TamanoPagina
    ORDER BY Fila;

    SELECT @Total AS Total_Registros, ISNULL(@Pagina, 1) AS Pagina,
           @TamanoPagina AS Tamano_Pagina, @TotalPaginas AS Total_Paginas;
END
GO

/*---------------------------------------------------------------------------------------*
* SP_Reportes_Opciones: listas de los filtros. Ahora incluye las categorías de
* proveedores (antes la API hacía esa consulta con SQL suelto).
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Reportes_Opciones
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT YEAR(InvoiceDate) AS Anio FROM dbo.Facturas ORDER BY Anio;
    SELECT DISTINCT YEAR(OrderDate)   AS Anio FROM dbo.OrdenesCompra ORDER BY Anio;

    SELECT ID, Nombre FROM (VALUES
        (1, N'Enero'), (2, N'Febrero'), (3, N'Marzo'), (4, N'Abril'),
        (5, N'Mayo'), (6, N'Junio'), (7, N'Julio'), (8, N'Agosto'),
        (9, N'Septiembre'), (10, N'Octubre'), (11, N'Noviembre'), (12, N'Diciembre')
    ) AS Meses(ID, Nombre)
    ORDER BY ID;

    SELECT StockGroupID AS ID, StockGroupName AS Nombre FROM dbo.GruposInventario ORDER BY StockGroupName;
    SELECT CustomerCategoryID AS ID, CustomerCategoryName AS Nombre FROM dbo.TiposCliente ORDER BY CustomerCategoryName;
    SELECT SupplierID AS ID, SupplierName AS Nombre FROM dbo.ProveedoresActuales ORDER BY SupplierName;
    SELECT SupplierCategoryID AS ID, SupplierCategoryName AS Nombre FROM dbo.CategoriaProveedores ORDER BY SupplierCategoryName;
END
GO

/* PRUEBAS:
EXEC dbo.SP_Reporte_ComprasProveedores;                    -- página 1
EXEC dbo.SP_Reporte_ComprasProveedores @Pagina = 2;
EXEC dbo.SP_Reporte_ComprasProveedores @Pagina = NULL;     -- todo (CSV)
EXEC dbo.SP_Resumen_VentasCategorias @Pagina = 1;
EXEC dbo.SP_Metodo_Envio_Favorito @Anio = 2015, @Mes = 3;
*/
