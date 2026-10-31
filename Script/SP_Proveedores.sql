USE WideWorldImporters;

GO

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Procedimientos almacenados del módulo de proveedores
*
* DESCRIPCION: Contiene los procedimientos utilizados para listar, consultar,
*              insertar, actualizar y eliminar proveedores.
*
* TIPOS DE ERROR:
*     1 = falta un dato obligatorio o el formato es malo
*     2 = valor fuera de rango
*     3 = un registro relacionado no existe
*     4 = duplicado
*     5 = el proveedor no existe
*     6 = el proveedor tiene registros relacionados y no se puede borrar
*
*-----------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Proveedores_Listar
*
* DESCRIPCION: Devuelve la lista de proveedores para la tabla principal.
*              Permite filtrar por nombre, categoría y método de entrega.
*
* ENTRADA:
*     @Nombre          nombre o parte del nombre del proveedor.
*     @Categoria       nombre o parte de la categoría.
*     @MetodoEntrega   nombre o parte del método de entrega.
*
* SALIDA: Lista de proveedores con su identificador, nombre, categoría
*         y método de entrega.
*
* RESTRICCIONES: Los filtros son opcionales y se aplican de forma acumulativa.
*                Los resultados se ordenan alfabéticamente.
*
* OBJETIVO: Obtener los proveedores que se mostrarán en la tabla principal.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Listar
    @Nombre NVARCHAR(100) = NULL,
    @Categoria NVARCHAR(100) = NULL,
    @MetodoEntrega NVARCHAR(100) = NULL
AS
BEGIN
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT
        p.SupplierID,
        p.SupplierName AS Nombre_Proveedor,
        cat.SupplierCategoryName AS Categoria_Proveedor,
        dm.DeliveryMethodName AS Metodo_Entrega

    FROM dbo.ProveedoresActuales AS p

    /* Obtiene la categoría correspondiente al proveedor. */
    INNER JOIN dbo.CategoriaProveedores AS cat
        ON p.SupplierCategoryID = cat.SupplierCategoryID

    /* Obtiene el método de entrega correspondiente. */
    INNER JOIN dbo.FormasEntrega AS dm
        ON p.DeliveryMethodID = dm.DeliveryMethodID

    WHERE
        (@Nombre IS NULL OR p.SupplierName LIKE '%' + @Nombre + '%')
        AND
        (@Categoria IS NULL OR cat.SupplierCategoryName LIKE '%' + @Categoria + '%')
        AND
        (@MetodoEntrega IS NULL OR dm.DeliveryMethodName LIKE '%' + @MetodoEntrega + '%')

    /* Ordena los proveedores de la A a la Z. */
    ORDER BY p.SupplierName ASC;
END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Proveedores_Detalle
*
* DESCRIPCION: Devuelve toda la información disponible de uno o varios proveedores.
*
* ENTRADA:
*     @SupplierID  identificador o lista de identificadores de proveedores.
*
* SALIDA: Información detallada del proveedor, categoría, contactos,
*         método de entrega, ciudades, información bancaria, direcciones
*         y ubicación geográfica.
*
* RESTRICCIONES: Los identificadores deben ser valores numéricos separados por coma.
*
* OBJETIVO: Obtener la información completa de un proveedor para mostrarla
*           en la ventana de detalle.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Detalle
    @SupplierID NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT
        p.SupplierID,
        p.SupplierName AS Nombre_Proveedor,
        p.SupplierCategoryID AS Categoria_ID,
        cat.SupplierCategoryName AS Categoria,
        p.PrimaryContactPersonID AS Contacto_Primario_ID,
        p1.FullName AS Contacto_Primario,
        p.AlternateContactPersonID AS Contacto_Alternativo_ID,
        p2.FullName AS Contacto_Alternativo,
        p.DeliveryMethodID AS Metodo_Entrega_ID,
        dm.DeliveryMethodName AS Metodo_Entrega,
        p.DeliveryCityID AS Ciudad_Entrega_ID,
        ciu.CityName AS Ciudad_Entrega,
        p.DeliveryPostalCode AS Codigo_Postal,
        p.SupplierReference AS Referencia_Proveedor,
        p.BankAccountName AS Nombre_Cuenta_Bancaria,
        p.BankAccountBranch AS Sucursal_Cuenta_Bancaria,
        p.BankAccountNumber AS Numero_Cuenta_Bancaria,
        p.BankInternationalCode AS Codigo_Bancario_Internacional,
        p.PaymentDays AS Dias_De_Gracia,
        p.PhoneNumber AS Telefono,
        p.FaxNumber AS Fax,
        p.WebsiteURL AS Sitio_Web,
        p.DeliveryAddressLine1 AS Direccion_Entrega1,
        p.DeliveryAddressLine2 AS Direccion_Entrega2,
        p.DeliveryPostalCode AS Codigo_Postal_Entrega,
        p.PostalAddressLine1 AS Direccion_Postal1,
        p.PostalAddressLine2 AS Direccion_Postal2,
        p.DeliveryLocation.Lat AS Latitud,
        p.DeliveryLocation.Long AS Longitud,
        p.PostalCityID AS Ciudad_Postal_ID,
        p.PostalPostalCode AS Codigo_Postal_Postal

    FROM dbo.ProveedoresActuales AS p

    /* Obtiene la categoría del proveedor. */
    INNER JOIN dbo.CategoriaProveedores AS cat
        ON p.SupplierCategoryID = cat.SupplierCategoryID

    /* Obtiene los contactos relacionados. */
    LEFT JOIN dbo.Contactos AS p1
        ON p.PrimaryContactPersonID = p1.PersonID

    LEFT JOIN dbo.Contactos AS p2
        ON p.AlternateContactPersonID = p2.PersonID

    /* Obtiene el método de entrega. */
    LEFT JOIN dbo.FormasEntrega AS dm
        ON p.DeliveryMethodID = dm.DeliveryMethodID

    /* Obtiene la ciudad de entrega. */
    LEFT JOIN dbo.Ciudades AS ciu
        ON p.DeliveryCityID = ciu.CityID

    WHERE p.SupplierID IN
    (
        /* Permite recibir uno o varios IDs separados por coma. */
        SELECT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@SupplierID, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL
    );
END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Proveedores_Insertar
*
* DESCRIPCION: Registra un nuevo proveedor en la base de datos.
*
* ENTRADA: Datos del proveedor, categoría, contactos, método de entrega,
*          ciudades, información bancaria, direcciones, ubicación y usuario.
*
* SALIDA: Identificador del nuevo proveedor.
*
* RESTRICCIONES: Verifica datos obligatorios, rangos válidos, registros relacionados
*                existentes y que no exista otro proveedor con el mismo nombre.
*
* OBJETIVO: Crear un proveedor de forma segura utilizando una transacción.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Insertar
    @Nombre NVARCHAR(100),
    @CategoriaID INT,
    @ContactoPrimarioID INT,
    @ContactoAlternativoID INT = NULL,
    @MetodoEntregaID INT,
    @CiudadEntregaID INT,
    @CiudadPostalID INT,
    @ReferenciaProveedor NVARCHAR(20) = NULL,
    @NombreCuentaBancaria NVARCHAR(50) = NULL,
    @SucursalBancaria NVARCHAR(50) = NULL,
    @CodigoBanco NVARCHAR(20) = NULL,
    @NumeroCuentaBancaria NVARCHAR(50) = NULL,
    @CodigoInternacionalBanco NVARCHAR(20) = NULL,
    @DiasPago INT = 7,
    @ComentariosInternos NVARCHAR(MAX) = NULL,
    @Telefono NVARCHAR(20),
    @Fax NVARCHAR(20) = '',
    @SitioWeb NVARCHAR(256) = '',
    @DireccionEntrega1 NVARCHAR(60),
    @DireccionEntrega2 NVARCHAR(60) = NULL,
    @CodigoPostalEntrega NVARCHAR(10),
    @UbicacionEntrega GEOGRAPHY = NULL,
    @DireccionPostal1 NVARCHAR(60),
    @DireccionPostal2 NVARCHAR(60) = NULL,
    @CodigoPostalPostal NVARCHAR(10),
    @UsuarioID INT = 1
AS
BEGIN

    /* Establece valores vacíos para campos opcionales. */
    IF @Fax IS NULL
        SET @Fax = '';

    IF @SitioWeb IS NULL
        SET @SitioWeb = '';

    /* Verifica los datos obligatorios. */
    IF @Nombre IS NULL OR @Nombre = ''
    BEGIN
        RAISERROR('El nombre del proveedor es obligatorio.', 16, 1);
        RETURN;
    END

    IF @CategoriaID IS NULL
    BEGIN
        RAISERROR('La categoría es obligatoria.', 16, 1);
        RETURN;
    END

    IF @ContactoPrimarioID IS NULL
    BEGIN
        RAISERROR('El contacto primario es obligatorio.', 16, 1);
        RETURN;
    END

    IF @MetodoEntregaID IS NULL
    BEGIN
        RAISERROR('El método de entrega es obligatorio.', 16, 1);
        RETURN;
    END

    IF @CiudadEntregaID IS NULL
    BEGIN
        RAISERROR('La ciudad de entrega es obligatoria.', 16, 1);
        RETURN;
    END

    IF @CiudadPostalID IS NULL
    BEGIN
        RAISERROR('La ciudad postal es obligatoria.', 16, 1);
        RETURN;
    END

    IF @Telefono IS NULL OR @Telefono = ''
    BEGIN
        RAISERROR('El teléfono es obligatorio.', 16, 1);
        RETURN;
    END

    IF @DireccionEntrega1 IS NULL OR @DireccionEntrega1 = ''
    BEGIN
        RAISERROR('La dirección de entrega 1 es obligatoria.', 16, 1);
        RETURN;
    END

    IF @CodigoPostalEntrega IS NULL OR @CodigoPostalEntrega = ''
    BEGIN
        RAISERROR('El código postal de entrega es obligatorio.', 16, 1);
        RETURN;
    END

    IF @DireccionPostal1 IS NULL OR @DireccionPostal1 = ''
    BEGIN
        RAISERROR('La dirección postal 1 es obligatoria.', 16, 1);
        RETURN;
    END

    IF @CodigoPostalPostal IS NULL OR @CodigoPostalPostal = ''
    BEGIN
        RAISERROR('El código postal de dirección postal es obligatorio.', 16, 1);
        RETURN;
    END

    /* Verifica el formato del sitio web. */
    IF @SitioWeb <> '' AND @SitioWeb NOT LIKE 'http%'
    BEGIN
        RAISERROR('El sitio web debe empezar con http', 16, 1);
        RETURN;
    END

    /* Verifica que los días de pago estén dentro del rango permitido. */
    IF @DiasPago < 0 OR @DiasPago > 365
    BEGIN
        RAISERROR('Los días de pago deben estar entre 0 y 365.', 16, 2);
        RETURN;
    END

    /* Verifica que la categoría exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.CategoriaProveedores
        WHERE SupplierCategoryID = @CategoriaID
    )
    BEGIN
        RAISERROR('La categoría indicada no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que el contacto primario exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @ContactoPrimarioID
    )
    BEGIN
        RAISERROR('El contacto primario indicado no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que el contacto alternativo exista cuando se proporciona. */
    IF @ContactoAlternativoID IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Contactos
            WHERE PersonID = @ContactoAlternativoID
        )
    BEGIN
        RAISERROR('El contacto alternativo indicado no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que el método de entrega exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.FormasEntrega
        WHERE DeliveryMethodID = @MetodoEntregaID
    )
    BEGIN
        RAISERROR('El método de entrega indicado no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que la ciudad de entrega exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Ciudades
        WHERE CityID = @CiudadEntregaID
    )
    BEGIN
        RAISERROR('La ciudad de entrega indicada no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que la ciudad postal exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Ciudades
        WHERE CityID = @CiudadPostalID
    )
    BEGIN
        RAISERROR('La ciudad postal indicada no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que el usuario que registra exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @UsuarioID
    )
    BEGIN
        RAISERROR('El usuario que registra no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que no exista otro proveedor con el mismo nombre. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ProveedoresActuales
        WHERE SupplierName = @Nombre
    )
    BEGIN
        RAISERROR('Ya existe un proveedor con ese nombre.', 16, 4);
        RETURN;
    END

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* Inserta el nuevo proveedor. */
        INSERT INTO dbo.ProveedoresActuales
        (
            SupplierName,
            SupplierCategoryID,
            PrimaryContactPersonID,
            AlternateContactPersonID,
            DeliveryMethodID,
            DeliveryCityID,
            PostalCityID,
            SupplierReference,
            BankAccountName,
            BankAccountBranch,
            BankAccountCode,
            BankAccountNumber,
            BankInternationalCode,
            PaymentDays,
            InternalComments,
            PhoneNumber,
            FaxNumber,
            WebsiteURL,
            DeliveryAddressLine1,
            DeliveryAddressLine2,
            DeliveryPostalCode,
            DeliveryLocation,
            PostalAddressLine1,
            PostalAddressLine2,
            PostalPostalCode,
            LastEditedBy
        )
        VALUES
        (
            @Nombre,
            @CategoriaID,
            @ContactoPrimarioID,
            @ContactoAlternativoID,
            @MetodoEntregaID,
            @CiudadEntregaID,
            @CiudadPostalID,
            @ReferenciaProveedor,
            @NombreCuentaBancaria,
            @SucursalBancaria,
            @CodigoBanco,
            @NumeroCuentaBancaria,
            @CodigoInternacionalBanco,
            @DiasPago,
            @ComentariosInternos,
            @Telefono,
            @Fax,
            @SitioWeb,
            @DireccionEntrega1,
            @DireccionEntrega2,
            @CodigoPostalEntrega,
            @UbicacionEntrega,
            @DireccionPostal1,
            @DireccionPostal2,
            @CodigoPostalPostal,
            @UsuarioID
        );

        /* Obtiene el ID generado para el nuevo proveedor. */
        DECLARE @NuevoID INT;

        SELECT @NuevoID = SupplierID
        FROM dbo.ProveedoresActuales
        WHERE SupplierName = @Nombre;

        COMMIT TRANSACTION;

        SELECT @NuevoID AS SupplierID;

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
* NOMBRE: SP_Proveedores_Actualizar
*
* DESCRIPCION: Modifica los datos de un proveedor existente.
*
* ENTRADA: ID del proveedor y sus nuevos datos generales, contactos,
*          método de entrega, ciudades, información bancaria y direcciones.
*
* SALIDA: Identificador del proveedor actualizado.
*
* RESTRICCIONES: El proveedor debe existir. También se validan datos obligatorios,
*                rangos, registros relacionados y nombres duplicados.
*
* OBJETIVO: Actualizar un proveedor de forma segura utilizando una transacción.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Actualizar
    @SupplierID INT,
    @Nombre NVARCHAR(100),
    @CategoriaID INT,
    @ContactoPrimarioID INT,
    @ContactoAlternativoID INT = NULL,
    @MetodoEntregaID INT,
    @CiudadEntregaID INT,
    @CiudadPostalID INT,
    @ReferenciaProveedor NVARCHAR(20) = NULL,
    @NombreCuentaBancaria NVARCHAR(50) = NULL,
    @SucursalBancaria NVARCHAR(50) = NULL,
    @CodigoBanco NVARCHAR(20) = NULL,
    @NumeroCuentaBancaria NVARCHAR(50) = NULL,
    @CodigoInternacionalBanco NVARCHAR(20) = NULL,
    @DiasPago INT = 7,
    @ComentariosInternos NVARCHAR(MAX) = NULL,
    @Telefono NVARCHAR(20),
    @Fax NVARCHAR(20) = '',
    @SitioWeb NVARCHAR(256) = '',
    @DireccionEntrega1 NVARCHAR(60),
    @DireccionEntrega2 NVARCHAR(60) = NULL,
    @CodigoPostalEntrega NVARCHAR(10),
    @UbicacionEntrega GEOGRAPHY = NULL,
    @DireccionPostal1 NVARCHAR(60),
    @DireccionPostal2 NVARCHAR(60) = NULL,
    @CodigoPostalPostal NVARCHAR(10),
    @UsuarioID INT = 1
AS
BEGIN

    /* Establece valores vacíos para campos opcionales. */
    IF @Fax IS NULL
        SET @Fax = '';

    IF @SitioWeb IS NULL
        SET @SitioWeb = '';

    /* Verifica que se haya proporcionado el identificador. */
    IF @SupplierID IS NULL
    BEGIN
        RAISERROR('El SupplierID es obligatorio.', 16, 1);
        RETURN;
    END

    IF EXISTS
    (
        SELECT 1
        FROM dbo.ProveedoresActuales
        WHERE SupplierName = @Nombre
          AND SupplierID <> @SupplierID
    )

    /* Verifica que el proveedor exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProveedoresActuales
        WHERE SupplierID = @SupplierID
    )
    BEGIN
        RAISERROR('El proveedor que intenta actualizar no existe.', 16, 5);
        RETURN;
    END

    /* Verifica los datos obligatorios. */
    IF @Nombre IS NULL OR @Nombre = ''
    BEGIN
        RAISERROR('El nombre del proveedor es obligatorio.', 16, 1);
        RETURN;
    END

    IF @CategoriaID IS NULL
    BEGIN
        RAISERROR('La categoría es obligatoria.', 16, 1);
        RETURN;
    END

    IF @ContactoPrimarioID IS NULL
    BEGIN
        RAISERROR('El contacto primario es obligatorio.', 16, 1);
        RETURN;
    END

    IF @MetodoEntregaID IS NULL
    BEGIN
        RAISERROR('El método de entrega es obligatorio.', 16, 1);
        RETURN;
    END

    IF @CiudadEntregaID IS NULL
    BEGIN
        RAISERROR('La ciudad de entrega es obligatoria.', 16, 1);
        RETURN;
    END

    IF @CiudadPostalID IS NULL
    BEGIN
        RAISERROR('La ciudad postal es obligatoria.', 16, 1);
        RETURN;
    END

    IF @Telefono IS NULL OR @Telefono = ''
    BEGIN
        RAISERROR('El teléfono es obligatorio.', 16, 1);
        RETURN;
    END

    IF @DireccionEntrega1 IS NULL OR @DireccionEntrega1 = ''
    BEGIN
        RAISERROR('La dirección de entrega 1 es obligatoria.', 16, 1);
        RETURN;
    END

    IF @CodigoPostalEntrega IS NULL OR @CodigoPostalEntrega = ''
    BEGIN
        RAISERROR('El código postal de entrega es obligatorio.', 16, 1);
        RETURN;
    END

    IF @DireccionPostal1 IS NULL OR @DireccionPostal1 = ''
    BEGIN
        RAISERROR('La dirección postal 1 es obligatoria.', 16, 1);
        RETURN;
    END

    IF @CodigoPostalPostal IS NULL OR @CodigoPostalPostal = ''
    BEGIN
        RAISERROR('El código postal de dirección postal es obligatorio.', 16, 1);
        RETURN;
    END

    /* Verifica el formato del sitio web. */
    IF @SitioWeb <> '' AND @SitioWeb NOT LIKE 'http%'
    BEGIN
        RAISERROR('El sitio web debe empezar con http', 16, 1);
        RETURN;
    END

    /* Verifica el rango permitido para los días de pago. */
    IF @DiasPago < 0 OR @DiasPago > 365
    BEGIN
        RAISERROR('Los días de pago deben estar entre 0 y 365.', 16, 2);
        RETURN;
    END

    /* Verifica que la categoría exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.CategoriaProveedores
        WHERE SupplierCategoryID = @CategoriaID
    )
    BEGIN
        RAISERROR('La categoría indicada no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que el contacto primario exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @ContactoPrimarioID
    )
    BEGIN
        RAISERROR('El contacto primario indicado no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que el contacto alternativo exista cuando se proporciona. */
    IF @ContactoAlternativoID IS NOT NULL
        AND NOT EXISTS
        (
            SELECT 1
            FROM dbo.Contactos
            WHERE PersonID = @ContactoAlternativoID
        )
    BEGIN
        RAISERROR('El contacto alternativo indicado no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que el método de entrega exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.FormasEntrega
        WHERE DeliveryMethodID = @MetodoEntregaID
    )
    BEGIN
        RAISERROR('El método de entrega indicado no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que la ciudad de entrega exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Ciudades
        WHERE CityID = @CiudadEntregaID
    )
    BEGIN
        RAISERROR('La ciudad de entrega indicada no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que la ciudad postal exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Ciudades
        WHERE CityID = @CiudadPostalID
    )
    BEGIN
        RAISERROR('La ciudad postal indicada no existe.', 16, 3);
        RETURN;
    END

    /* Verifica que el usuario que registra exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @UsuarioID
    )
    BEGIN
        RAISERROR('El usuario que registra no existe.', 16, 3);
        RETURN;
    END

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* Actualiza los datos del proveedor. */
        UPDATE dbo.ProveedoresActuales
        SET
            SupplierName = @Nombre,
            SupplierCategoryID = @CategoriaID,
            PrimaryContactPersonID = @ContactoPrimarioID,
            AlternateContactPersonID = @ContactoAlternativoID,
            DeliveryMethodID = @MetodoEntregaID,
            DeliveryCityID = @CiudadEntregaID,
            PostalCityID = @CiudadPostalID,
            SupplierReference = @ReferenciaProveedor,
            BankAccountName = @NombreCuentaBancaria,
            BankAccountBranch = @SucursalBancaria,
            BankAccountCode = @CodigoBanco,
            BankAccountNumber = @NumeroCuentaBancaria,
            BankInternationalCode = @CodigoInternacionalBanco,
            PaymentDays = @DiasPago,
            InternalComments = @ComentariosInternos,
            PhoneNumber = @Telefono,
            FaxNumber = @Fax,
            WebsiteURL = @SitioWeb,
            DeliveryAddressLine1 = @DireccionEntrega1,
            DeliveryAddressLine2 = @DireccionEntrega2,
            DeliveryPostalCode = @CodigoPostalEntrega,
            DeliveryLocation = @UbicacionEntrega,
            PostalAddressLine1 = @DireccionPostal1,
            PostalAddressLine2 = @DireccionPostal2,
            PostalPostalCode = @CodigoPostalPostal,
            LastEditedBy = @UsuarioID
        WHERE SupplierID = @SupplierID;

        COMMIT TRANSACTION;

        SELECT @SupplierID AS SupplierID;

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
* NOMBRE: SP_Proveedores_Eliminar
*
* DESCRIPCION: Elimina un proveedor solamente cuando no posee registros
*              relacionados que impidan su eliminación.
*
* ENTRADA:
*     @SupplierID  identificador del proveedor que se desea eliminar.
*
* SALIDA: Identificador del proveedor eliminado.
*
* RESTRICCIONES: No permite eliminar proveedores que tengan órdenes de compra,
*                transacciones, artículos en inventario o movimientos de inventario.
*
* OBJETIVO: Eliminar un proveedor de forma segura utilizando una transacción.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Eliminar
    @SupplierID INT
AS
BEGIN

    /* Verifica que se haya proporcionado el identificador. */
    IF @SupplierID IS NULL
    BEGIN
        RAISERROR('El Supplier es obligatorio.', 16, 1);
        RETURN;
    END

    /* Verifica que el proveedor exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProveedoresActuales
        WHERE SupplierID = @SupplierID
    )
    BEGIN
        RAISERROR('El proveedor que intenta eliminar no existe.', 16, 5);
        RETURN;
    END

    /* Verifica si el proveedor tiene órdenes de compra. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.OrdenesCompra
        WHERE SupplierID = @SupplierID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el proveedor tiene ordenes de compra.',
            16,
            6
        );
        RETURN;
    END

    /* Verifica si el proveedor tiene transacciones. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.TransaccionesProveedores
        WHERE SupplierID = @SupplierID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el proveedor tiene transacciones.',
            16,
            6
        );
        RETURN;
    END

    /* Verifica si existen productos asociados al proveedor. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ProductosActuales
        WHERE SupplierID = @SupplierID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el proveedor tiene artículos en inventario.',
            16,
            6
        );
        RETURN;
    END

    /* Verifica si existen movimientos de inventario asociados. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ProductosTransacciones
        WHERE SupplierID = @SupplierID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el proveedor tiene movimientos de inventario.',
            16,
            6
        );
        RETURN;
    END

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* Elimina el proveedor. */
        DELETE FROM dbo.ProveedoresActuales
        WHERE SupplierID = @SupplierID;

        COMMIT TRANSACTION;

        SELECT @SupplierID AS SupplierID_Eliminado;

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
* NOMBRE: SP_Proveedores_Opciones
*
* DESCRIPCION: Obtiene las opciones necesarias para llenar los campos
*              desplegables del formulario de proveedores.
*
* ENTRADA: No recibe parámetros.
*
* SALIDA: Devuelve cuatro conjuntos de resultados:
*         categorías de proveedores, contactos, métodos de entrega y ciudades.
*
* RESTRICCIONES: Las opciones se obtienen de los registros disponibles
*                en la base de datos.
*
* OBJETIVO: Proporcionar al frontend las opciones necesarias para crear
*           o editar proveedores.
*
*-----------------------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.SP_Proveedores_Opciones
AS
BEGIN
    SET NOCOUNT ON;

    /* 1. Categorías de proveedores. */
    SELECT
        SupplierCategoryID AS ID,
        SupplierCategoryName AS Nombre
    FROM dbo.CategoriaProveedores
    ORDER BY SupplierCategoryName;

    /* 2. Contactos disponibles. */
    SELECT
        PersonID AS ID,
        FullName AS Nombre
    FROM dbo.Contactos
    WHERE IsSalesperson = 0
    ORDER BY FullName;

    /* 3. Métodos de entrega. */
    SELECT
        DeliveryMethodID AS ID,
        DeliveryMethodName AS Nombre
    FROM dbo.FormasEntrega
    ORDER BY DeliveryMethodName;

    /* 4. Ciudades disponibles. */
    SELECT
        CityID AS ID,
        CityName AS Nombre
    FROM dbo.Ciudades
    ORDER BY CityName;
END;

GO