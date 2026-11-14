/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Ventas_Listar 
*
* POR QUÉ ESTABA LENTO: el SP anterior devolvía TODAS las facturas (~70 000 filas)
* a la API, la API las mandaba completas al navegador y React las ordenaba, sumaba
* (montoTotal), contaba (clientesUnicos) y cortaba con .slice(). Cada carga movía
* miles de filas por la red y el navegador hacía el trabajo de la base de datos.
*
* AHORA: SQL filtra, ordena, calcula las estadísticas y devuelve SOLO 10 filas.
*
* SALIDA:
*   Resultado 1 -> filas de la página.
*   Resultado 2 -> paginación + estadísticas de las tarjetas (con los mismos filtros).
*
* Reemplaza al SP_Ventas_Listar de SP_Ventas.sql (mismos filtros, dos parámetros nuevos).
*
*-----------------------------------------------------------------------------------------*/
USE WideWorldImporters;
GO

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

/* Prueba:
EXEC dbo.SP_Ventas_Listar @Pagina = 1;
EXEC dbo.SP_Ventas_Listar @Cliente = N'Tailspin', @Pagina = 3;
*/
