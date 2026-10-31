USE WideWorldImporters;
GO

/* 

   MODULO REPORTES Y DATOS ESTADISTICOS

       SP_Reporte_ComprasProveedores
       SP_Reporte_VentasClientes
       SP_Top_GananciaProductos
       SP_Top_ClientesFacturas
       SP_Top_ProveedoresOrdenes
       SP_Resumen_VentasCategorias
       SP_Seguimiento_Compras_Clientes
       SP_Seguimiento_Compras_Proveedores
       SP_Rotacion_Inventario
       SP_Metodo_Envio_Favorito
       SP_Reportes_Opciones

 */


/* =========================================================

   1. REPORTE DE COMPRAS A PROVEEDORES

   Devuelve los montos maximos, minimos y promedio de las
   compras realizadas a los proveedores, agrupados por
   categoria y proveedor.

   Utiliza ROLLUP para mostrar subtotales por categoria
   y un total general.

   Permite filtrar por categoria y nombre del proveedor
   mediante entrada libre de texto.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Reporte_ComprasProveedores

    @SupplierCategoryName NVARCHAR(50) = NULL,
    @SupplierName NVARCHAR(100) = NULL

AS
BEGIN

    SET NOCOUNT ON;

    WITH ComprasPorOrden AS
    (
        SELECT
            oc.PurchaseOrderID,
            pa.SupplierID,
            pa.SupplierName,
            catp.SupplierCategoryID,
            catp.SupplierCategoryName,
            SUM(doc.OrderedOuters * doc.ExpectedUnitPricePerOuter) AS Monto_Orden

        FROM dbo.OrdenesCompra AS oc
        INNER JOIN dbo.ProveedoresActuales AS pa
            ON oc.SupplierID = pa.SupplierID
        INNER JOIN dbo.CategoriaProveedores AS catp
            ON pa.SupplierCategoryID = catp.SupplierCategoryID
        INNER JOIN dbo.DetalleOrdenCompra AS doc
            ON oc.PurchaseOrderID = doc.PurchaseOrderID

        WHERE (@SupplierName IS NULL OR pa.SupplierName LIKE '%' + @SupplierName + '%')
            AND
            (@SupplierCategoryName IS NULL OR catp.SupplierCategoryName LIKE '%' + @SupplierCategoryName + '%')

        GROUP BY oc.PurchaseOrderID, pa.SupplierID, pa.SupplierName, catp.SupplierCategoryID, catp.SupplierCategoryName
    )

    SELECT
        CASE
            WHEN GROUPING(SupplierName) = 1
                AND GROUPING(SupplierCategoryName) = 0
                THEN 'Subtotal Categoría'
            WHEN GROUPING(SupplierName) = 1
                AND GROUPING(SupplierCategoryName) = 1 THEN 'Total General'
            ELSE SupplierName
        END AS Nombre_Proveedor,
        CASE
            WHEN GROUPING(SupplierCategoryName) = 1 THEN '-'
            ELSE SupplierCategoryName
        END AS Categoria_Proveedor,
        MAX(Monto_Orden) AS Monto_Maximo,
        MIN(Monto_Orden) AS Monto_Minimo,
        AVG(Monto_Orden) AS Monto_Promedio

    FROM ComprasPorOrden

    GROUP BY ROLLUP (SupplierCategoryName, SupplierName);

END
GO


/* =========================================================

   2. VENTAS A CLIENTES

   Devuelve los montos maximos, minimos y promedio de las
   compras realizadas por los clientes, agrupados por
   categoria y cliente.

   Utiliza ROLLUP para mostrar subtotales por categoria
   y un total general.

   Permite filtrar por categoria y nombre del cliente
   mediante entrada libre de texto.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Reporte_VentasToClientes

    @CustomerCategoryName NVARCHAR(50) = NULL,
    @CustomerName NVARCHAR(100) = NULL

AS
BEGIN

    SET NOCOUNT ON;

    WITH VentasPorFactura AS
    (
        SELECT
            f.InvoiceID,
            ca.CustomerID,
            ca.CustomerName,
            tc.CustomerCategoryID,
            tc.CustomerCategoryName,
            SUM(df.ExtendedPrice) AS Monto_Factura
        FROM dbo.Facturas AS f
        INNER JOIN dbo.ClientesActuales AS ca
            ON f.CustomerID = ca.CustomerID
        INNER JOIN dbo.TiposCliente AS tc
            ON ca.CustomerCategoryID = tc.CustomerCategoryID
        INNER JOIN dbo.DetalleFacturas AS df
            ON f.InvoiceID = df.InvoiceID
            
        WHERE (@CustomerName IS NULL OR ca.CustomerName LIKE '%' + @CustomerName + '%')
            AND
            (@CustomerCategoryName IS NULL OR tc.CustomerCategoryName LIKE '%' + @CustomerCategoryName + '%')

        GROUP BY f.InvoiceID, ca.CustomerID, ca.CustomerName, tc.CustomerCategoryID, tc.CustomerCategoryName
    )

    SELECT
        CASE
            WHEN GROUPING(CustomerName) = 1
                AND GROUPING(CustomerCategoryName) = 0
                THEN 'Subtotal Categoría'
            WHEN GROUPING(CustomerName) = 1
                AND GROUPING(CustomerCategoryName) = 1
                THEN 'Total General'
            ELSE CustomerName
        END AS Nombre_Cliente,
        CASE
            WHEN GROUPING(CustomerCategoryName) = 1
                THEN '-'
            ELSE CustomerCategoryName
        END AS Categoria_Cliente,
        MIN(Monto_Factura) AS Monto_Minimo,
        MAX(Monto_Factura) AS Monto_Maximo,
        AVG(Monto_Factura) AS Monto_Promedio

    FROM VentasPorFactura

    GROUP BY ROLLUP (CustomerCategoryName, CustomerName);

END
GO


/* =========================================================

   3. TOP 5 PRODUCTOS QUE MÁS GENERAN

   Devuelve los 5 productos que generan mayor ganancia total
   por año, utilizando DENSE_RANK.

   Permite filtrar los resultados por un año específico mediante
   el parámetro @Anio. Si es NULL, procesa todos los años.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Top_GananciaProductos

    @Anio INT = NULL

AS
BEGIN

    SET NOCOUNT ON;

    WITH GananciaPorProducto AS (
        SELECT
            YEAR(f.InvoiceDate) AS Anio,
            pa.StockItemID,
            pa.StockItemName AS Producto,
            SUM(df.LineProfit) AS Ganancia_Total

        FROM dbo.DetalleFacturas AS df
        INNER JOIN dbo.ProductosActuales AS pa ON df.StockItemID = pa.StockItemID
        INNER JOIN dbo.Facturas AS f ON df.InvoiceID = f.InvoiceID

        WHERE @Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio

        GROUP BY YEAR(f.InvoiceDate), pa.StockItemID, pa.StockItemName
    ),

    RankingProductos AS (
        SELECT
            Anio,
            StockItemID,
            Producto,
            Ganancia_Total,
            DENSE_RANK() OVER (PARTITION BY Anio ORDER BY Ganancia_Total DESC) AS Posicion

        FROM GananciaPorProducto
    )

    SELECT
        Anio,
        StockItemID AS ID_Producto,
        Producto,
        Ganancia_Total,
        Posicion
    FROM RankingProductos
    WHERE Posicion <= 5
    ORDER BY Anio, Posicion;

END
GO

/* =========================================================

   4. TOP 5 CLIENTES CON MÁS FACTURAS

   Devuelve los 5 clientes con mayor cantidad de facturas
   emitidas a su nombre por año, utilizando ranking denso
   (DENSE_RANK).

   Muestra adicionalmente el monto total facturado a cada
   cliente durante el año correspondiente.

   Permite filtrar los resultados por un año específico
   mediante el parámetro @Anio. Si es NULL, procesa todos
   los años.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Top_ClientesFacturas

    @Anio INT = NULL

AS
BEGIN

    SET NOCOUNT ON;

    WITH GananciaPorCliente AS (
        SELECT 
            YEAR(f.InvoiceDate) AS Anio,
            f.CustomerID AS ID_Cliente,
            ca.CustomerName AS Nombre_Cliente,
            COUNT(DISTINCT f.InvoiceID) AS Cantidad_Facturas,
            SUM(df.ExtendedPrice) AS Monto_Total_Facturado

        FROM dbo.Facturas f  
        INNER JOIN dbo.ClientesActuales AS ca ON f.CustomerID = ca.CustomerID
        INNER JOIN dbo.DetalleFacturas AS df ON f.InvoiceID = df.InvoiceID

        WHERE @Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio

        GROUP BY YEAR(f.InvoiceDate), f.CustomerID, ca.CustomerName
    ),

    RankingClientes AS (
        SELECT
            Anio,
            ID_Cliente,
            Nombre_Cliente,
            DENSE_RANK() OVER (PARTITION BY Anio ORDER BY Cantidad_Facturas DESC) AS Posicion,
            Monto_Total_Facturado
        FROM GananciaPorCliente
    )

    SELECT
        Anio,
        ID_Cliente,
        Nombre_Cliente,
        Posicion,
        Monto_Total_Facturado
    FROM RankingClientes
    WHERE Posicion <= 5
    ORDER BY Anio, Posicion

END
GO

/* =========================================================

   5. TOP 5 PROVEEDORES CON MÁS ÓRDENES DE COMPRA

   Devuelve los 5 proveedores con mayor cantidad de órdenes
   de compra emitidas a su nombre por año, utilizando ranking
   denso (DENSE_RANK).

   Muestra adicionalmente el monto total de las órdenes de
   compra asociadas a cada proveedor durante el año
   correspondiente.

   Permite filtrar los resultados por un año específico
   mediante el parámetro @Anio. Si es NULL, procesa todos
   los años.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Top_ProveedoresOrdenes

    @Anio INT = NULL

AS 
BEGIN

    WITH TotOrdenesProveedor AS (
        SELECT 
            YEAR(oc.OrderDate) AS Anio,
            oc.SupplierID AS ID_Proveedor,
            pa.SupplierName AS Nombre_Proveedor,
            COUNT(DISTINCT oc.PurchaseOrderID) AS Cantidad_Ordenes,
            SUM(doc.ReceivedOuters * doc.ExpectedUnitPricePerOuter) AS Monto
            
        FROM dbo.ProveedoresActuales pa
        INNER JOIN dbo.OrdenesCompra AS oc ON pa.SupplierID = oc.SupplierID
        INNER JOIN dbo.DetalleOrdenCompra AS doc ON oc.PurchaseOrderID = doc.PurchaseOrderID

        WHERE @Anio IS NULL OR YEAR(oc.OrderDate) = @Anio

        GROUP BY YEAR(oc.OrderDate), oc.SupplierID, pa.SupplierName
    ),

    RankingProveedores AS (
        SELECT 
            Anio,
            ID_Proveedor,
            Nombre_Proveedor,
            DENSE_RANK() OVER (PARTITION BY Anio ORDER BY Cantidad_Ordenes DESC) AS Posicion,
            Monto

        FROM TotOrdenesProveedor
    )

    SELECT
        Anio,
        ID_Proveedor,
        Nombre_Proveedor,
        Posicion,
        Monto

    FROM RankingProveedores
    WHERE Posicion <= 5
    ORDER BY Anio, Posicion

END
GO


/* =========================================================

   6. MATRIZ RESUMEN DE VENTAS POR CATEGORÍA Y AÑO

   Devuelve el monto total de las ventas agrupadas por
   categoría de producto y año.

   Utiliza PIVOT para transformar los años en columnas
   y generar una matriz de ventas por categoría.

   Las columnas correspondientes a los años se generan
   dinámicamente a partir de los años existentes en las
   facturas.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Resumen_VentasCategorias

AS
BEGIN

    SET NOCOUNT ON;

    DECLARE @Columnas NVARCHAR(MAX);
    DECLARE @SQL NVARCHAR(MAX);

    SELECT @Columnas = STRING_AGG(
        QUOTENAME(Anio),
        ','
    ) WITHIN GROUP (ORDER BY Anio)

    FROM
    (
        SELECT DISTINCT YEAR(InvoiceDate) AS Anio
        FROM dbo.Facturas
    ) AS Años;

    SET @SQL = '
    WITH VentasPorCategoria AS
    (
        SELECT 
            YEAR(f.InvoiceDate) AS Anio,
            g.StockGroupID AS ID_Categoria,
            g.StockGroupName AS Categoria,
            SUM(df.ExtendedPrice) AS Monto

        FROM dbo.ProductosActuales AS pa
        INNER JOIN dbo.ItemGrupos AS ig 
            ON pa.StockItemID = ig.StockItemID
        INNER JOIN dbo.GruposInventario AS g 
            ON ig.StockGroupID = g.StockGroupID
        INNER JOIN dbo.DetalleFacturas AS df 
            ON pa.StockItemID = df.StockItemID
        INNER JOIN dbo.Facturas AS f 
            ON df.InvoiceID = f.InvoiceID

        GROUP BY 
            YEAR(f.InvoiceDate),
            g.StockGroupID,
            g.StockGroupName
    )

    SELECT
        ID_Categoria,
        Categoria,
        ' + @Columnas + '
    FROM VentasPorCategoria
    PIVOT
    (
        SUM(Monto)
        FOR Anio IN (' + @Columnas + ')
    ) AS Matriz
    ORDER BY Categoria;
    ';

    EXEC sp_executesql @SQL;

END
GO


/* =========================================================

   7. SEGUIMIENTO DE COMPRAS DE CLIENTES

   Devuelve un resumen de las compras realizadas por cada
   cliente, agrupadas por año y mes.

   Muestra el monto total comprado, la primera y ultima
   factura registrada durante el mes, la cantidad total
   comprada y las cantidades minima y maxima.

   Permite filtrar los resultados por año, mes y categoria
   de producto mediante entrada libre de texto.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Seguimiento_Compras_Clientes

    @Anio INT = NULL,
    @Mes INT = NULL,
    @CategoriaProducto NVARCHAR(50) = NULL

AS 
BEGIN

    SET NOCOUNT ON;

    SELECT 
        ca.CustomerID,
        ca.CustomerName,
        YEAR(f.InvoiceDate) AS Anio,

        CASE MONTH(f.InvoiceDate)
            WHEN 1 THEN 'Enero'
            WHEN 2 THEN 'Febrero'
            WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril'
            WHEN 5 THEN 'Mayo'
            WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio'
            WHEN 8 THEN 'Agosto'
            WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre'
            WHEN 11 THEN 'Noviembre'
            WHEN 12 THEN 'Diciembre'
        END AS Mes,

        SUM(df.ExtendedPrice) AS Monto_Total,
        MIN(f.InvoiceDate) AS Primera_Factura,
        MAX(f.InvoiceDate) AS Ultima_Factura,
        SUM(df.Quantity) AS Cantidad_Total,
        MIN(df.Quantity) AS Cantidad_Minima,
        MAX(df.Quantity) AS Cantidad_Maxima

    FROM dbo.ClientesActuales AS ca
    INNER JOIN dbo.Facturas AS f ON ca.CustomerID = f.CustomerID
    INNER JOIN dbo.DetalleFacturas AS df ON f.InvoiceID = df.InvoiceID
    INNER JOIN dbo.ItemGrupos AS ig ON df.StockItemID = IG.StockItemID
    INNER JOIN dbo.GruposInventario AS g ON ig.StockGroupID = g.StockGroupID

    WHERE (@Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio)
        AND
          (@Mes IS NULL OR MONTH(f.InvoiceDate) = @Mes)
        AND (@CategoriaProducto IS NULL 
            OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')

    GROUP BY ca.CustomerID, ca.CustomerName, YEAR(f.InvoiceDate), MONTH(f.InvoiceDate)

    ORDER BY ca.CustomerName, YEAR(f.InvoiceDate), MONTH(f.InvoiceDate);

END 
GO


/* =========================================================

   8. SEGUIMIENTO DE COMPRAS DE PROVEEDORES

   Devuelve un resumen de las compras realizadas a cada
   proveedor, agrupadas por año y mes.

   Muestra el monto total comprado, la primera y última
   orden registrada durante el mes, la cantidad total
   comprada y las cantidades mínima y máxima.

   Permite filtrar los resultados por año, mes y categoría
   de producto mediante entrada libre de texto.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Seguimiento_Compras_Proveedores

    @Anio INT = NULL,
    @Mes INT = NULL,
    @CategoriaProducto NVARCHAR(50) = NULL

AS
BEGIN

    SET NOCOUNT ON;

    SELECT
        pa.SupplierID,
        pa.SupplierName,
        YEAR(oc.OrderDate) AS Anio,

        CASE MONTH(oc.OrderDate)
            WHEN 1 THEN 'Enero'
            WHEN 2 THEN 'Febrero'
            WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril'
            WHEN 5 THEN 'Mayo'
            WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio'
            WHEN 8 THEN 'Agosto'
            WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre'
            WHEN 11 THEN 'Noviembre'
            WHEN 12 THEN 'Diciembre'
        END AS Mes,

        SUM(doc.OrderedOuters * doc.ExpectedUnitPricePerOuter) AS Monto_Total,
        MIN(oc.OrderDate) AS Primera_Orden,
        MAX(oc.OrderDate) AS Ultima_Orden,
        SUM(doc.OrderedOuters) AS Cantidad_Total,
        MIN(doc.OrderedOuters) AS Cantidad_Minima,
        MAX(doc.OrderedOuters) AS Cantidad_Maxima

    FROM dbo.ProveedoresActuales AS pa
    INNER JOIN dbo.OrdenesCompra AS oc ON pa.SupplierID = oc.SupplierID
    INNER JOIN dbo.DetalleOrdenCompra AS doc ON oc.PurchaseOrderID = doc.PurchaseOrderID
    INNER JOIN dbo.ItemGrupos AS ig ON doc.StockItemID = ig.StockItemID
    INNER JOIN dbo.GruposInventario AS g ON ig.StockGroupID = g.StockGroupID

    WHERE (@Anio IS NULL OR YEAR(oc.OrderDate) = @Anio)
        AND 
          (@Mes IS NULL OR MONTH(oc.OrderDate) = @Mes)
        AND 
          (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')

    GROUP BY pa.SupplierID, pa.SupplierName, YEAR(oc.OrderDate), MONTH(oc.OrderDate)

    ORDER BY pa.SupplierName, YEAR(oc.OrderDate), MONTH(oc.OrderDate);

END
GO


/* =========================================================

   9. ROTACION PROMEDIO DE INVENTARIO POR PRODUCTO

   Calcula una estimacion de los dias de rotacion de inventario
   por producto utilizando el stock actual y el consumo
   registrado durante el periodo.

   La rotacion se calcula tomando el stock actual como
   aproximacion del inventario promedio y relacionandolo
   con la cantidad consumida durante el periodo.

   Permite filtrar por categoria de producto, año y proveedor.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Rotacion_Inventario

    @CategoriaProducto NVARCHAR(50) = NULL,
    @Anio INT = NULL,
    @Proveedor NVARCHAR(100) = NULL

AS
BEGIN

    SET NOCOUNT ON;

    DECLARE @FechaInicio DATETIME2;
    DECLARE @FechaFin DATETIME2;
    DECLARE @DiasPeriodo INT;

    IF @Anio IS NOT NULL
    BEGIN
        SET @FechaInicio = DATEFROMPARTS(@Anio, 1, 1);
        SET @FechaFin = DATEFROMPARTS(@Anio + 1, 1, 1);
    END
    ELSE
    BEGIN
        SELECT
            @FechaInicio = MIN(TransactionOccurredWhen),
            @FechaFin = DATEADD(DAY, 1, MAX(TransactionOccurredWhen))

        FROM dbo.ProductosTransacciones;
    END;


    SET @DiasPeriodo = DATEDIFF(DAY, @FechaInicio, @FechaFin);

    WITH Consumo AS
    (
        SELECT
            pt.StockItemID,
            SUM(ABS(pt.Quantity)) AS Cantidad_Consumida

        FROM dbo.ProductosTransacciones AS pt

        WHERE pt.Quantity < 0
            AND pt.TransactionOccurredWhen >= @FechaInicio
            AND pt.TransactionOccurredWhen < @FechaFin

        GROUP BY pt.StockItemID
    )


    SELECT
        pa.StockItemID AS ID_Producto,
        pa.StockItemName AS Nombre_Producto,
        g.StockGroupName AS Categoria_Producto,
        p.SupplierName AS Proveedor,
        pi.QuantityOnHand AS Stock_Actual,
        c.Cantidad_Consumida,
        CASE
            WHEN c.Cantidad_Consumida > 0
            THEN
                CAST(pi.QuantityOnHand AS DECIMAL(18,4))
                * @DiasPeriodo
                / c.Cantidad_Consumida

            ELSE NULL
        END AS Dias_Rotacion

    FROM dbo.ProductosActuales AS pa

    INNER JOIN dbo.ProductosInventario AS pi ON pa.StockItemID = pi.StockItemID
    INNER JOIN dbo.ItemGrupos AS ig ON pa.StockItemID = ig.StockItemID
    INNER JOIN dbo.GruposInventario AS g ON ig.StockGroupID = g.StockGroupID
    INNER JOIN dbo.ProveedoresActuales AS p ON pa.SupplierID = p.SupplierID
    INNER JOIN Consumo AS c ON pa.StockItemID = c.StockItemID

    WHERE ( @CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
        AND
          (@Proveedor IS NULL OR p.SupplierName LIKE '%' + @Proveedor + '%')

    ORDER BY pa.StockItemName;

END
GO


/* =========================================================

   10. METODO DE ENVIO FAVORITO

   Determina el metodo de envio mas utilizado para cada
   ciudad de destino, tomando como referencia la cantidad
   de ventas realizadas.

   Permite filtrar los resultados por año, mes, categoria
   de cliente, categoria de producto y producto.

   En caso de empate, se muestran todos los metodos de envio
   que ocupen la primera posicion.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Metodo_Envio_Favorito

    @Anio INT = NULL,
    @Mes INT = NULL,
    @CategoriaCliente NVARCHAR(50) = NULL,
    @CategoriaProducto NVARCHAR(50) = NULL,
    @Producto NVARCHAR(100) = NULL

AS
BEGIN

    SET NOCOUNT ON;

    WITH VentasFiltradas AS
    (
        SELECT DISTINCT
            f.InvoiceID,
            YEAR(f.InvoiceDate) AS Anio,
            MONTH(f.InvoiceDate) AS Mes,
            c.CityID AS ID_Ciudad,
            c.CityName AS Ciudad,
            f.DeliveryMethodID AS ID_MetodoEnvio,
            fe.DeliveryMethodName AS Metodo_Envio,
            tc.CustomerCategoryName AS Categoria_Cliente,
            g.StockGroupName AS Categoria_Producto,
            pa.StockItemName AS Producto

        FROM dbo.Facturas AS f
        INNER JOIN dbo.ClientesActuales AS ca ON f.CustomerID = ca.CustomerID
        INNER JOIN dbo.TiposCliente AS tc ON ca.CustomerCategoryID = tc.CustomerCategoryID
        INNER JOIN dbo.FormasEntrega AS fe ON f.DeliveryMethodID = fe.DeliveryMethodID
        INNER JOIN dbo.Ciudades AS c ON ca.DeliveryCityID = c.CityID
        INNER JOIN dbo.DetalleFacturas AS df ON f.InvoiceID = df.InvoiceID
        INNER JOIN dbo.ProductosActuales AS pa ON df.StockItemID = pa.StockItemID
        INNER JOIN dbo.ItemGrupos AS ig ON pa.StockItemID = ig.StockItemID
        INNER JOIN dbo.GruposInventario AS g ON ig.StockGroupID = g.StockGroupID

        WHERE (@Anio IS NULL OR YEAR(f.InvoiceDate) = @Anio)
            AND (@Mes IS NULL OR MONTH(f.InvoiceDate) = @Mes)
            AND (@CategoriaCliente IS NULL OR tc.CustomerCategoryName LIKE '%' + @CategoriaCliente + '%')
            AND (@CategoriaProducto IS NULL OR g.StockGroupName LIKE '%' + @CategoriaProducto + '%')
            AND (@Producto IS NULL OR pa.StockItemName LIKE '%' + @Producto + '%')
    ),

    VentasPorMetodo AS
    (
        SELECT
            Anio,
            Mes,
            ID_Ciudad,
            Ciudad,
            ID_MetodoEnvio,
            Metodo_Envio,
            COUNT(DISTINCT InvoiceID) AS Cantidad_Ventas

        FROM VentasFiltradas

        GROUP BY Anio, Mes, ID_Ciudad, Ciudad, ID_MetodoEnvio, Metodo_Envio
    ),

    RankingMetodos AS
    (
        SELECT
            Anio,
            Mes,
            ID_Ciudad,
            Ciudad,
            ID_MetodoEnvio,
            Metodo_Envio,
            Cantidad_Ventas,
            DENSE_RANK() OVER (
                PARTITION BY ID_Ciudad, Anio, Mes
                ORDER BY Cantidad_Ventas DESC
            ) AS Posicion

        FROM VentasPorMetodo
    )

    SELECT
        r.Anio,
        CASE r.Mes
            WHEN 1 THEN 'Enero'
            WHEN 2 THEN 'Febrero'
            WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril'
            WHEN 5 THEN 'Mayo'
            WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio'
            WHEN 8 THEN 'Agosto'
            WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre'
            WHEN 11 THEN 'Noviembre'
            WHEN 12 THEN 'Diciembre'
        END AS Mes,
        r.Ciudad,
        ---r.ID_MetodoEnvio,
        r.Metodo_Envio,
        r.Cantidad_Ventas,
        vf.Categoria_Cliente,
        vf.Categoria_Producto,
        vf.Producto

    FROM RankingMetodos AS r
    INNER JOIN
    (
        SELECT DISTINCT
            Anio,
            Mes,
            ID_Ciudad,
            ID_MetodoEnvio,
            Categoria_Cliente,
            Categoria_Producto,
            Producto
        FROM VentasFiltradas
    ) AS vf
        ON r.Anio = vf.Anio
        AND r.Mes = vf.Mes
        AND r.ID_Ciudad = vf.ID_Ciudad
        AND r.ID_MetodoEnvio = vf.ID_MetodoEnvio

    WHERE r.Posicion = 1

    ORDER BY r.Cantidad_Ventas DESC, r.Ciudad;

END
GO


/* =========================================================

   OPCIONES DE REPORTES

   Devuelve las opciones disponibles para los filtros de los
   procedimientos del modulo de reportes y datos estadisticos.

   Incluye años disponibles para ventas y compras, meses,
   categorias de clientes, categorias de productos y
   proveedores.

   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.SP_Reportes_Opciones
AS
BEGIN

    SET NOCOUNT ON;

    -- 1. Años disponibles en las facturas
    SELECT DISTINCT
        YEAR(InvoiceDate) AS Anio
    FROM dbo.Facturas
    ORDER BY Anio;

    -- 2. Años disponibles en las órdenes de compra
    SELECT DISTINCT
        YEAR(OrderDate) AS Anio
    FROM dbo.OrdenesCompra
    ORDER BY Anio;

    -- 3. Meses disponibles
    SELECT
        1 AS ID,
        'Enero' AS Nombre
    UNION ALL
    SELECT
        2,
        'Febrero'
    UNION ALL
    SELECT
        3,
        'Marzo'
    UNION ALL
    SELECT
        4,
        'Abril'
    UNION ALL
    SELECT
        5,
        'Mayo'
    UNION ALL
    SELECT
        6,
        'Junio'
    UNION ALL
    SELECT
        7,
        'Julio'
    UNION ALL
    SELECT
        8,
        'Agosto'
    UNION ALL
    SELECT
        9,
        'Septiembre'
    UNION ALL
    SELECT
        10,
        'Octubre'
    UNION ALL
    SELECT
        11,
        'Noviembre'
    UNION ALL
    SELECT
        12,
        'Diciembre';

    -- 4. Categorías de productos
    SELECT
        StockGroupID AS ID,
        StockGroupName AS Nombre
    FROM dbo.GruposInventario
    ORDER BY StockGroupName;

    -- 5. Categorías de clientes
    SELECT
        CustomerCategoryID AS ID,
        CustomerCategoryName AS Nombre
    FROM dbo.TiposCliente
    ORDER BY CustomerCategoryName;

    -- 6. Proveedores
    SELECT
        SupplierID AS ID,
        SupplierName AS Nombre
    FROM dbo.ProveedoresActuales
    ORDER BY SupplierName;

    -- 7. Categorias Proveedores
    SELECT 
        SupplierCategoryID AS ID,
        SupplierCategoryName AS Nombre
    FROM dbo.CategoriaProveedores
    ORDER BY SupplierCategoryName;

END
GO
