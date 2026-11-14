/*---------------------------------------------------------------------------------------*
*
* SCRIPT: SP_Formularios_Rapidos.sql (NUEVO PY2)
*
* OBJETIVO: Que los formularios de Agregar / Modificar abran rápido y que Modificar
* muestre TODOS los datos originales.
*
*   1. SP_Ciudades_Buscar: busca ciudades por texto (máximo 20 resultados).
*      Antes se mandaban ~38 000 ciudades a cada formulario de Clientes y Proveedores.
*   2. SP_Clientes_Opciones / SP_Proveedores_Opciones: ya NO devuelven ciudades.
*   3. SP_Proveedores_Detalle: ahora devuelve el código bancario, los comentarios
*      internos y la ciudad postal. Antes faltaban, el formulario de Modificar los
*      dejaba vacíos y al guardar se borraban.
*
* EJECUTAR DESPUÉS de SP_Clientes.sql y SP_Proveedores.sql.
*
*-----------------------------------------------------------------------------------------*/
USE WideWorldImporters;
GO

/*---------------------------------------------------------------------------------------*
* NOMBRE: SP_Ciudades_Buscar
* ENTRADA: @Texto  -> parte inicial del nombre de la ciudad (mínimo 2 letras).
*          @CityID -> si viene, devuelve solo esa ciudad (para mostrar el nombre
*                     de la ciudad original al abrir Modificar).
* SALIDA:  ID, Nombre ("Ciudad, Estado"). Máximo 20 filas.
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
* NOMBRE: SP_Clientes_Opciones (CORREGIDO PY2)
* SALIDA: 1) categorías 2) grupos de compra 3) contactos 4) clientes
*         5) métodos de entrega. (Las ciudades ahora se buscan con SP_Ciudades_Buscar.)
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
* NOMBRE: SP_Proveedores_Opciones (CORREGIDO PY2)
* SALIDA: 1) categorías 2) contactos 3) métodos de entrega. (Sin ciudades.)
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
* NOMBRE: SP_Proveedores_Detalle (CORREGIDO PY2)
* CAMBIO: se agregan Codigo_Cuenta_Bancaria, Comentarios_Internos y Ciudad_Postal,
*         que el formulario de Modificar necesita para mostrar los datos originales.
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Detalle
    @SupplierID NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.SupplierID,
        p.SupplierName              AS Nombre_Proveedor,
        p.SupplierCategoryID        AS Categoria_ID,
        cat.SupplierCategoryName    AS Categoria,
        p.PrimaryContactPersonID    AS Contacto_Primario_ID,
        p1.FullName                 AS Contacto_Primario,
        p.AlternateContactPersonID  AS Contacto_Alternativo_ID,
        p2.FullName                 AS Contacto_Alternativo,
        p.DeliveryMethodID          AS Metodo_Entrega_ID,
        dm.DeliveryMethodName       AS Metodo_Entrega,
        p.DeliveryCityID            AS Ciudad_Entrega_ID,
        ciu.CityName                AS Ciudad_Entrega,
        p.DeliveryPostalCode        AS Codigo_Postal,
        p.SupplierReference         AS Referencia_Proveedor,
        p.BankAccountName           AS Nombre_Cuenta_Bancaria,
        p.BankAccountBranch         AS Sucursal_Cuenta_Bancaria,
        p.BankAccountCode           AS Codigo_Cuenta_Bancaria,      -- NUEVO
        p.BankAccountNumber         AS Numero_Cuenta_Bancaria,
        p.BankInternationalCode     AS Codigo_Bancario_Internacional,
        p.PaymentDays               AS Dias_De_Gracia,
        p.InternalComments          AS Comentarios_Internos,        -- NUEVO
        p.PhoneNumber               AS Telefono,
        p.FaxNumber                 AS Fax,
        p.WebsiteURL                AS Sitio_Web,
        p.DeliveryAddressLine1      AS Direccion_Entrega1,
        p.DeliveryAddressLine2      AS Direccion_Entrega2,
        p.DeliveryPostalCode        AS Codigo_Postal_Entrega,
        p.PostalAddressLine1        AS Direccion_Postal1,
        p.PostalAddressLine2        AS Direccion_Postal2,
        p.DeliveryLocation.Lat      AS Latitud,
        p.DeliveryLocation.Long     AS Longitud,
        p.PostalCityID              AS Ciudad_Postal_ID,
        pc.CityName                 AS Ciudad_Postal,               -- NUEVO
        p.PostalPostalCode          AS Codigo_Postal_Postal
    FROM dbo.ProveedoresActuales AS p
    INNER JOIN dbo.CategoriaProveedores AS cat ON p.SupplierCategoryID = cat.SupplierCategoryID
    LEFT JOIN dbo.Contactos     AS p1  ON p.PrimaryContactPersonID = p1.PersonID
    LEFT JOIN dbo.Contactos     AS p2  ON p.AlternateContactPersonID = p2.PersonID
    LEFT JOIN dbo.FormasEntrega AS dm  ON p.DeliveryMethodID = dm.DeliveryMethodID
    LEFT JOIN dbo.Ciudades      AS ciu ON p.DeliveryCityID = ciu.CityID
    LEFT JOIN dbo.Ciudades      AS pc  ON p.PostalCityID = pc.CityID
    WHERE p.SupplierID IN
    (
        SELECT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@SupplierID, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL
    );
END
GO

/* PRUEBAS:
EXEC dbo.SP_Ciudades_Buscar @Texto = N'san';
EXEC dbo.SP_Ciudades_Buscar @CityID = 242;
EXEC dbo.SP_Clientes_Opciones;
EXEC dbo.SP_Proveedores_Detalle @SupplierID = N'1';
*/
