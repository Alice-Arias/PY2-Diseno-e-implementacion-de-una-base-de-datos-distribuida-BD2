/*---------------------------------------------------------------------------------------*
* NOMBRE: comprobar_reportes_rapidos.sql
* ENTRADA: Ninguna.
* DESCRIPCION: Compara los reportes rápidos con el cálculo original, fila por fila.
* SALIDA: Tabla con las diferencias de cada comparación (deben ser 0).
* OBJETIVO: Probar que los reportes rápidos dan lo mismo que antes.
* EJECUTAR: En el Corporativo, después del 16. No modifica nada.
*-----------------------------------------------------------------------------------------*/

USE WideWorldImporters;
SET NOCOUNT ON;

DECLARE @Resultados TABLE (Comparacion NVARCHAR(100), Filas INT, Diferencias INT);

/*--------------------- 1. Seguimiento de compras de clientes (Limón) ---------------------*/
EXEC sys.sp_set_session_context @key = N'Sucursal', @value = 2;

SELECT  ca.CustomerName AS Cliente, YEAR(f.InvoiceDate) AS Anio, MONTH(f.InvoiceDate) AS Mes,
        SUM(df.ExtendedPrice) AS Monto, MIN(f.InvoiceDate) AS Primera, MAX(f.InvoiceDate) AS Ultima,
        SUM(df.Quantity) AS Cantidad, MIN(df.Quantity) AS Minima, MAX(df.Quantity) AS Maxima
INTO    #SeguimientoOriginal
FROM    dbo.ClientesActuales AS ca
JOIN    dbo.Facturas         AS f  ON ca.CustomerID = f.CustomerID
JOIN    dbo.DetalleFacturas  AS df ON f.InvoiceID = df.InvoiceID
JOIN    dbo.ItemGrupos       AS ig ON df.StockItemID = ig.StockItemID
JOIN    dbo.GruposInventario AS g  ON ig.StockGroupID = g.StockGroupID
GROUP BY ca.CustomerID, ca.CustomerName, YEAR(f.InvoiceDate), MONTH(f.InvoiceDate);

SELECT  ca.CustomerName AS Cliente, r.Anio, r.Mes,
        SUM(r.Monto) AS Monto, MIN(r.PrimeraFactura) AS Primera, MAX(r.UltimaFactura) AS Ultima,
        SUM(r.Cantidad) AS Cantidad, MIN(r.CantidadMinima) AS Minima, MAX(r.CantidadMaxima) AS Maxima
INTO    #SeguimientoNuevo
FROM    Estadisticas.ResumenClienteMes AS r
JOIN    dbo.ClientesActuales AS ca ON ca.CustomerID = r.CustomerID
WHERE   r.SucursalID = 2
GROUP BY r.CustomerID, ca.CustomerName, r.Anio, r.Mes;

INSERT INTO @Resultados
SELECT N'Seguimiento de clientes - Limón',
       (SELECT COUNT(*) FROM #SeguimientoOriginal),
       (SELECT COUNT(*) FROM (SELECT * FROM #SeguimientoOriginal EXCEPT SELECT * FROM #SeguimientoNuevo) AS sobran)
     + (SELECT COUNT(*) FROM (SELECT * FROM #SeguimientoNuevo EXCEPT SELECT * FROM #SeguimientoOriginal) AS faltan);

/*------------- 2. Seguimiento de clientes con categoría 'Toys' (consolidado) -------------*/
EXEC sys.sp_set_session_context @key = N'Sucursal', @value = NULL;

SELECT  ca.CustomerName AS Cliente, YEAR(f.InvoiceDate) AS Anio, MONTH(f.InvoiceDate) AS Mes,
        SUM(df.ExtendedPrice) AS Monto, MIN(f.InvoiceDate) AS Primera, MAX(f.InvoiceDate) AS Ultima,
        SUM(df.Quantity) AS Cantidad, MIN(df.Quantity) AS Minima, MAX(df.Quantity) AS Maxima
INTO    #CategoriaOriginal
FROM    dbo.ClientesActuales AS ca
JOIN    dbo.Facturas         AS f  ON ca.CustomerID = f.CustomerID
JOIN    dbo.DetalleFacturas  AS df ON f.InvoiceID = df.InvoiceID
JOIN    dbo.ItemGrupos       AS ig ON df.StockItemID = ig.StockItemID
JOIN    dbo.GruposInventario AS g  ON ig.StockGroupID = g.StockGroupID
WHERE   g.StockGroupName LIKE N'%Toys%'
GROUP BY ca.CustomerID, ca.CustomerName, YEAR(f.InvoiceDate), MONTH(f.InvoiceDate);

SELECT  ca.CustomerName AS Cliente, r.Anio, r.Mes,
        SUM(r.Monto) AS Monto, MIN(r.PrimeraFactura) AS Primera, MAX(r.UltimaFactura) AS Ultima,
        SUM(r.Cantidad) AS Cantidad, MIN(r.CantidadMinima) AS Minima, MAX(r.CantidadMaxima) AS Maxima
INTO    #CategoriaNuevo
FROM    Estadisticas.ResumenClienteMesGrupo AS r
JOIN    dbo.GruposInventario AS g  ON g.StockGroupID = r.StockGroupID
JOIN    dbo.ClientesActuales AS ca ON ca.CustomerID = r.CustomerID
WHERE   g.StockGroupName LIKE N'%Toys%'
GROUP BY r.CustomerID, ca.CustomerName, r.Anio, r.Mes;

INSERT INTO @Resultados
SELECT N'Seguimiento de clientes - categoría Toys',
       (SELECT COUNT(*) FROM #CategoriaOriginal),
       (SELECT COUNT(*) FROM (SELECT * FROM #CategoriaOriginal EXCEPT SELECT * FROM #CategoriaNuevo) AS sobran)
     + (SELECT COUNT(*) FROM (SELECT * FROM #CategoriaNuevo EXCEPT SELECT * FROM #CategoriaOriginal) AS faltan);

/*----------------- 3. Ganancia por producto y año (consolidado y Limón) -----------------*/
SELECT  YEAR(f.InvoiceDate) AS Anio, df.StockItemID, SUM(df.LineProfit) AS Ganancia
INTO    #GananciaOriginal
FROM    dbo.DetalleFacturas AS df
JOIN    dbo.Facturas        AS f ON df.InvoiceID = f.InvoiceID
GROUP BY YEAR(f.InvoiceDate), df.StockItemID;

SELECT  v.Anio, v.StockItemID, SUM(v.Ganancia) AS Ganancia
INTO    #GananciaNuevo
FROM    Estadisticas.vw_GananciaProductoAnio AS v WITH (NOEXPAND)
GROUP BY v.Anio, v.StockItemID;

INSERT INTO @Resultados
SELECT N'Ganancia por producto - consolidado',
       (SELECT COUNT(*) FROM #GananciaOriginal),
       (SELECT COUNT(*) FROM (SELECT * FROM #GananciaOriginal EXCEPT SELECT * FROM #GananciaNuevo) AS sobran)
     + (SELECT COUNT(*) FROM (SELECT * FROM #GananciaNuevo EXCEPT SELECT * FROM #GananciaOriginal) AS faltan);

/*--------------------- 4. Rotación de inventario (Limón, todos los años) ---------------------*/
EXEC sys.sp_set_session_context @key = N'Sucursal', @value = 2;

DECLARE @InicioOriginal DATETIME2, @FinOriginal DATETIME2, @InicioNuevo DATETIME2, @FinNuevo DATETIME2;

SELECT @InicioOriginal = MIN(TransactionOccurredWhen), @FinOriginal = DATEADD(DAY, 1, MAX(TransactionOccurredWhen))
FROM   dbo.ProductosTransacciones;

SELECT @InicioNuevo = PrimerMovimiento, @FinNuevo = DATEADD(DAY, 1, UltimoMovimiento)
FROM   Estadisticas.RangoMovimientos
WHERE  SucursalID = 2;

SELECT  pt.StockItemID, SUM(ABS(pt.Quantity)) AS Cantidad
INTO    #ConsumoOriginal
FROM    dbo.ProductosTransacciones AS pt
WHERE   pt.Quantity < 0
  AND   pt.TransactionOccurredWhen >= @InicioOriginal
  AND   pt.TransactionOccurredWhen <  @FinOriginal
GROUP BY pt.StockItemID;

SELECT  c.StockItemID, SUM(c.Cantidad) AS Cantidad
INTO    #ConsumoNuevo
FROM    Estadisticas.ConsumoProductoAnio AS c
WHERE   c.SucursalID = 2
GROUP BY c.StockItemID;

INSERT INTO @Resultados
SELECT N'Rotación - periodo (primera y última fecha)', 1,
       CASE WHEN @InicioOriginal = @InicioNuevo AND @FinOriginal = @FinNuevo THEN 0 ELSE 1 END;

INSERT INTO @Resultados
SELECT N'Rotación - consumo por producto, Limón',
       (SELECT COUNT(*) FROM #ConsumoOriginal),
       (SELECT COUNT(*) FROM (SELECT * FROM #ConsumoOriginal EXCEPT SELECT * FROM #ConsumoNuevo) AS sobran)
     + (SELECT COUNT(*) FROM (SELECT * FROM #ConsumoNuevo EXCEPT SELECT * FROM #ConsumoOriginal) AS faltan);

EXEC sys.sp_set_session_context @key = N'Sucursal', @value = NULL;

/* Todas las diferencias deben ser 0. */
SELECT Comparacion, Filas, Diferencias,
       CASE WHEN Diferencias = 0 THEN N'OK' ELSE N'REVISAR' END AS Resultado
FROM   @Resultados;
