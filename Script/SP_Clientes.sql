USE WideWorldImporters;

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Procedimientos almacenados del módulo de clientes
*
* DESCRIPCION:
* Contiene los procedimientos almacenados utilizados para consultar, crear,
* actualizar y eliminar clientes. También incluye un procedimiento para obtener
* las opciones necesarias para los formularios del módulo.
*
* PROCEDIMIENTOS:
* SP_Clientes_Listar
* SP_Clientes_Detalle
* SP_Clientes_Insertar
* SP_Clientes_Actualizar
* SP_Clientes_Eliminar
* SP_Clientes_Opciones
*
* TIPOS DE ERROR:
* 1 = falta un dato obligatorio o el formato es incorrecto.
* 2 = valor fuera de rango.
* 3 = un registro relacionado no existe.
* 4 = registro duplicado.
* 5 = el cliente no existe.
* 6 = el cliente tiene registros relacionados y no puede eliminarse.
*
* ENTRADA:
* Parámetros enviados por las rutas de la API para realizar las diferentes
* operaciones sobre los clientes.
*
* SALIDA:
* Información de clientes, identificadores, opciones para formularios o
* mensajes de error.
*
* RESTRICCIONES:
* Requiere la base de datos WideWorldImporters y los sinónimos utilizados
* por el módulo de clientes.
*
* OBJETIVO:
* Centralizar en la base de datos las operaciones y validaciones relacionadas
* con la gestión de clientes.
*
*-----------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Clientes_Listar
*
* DESCRIPCION:
* Devuelve la lista de clientes para mostrarla en la tabla principal.
* Permite aplicar filtros por nombre, categoría y método de entrega.
* Los filtros son opcionales y pueden utilizarse de manera acumulativa.
*
* ENTRADA:
* @Nombre: nombre o parte del nombre del cliente.
* @Categoria: nombre o parte de la categoría.
* @MetodoEntrega: nombre o parte del método de entrega.
*
* SALIDA:
* CustomerID, nombre del cliente, categoría y método de entrega.
*
* RESTRICCIONES:
* Los filtros pueden ser NULL. Cuando un filtro es NULL no se aplica.
* Los resultados se ordenan alfabéticamente por nombre.
*
* OBJETIVO:
* Permitir consultar y filtrar los clientes registrados.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Listar

    @Nombre NVARCHAR(100) = NULL,

    @Categoria NVARCHAR(100) = NULL,

    @MetodoEntrega NVARCHAR(100) = NULL

AS

BEGIN

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT

        c.CustomerID,

        c.CustomerName AS Nombre_Cliente,

        cat.CustomerCategoryName AS Categoria_Cliente,

        dm.DeliveryMethodName AS Metodo_Entrega

    FROM dbo.ClientesActuales AS c

    INNER JOIN dbo.TiposCliente AS cat
        ON c.CustomerCategoryID = cat.CustomerCategoryID

    INNER JOIN dbo.FormasEntrega AS dm
        ON c.DeliveryMethodID = dm.DeliveryMethodID

    WHERE

        (@Nombre IS NULL OR c.CustomerName LIKE '%' + @Nombre + '%')

        AND

        (@Categoria IS NULL OR cat.CustomerCategoryName LIKE '%' + @Categoria + '%')

        AND

        (@MetodoEntrega IS NULL OR dm.DeliveryMethodName LIKE '%' + @MetodoEntrega + '%')

    ORDER BY c.CustomerName ASC;

END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Clientes_Detalle
*
* DESCRIPCION:
* Devuelve toda la información asociada a uno o varios clientes.
* Recibe uno o varios CustomerID separados por comas.
*
* ENTRADA:
* @CustomerID: identificador o identificadores de clientes separados por comas.
*
* SALIDA:
* Información detallada de los clientes, incluyendo categoría, grupo de compra,
* contactos, método de entrega, ciudad, datos de contacto, crédito, direcciones
* y coordenadas geográficas.
*
* RESTRICCIONES:
* Los identificadores que no sean números enteros válidos son ignorados.
*
* OBJETIVO:
* Permitir consultar el detalle completo de uno o varios clientes.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Detalle

    @CustomerID NVARCHAR(MAX)

AS

BEGIN

    SET NOCOUNT ON;

    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT

        c.CustomerID,

        c.CustomerName AS Nombre_Cliente,

        c.CustomerCategoryID AS Categoria_ID,

        cat.CustomerCategoryName AS Categoria,

        c.BuyingGroupID AS Grupo_Compra_ID,

        bg.BuyingGroupName AS Grupo_Compra,

        c.PrimaryContactPersonID AS Contacto_Primario_ID,

        p1.FullName AS Contacto_Primario,

        c.AlternateContactPersonID AS Contacto_Alternativo_ID,

        p2.FullName AS Contacto_Alternativo,

        c.BillToCustomerID AS Cliente_Por_Facturar_ID,

        bc.CustomerName AS Cliente_Por_Facturar,

        c.DeliveryMethodID AS Metodo_Entrega_ID,

        dm.DeliveryMethodName AS Metodo_Entrega,

        c.DeliveryCityID AS Ciudad_Entrega_ID,

        ciu.CityName AS Ciudad_Entrega,

        c.DeliveryPostalCode AS Codigo_Postal,

        c.PhoneNumber AS Telefono,

        c.FaxNumber AS Fax,

        c.WebsiteURL AS Sitio_Web,

        c.PaymentDays AS Dias_De_Gracia,

        c.CreditLimit AS Limite_Credito,

        c.StandardDiscountPercentage AS Descuento,

        c.DeliveryAddressLine1 AS Direccion_Entrega1,

        c.DeliveryAddressLine2 AS Direccion_Entrega2,

        c.PostalAddressLine1 AS Direccion_Postal1,

        c.PostalAddressLine2 AS Direccion_Postal2,

        c.DeliveryLocation.Lat AS Latitud,

        c.DeliveryLocation.Long AS Longitud

    FROM dbo.ClientesActuales AS c

    INNER JOIN dbo.TiposCliente AS cat
        ON c.CustomerCategoryID = cat.CustomerCategoryID

    LEFT JOIN dbo.GruposCompradores AS bg
        ON c.BuyingGroupID = bg.BuyingGroupID

    LEFT JOIN dbo.Contactos AS p1
        ON c.PrimaryContactPersonID = p1.PersonID

    LEFT JOIN dbo.Contactos AS p2
        ON c.AlternateContactPersonID = p2.PersonID

    LEFT JOIN dbo.ClientesActuales AS bc
        ON c.BillToCustomerID = bc.CustomerID

    LEFT JOIN dbo.FormasEntrega AS dm
        ON c.DeliveryMethodID = dm.DeliveryMethodID

    LEFT JOIN dbo.Ciudades AS ciu
        ON c.DeliveryCityID = ciu.CityID

    WHERE c.CustomerID IN
    (
        SELECT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@CustomerID, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL
    );

END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Clientes_Insertar
*
* DESCRIPCION:
* Registra un nuevo cliente después de validar todos los datos obligatorios,
* rangos y registros relacionados.
*
* La operación utiliza una transacción porque primero inserta el cliente y,
* cuando corresponde, posteriormente actualiza el cliente para que se facture
* a sí mismo.
*
* ENTRADA:
* Datos personales, comerciales, de contacto, dirección, crédito y usuario
* responsable del registro.
*
* SALIDA:
* CustomerID del cliente creado.
*
* RESTRICCIONES:
* Los datos obligatorios deben estar completos.
* Los valores numéricos deben estar dentro de los rangos permitidos.
* Los registros relacionados deben existir.
* No puede existir otro cliente con el mismo nombre.
*
* OBJETIVO:
* Registrar nuevos clientes manteniendo la integridad de la información.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Insertar

    @Nombre NVARCHAR(100),

    @CategoriaID INT,

    @GrupoCompraID INT = NULL,

    @ContactoPrimarioID INT,

    @ContactoAlternativoID INT = NULL,

    @ClienteFacturarID INT = NULL,

    @MetodoEntregaID INT,

    @CiudadEntregaID INT,

    @LimiteCredito DECIMAL(18,2) = NULL,

    @Descuento DECIMAL(18,3) = 0,

    @DiasGracia INT = 7,

    @Telefono NVARCHAR(20),

    @Fax NVARCHAR(20) = '',

    @SitioWeb NVARCHAR(256) = '',

    @DireccionEntrega1 NVARCHAR(60),

    @DireccionEntrega2 NVARCHAR(60) = NULL,

    @CodigoPostal NVARCHAR(10),

    @DireccionPostal1 NVARCHAR(60),

    @DireccionPostal2 NVARCHAR(60) = NULL,

    @UsuarioID INT = 1

AS

BEGIN

    IF @Fax IS NULL
        SET @Fax = '';

    IF @SitioWeb IS NULL
        SET @SitioWeb = '';


    /* Valida que el nombre sea obligatorio. */
    IF @Nombre IS NULL OR @Nombre = ''
    BEGIN
        RAISERROR('El nombre del cliente es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que la categoría sea obligatoria. */
    IF @CategoriaID IS NULL
    BEGIN
        RAISERROR('La categoria es obligatoria.', 16, 1);
        RETURN;
    END


    /* Valida que exista un contacto primario. */
    IF @ContactoPrimarioID IS NULL
    BEGIN
        RAISERROR('El contacto primario es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que exista un método de entrega. */
    IF @MetodoEntregaID IS NULL
    BEGIN
        RAISERROR('El metodo de entrega es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que exista una ciudad de entrega. */
    IF @CiudadEntregaID IS NULL
    BEGIN
        RAISERROR('La ciudad de entrega es obligatoria.', 16, 1);
        RETURN;
    END


    /* Valida que exista un teléfono. */
    IF @Telefono IS NULL OR @Telefono = ''
    BEGIN
        RAISERROR('El telefono es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que exista una dirección de entrega. */
    IF @DireccionEntrega1 IS NULL OR @DireccionEntrega1 = ''
    BEGIN
        RAISERROR('La direccion de entrega es obligatoria.', 16, 1);
        RETURN;
    END


    /* Valida que exista un código postal. */
    IF @CodigoPostal IS NULL OR @CodigoPostal = ''
    BEGIN
        RAISERROR('El codigo postal es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que exista una dirección postal. */
    IF @DireccionPostal1 IS NULL OR @DireccionPostal1 = ''
    BEGIN
        RAISERROR('La direccion postal es obligatoria.', 16, 1);
        RETURN;
    END


    /* Valida el formato básico del sitio web. */
    IF @SitioWeb <> ''
       AND @SitioWeb NOT LIKE 'http%'
    BEGIN
        RAISERROR('El sitio web debe empezar con http', 16, 1);
        RETURN;
    END


    /* Valida el rango permitido para el descuento. */
    IF @Descuento < 0 OR @Descuento > 100
    BEGIN
        RAISERROR('El descuento debe estar entre 0 y 100.', 16, 2);
        RETURN;
    END


    /* Valida el rango permitido para los días de gracia. */
    IF @DiasGracia < 0 OR @DiasGracia > 365
    BEGIN
        RAISERROR('Los dias de gracia deben estar entre 0 y 365.', 16, 2);
        RETURN;
    END


    /* Valida que el límite de crédito no sea negativo. */
    IF @LimiteCredito IS NOT NULL
       AND @LimiteCredito < 0
    BEGIN
        RAISERROR('El limite de credito no puede ser negativo.', 16, 2);
        RETURN;
    END


    /* Valida que la categoría exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.TiposCliente
        WHERE CustomerCategoryID = @CategoriaID
    )
    BEGIN
        RAISERROR('La categoria indicada no existe.', 16, 3);
        RETURN;
    END


    /* Valida que el grupo de compra exista cuando se proporciona. */
    IF @GrupoCompraID IS NOT NULL
       AND NOT EXISTS
       (
           SELECT 1
           FROM dbo.GruposCompradores
           WHERE BuyingGroupID = @GrupoCompraID
       )
    BEGIN
        RAISERROR('El grupo de compra indicado no existe.', 16, 3);
        RETURN;
    END


    /* Valida que el contacto primario exista. */
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


    /* Valida que el contacto alternativo exista cuando se proporciona. */
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


    /* Valida que el cliente de facturación exista cuando se proporciona. */
    IF @ClienteFacturarID IS NOT NULL
       AND NOT EXISTS
       (
           SELECT 1
           FROM dbo.ClientesActuales
           WHERE CustomerID = @ClienteFacturarID
       )
    BEGIN
        RAISERROR('El cliente por facturar indicado no existe.', 16, 3);
        RETURN;
    END


    /* Valida que el método de entrega exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.FormasEntrega
        WHERE DeliveryMethodID = @MetodoEntregaID
    )
    BEGIN
        RAISERROR('El metodo de entrega indicado no existe.', 16, 3);
        RETURN;
    END


    /* Valida que la ciudad de entrega exista. */
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


    /* Valida que el usuario que registra exista. */
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


    /* Valida que no exista otro cliente con el mismo nombre. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerName = @Nombre
    )
    BEGIN
        RAISERROR('Ya existe un cliente con ese nombre.', 16, 4);
        RETURN;
    END


    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    /* Si ocurre un error dentro de la transacción, SQL Server la aborta. */
    SET XACT_ABORT ON;


    BEGIN TRY

        BEGIN TRANSACTION;


        /* Determina el cliente al que se realizará la facturación. */
        DECLARE @FacturarA INT;

        SET @FacturarA = @ClienteFacturarID;


        /* Si no se especifica, se utiliza el cliente recién creado. */
        IF @FacturarA IS NULL
            SET @FacturarA = 1;


        /* Inserta el nuevo cliente. */
        INSERT INTO dbo.ClientesActuales
        (
            CustomerName,
            BillToCustomerID,
            CustomerCategoryID,
            BuyingGroupID,
            PrimaryContactPersonID,
            AlternateContactPersonID,
            DeliveryMethodID,
            DeliveryCityID,
            PostalCityID,
            CreditLimit,
            AccountOpenedDate,
            StandardDiscountPercentage,
            IsStatementSent,
            IsOnCreditHold,
            PaymentDays,
            PhoneNumber,
            FaxNumber,
            WebsiteURL,
            DeliveryAddressLine1,
            DeliveryAddressLine2,
            DeliveryPostalCode,
            PostalAddressLine1,
            PostalAddressLine2,
            PostalPostalCode,
            LastEditedBy
        )
        VALUES
        (
            @Nombre,
            @FacturarA,
            @CategoriaID,
            @GrupoCompraID,
            @ContactoPrimarioID,
            @ContactoAlternativoID,
            @MetodoEntregaID,
            @CiudadEntregaID,
            @CiudadEntregaID,
            @LimiteCredito,
            GETDATE(),
            @Descuento,
            0,
            0,
            @DiasGracia,
            @Telefono,
            @Fax,
            @SitioWeb,
            @DireccionEntrega1,
            @DireccionEntrega2,
            @CodigoPostal,
            @DireccionPostal1,
            @DireccionPostal2,
            @CodigoPostal,
            @UsuarioID
        );


        /* Obtiene el identificador del nuevo cliente. */
        DECLARE @NuevoID INT;

        SELECT @NuevoID = CustomerID
        FROM dbo.ClientesActuales
        WHERE CustomerName = @Nombre;


        /* Si no se indicó cliente de facturación, se factura al mismo cliente. */
        IF @ClienteFacturarID IS NULL
        BEGIN

            UPDATE dbo.ClientesActuales

            SET BillToCustomerID = @NuevoID

            WHERE CustomerID = @NuevoID;

        END


        /* Confirma la transacción. */
        COMMIT TRANSACTION;


        SELECT @NuevoID AS CustomerID;


    END TRY

    BEGIN CATCH

        /* Deshace la transacción cuando ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;

    END CATCH;

END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Clientes_Actualizar
*
* DESCRIPCION:
* Modifica los datos de un cliente existente después de validar la información
* recibida y los registros relacionados.
*
* ENTRADA:
* @CustomerID: identificador del cliente.
* Demás parámetros con la información actualizada del cliente.
*
* SALIDA:
* CustomerID del cliente actualizado.
*
* RESTRICCIONES:
* El cliente debe existir.
* Los datos obligatorios deben estar completos.
* Los registros relacionados deben existir.
* No puede existir otro cliente con el mismo nombre.
*
* OBJETIVO:
* Actualizar la información de un cliente manteniendo la integridad de los datos.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Actualizar

    @CustomerID INT,

    @Nombre NVARCHAR(100),

    @CategoriaID INT,

    @GrupoCompraID INT = NULL,

    @ContactoPrimarioID INT,

    @ContactoAlternativoID INT = NULL,

    @ClienteFacturarID INT = NULL,

    @MetodoEntregaID INT,

    @CiudadEntregaID INT,

    @LimiteCredito DECIMAL(18,2) = NULL,

    @Descuento DECIMAL(18,3) = 0,

    @DiasGracia INT = 7,

    @Telefono NVARCHAR(20),

    @Fax NVARCHAR(20) = '',

    @SitioWeb NVARCHAR(256) = '',

    @DireccionEntrega1 NVARCHAR(60),

    @DireccionEntrega2 NVARCHAR(60) = NULL,

    @CodigoPostal NVARCHAR(10),

    @DireccionPostal1 NVARCHAR(60),

    @DireccionPostal2 NVARCHAR(60) = NULL,

    @UsuarioID INT = 1

AS

BEGIN

    IF @Fax IS NULL
        SET @Fax = '';

    IF @SitioWeb IS NULL
        SET @SitioWeb = '';


    /* Valida que el identificador sea obligatorio. */
    IF @CustomerID IS NULL
    BEGIN
        RAISERROR('El CustomerID es obligatorio.', 16, 1);
        RETURN;
    END


    /* Verifica que el cliente exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR('El cliente que intenta actualizar no existe.', 16, 5);
        RETURN;
    END


    /* Valida que el nombre sea obligatorio. */
    IF @Nombre IS NULL OR @Nombre = ''
    BEGIN
        RAISERROR('El nombre del cliente es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que la categoría sea obligatoria. */
    IF @CategoriaID IS NULL
    BEGIN
        RAISERROR('La categoria es obligatoria.', 16, 1);
        RETURN;
    END


    /* Valida que el contacto primario sea obligatorio. */
    IF @ContactoPrimarioID IS NULL
    BEGIN
        RAISERROR('El contacto primario es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que el método de entrega sea obligatorio. */
    IF @MetodoEntregaID IS NULL
    BEGIN
        RAISERROR('El metodo de entrega es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que la ciudad de entrega sea obligatoria. */
    IF @CiudadEntregaID IS NULL
    BEGIN
        RAISERROR('La ciudad de entrega es obligatoria.', 16, 1);
        RETURN;
    END


    /* Valida que el teléfono sea obligatorio. */
    IF @Telefono IS NULL OR @Telefono = ''
    BEGIN
        RAISERROR('El telefono es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que la dirección de entrega sea obligatoria. */
    IF @DireccionEntrega1 IS NULL OR @DireccionEntrega1 = ''
    BEGIN
        RAISERROR('La direccion de entrega es obligatoria.', 16, 1);
        RETURN;
    END


    /* Valida que el código postal sea obligatorio. */
    IF @CodigoPostal IS NULL OR @CodigoPostal = ''
    BEGIN
        RAISERROR('El codigo postal es obligatorio.', 16, 1);
        RETURN;
    END


    /* Valida que la dirección postal sea obligatoria. */
    IF @DireccionPostal1 IS NULL OR @DireccionPostal1 = ''
    BEGIN
        RAISERROR('La direccion postal es obligatoria.', 16, 1);
        RETURN;
    END


    /* Valida el formato básico del sitio web. */
    IF @SitioWeb <> ''
       AND @SitioWeb NOT LIKE 'http%'
    BEGIN
        RAISERROR('El sitio web debe empezar con http', 16, 1);
        RETURN;
    END


    /* Valida el rango del descuento. */
    IF @Descuento < 0 OR @Descuento > 100
    BEGIN
        RAISERROR('El descuento debe estar entre 0 y 100.', 16, 2);
        RETURN;
    END


    /* Valida el rango de los días de gracia. */
    IF @DiasGracia < 0 OR @DiasGracia > 365
    BEGIN
        RAISERROR('Los dias de gracia deben estar entre 0 y 365.', 16, 2);
        RETURN;
    END


    /* Valida que el límite de crédito no sea negativo. */
    IF @LimiteCredito IS NOT NULL
       AND @LimiteCredito < 0
    BEGIN
        RAISERROR('El limite de credito no puede ser negativo.', 16, 2);
        RETURN;
    END


    /* Verifica que la categoría exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.TiposCliente
        WHERE CustomerCategoryID = @CategoriaID
    )
    BEGIN
        RAISERROR('La categoria indicada no existe.', 16, 3);
        RETURN;
    END


    /* Verifica que el grupo de compra exista. */
    IF @GrupoCompraID IS NOT NULL
       AND NOT EXISTS
       (
           SELECT 1
           FROM dbo.GruposCompradores
           WHERE BuyingGroupID = @GrupoCompraID
       )
    BEGIN
        RAISERROR('El grupo de compra indicado no existe.', 16, 3);
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


    /* Verifica que el contacto alternativo exista. */
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


    /* Verifica que el cliente de facturación exista. */
    IF @ClienteFacturarID IS NOT NULL
       AND NOT EXISTS
       (
           SELECT 1
           FROM dbo.ClientesActuales
           WHERE CustomerID = @ClienteFacturarID
       )
    BEGIN
        RAISERROR('El cliente por facturar indicado no existe.', 16, 3);
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
        RAISERROR('El metodo de entrega indicado no existe.', 16, 3);
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


    /* Verifica que el usuario que realiza el cambio exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Contactos
        WHERE PersonID = @UsuarioID
    )
    BEGIN
        RAISERROR('El usuario que edita no existe.', 16, 3);
        RETURN;
    END


    /* Verifica que no exista otro cliente con el mismo nombre. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerName = @Nombre
          AND CustomerID <> @CustomerID
    )
    BEGIN
        RAISERROR('Ya existe otro cliente con ese nombre.', 16, 4);
        RETURN;
    END


    /* Si no se especifica cliente de facturación, se utiliza el actual. */
    IF @ClienteFacturarID IS NULL
        SET @ClienteFacturarID = @CustomerID;


    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SET XACT_ABORT ON;


    BEGIN TRY

        BEGIN TRANSACTION;


        /* Actualiza la información del cliente. */
        UPDATE dbo.ClientesActuales

        SET

            CustomerName               = @Nombre,

            BillToCustomerID           = @ClienteFacturarID,

            CustomerCategoryID         = @CategoriaID,

            BuyingGroupID              = @GrupoCompraID,

            PrimaryContactPersonID     = @ContactoPrimarioID,

            AlternateContactPersonID   = @ContactoAlternativoID,

            DeliveryMethodID           = @MetodoEntregaID,

            DeliveryCityID             = @CiudadEntregaID,

            PostalCityID               = @CiudadEntregaID,

            CreditLimit                = @LimiteCredito,

            StandardDiscountPercentage = @Descuento,

            PaymentDays                = @DiasGracia,

            PhoneNumber                = @Telefono,

            FaxNumber                  = @Fax,

            WebsiteURL                 = @SitioWeb,

            DeliveryAddressLine1       = @DireccionEntrega1,

            DeliveryAddressLine2       = @DireccionEntrega2,

            DeliveryPostalCode         = @CodigoPostal,

            PostalAddressLine1         = @DireccionPostal1,

            PostalAddressLine2         = @DireccionPostal2,

            PostalPostalCode           = @CodigoPostal,

            LastEditedBy               = @UsuarioID

        WHERE CustomerID = @CustomerID;


        /* Confirma la actualización. */
        COMMIT TRANSACTION;


        SELECT @CustomerID AS CustomerID;


    END TRY

    BEGIN CATCH

        /* Deshace la actualización cuando ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;

    END CATCH;

END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Clientes_Eliminar
*
* DESCRIPCION:
* Elimina un cliente únicamente cuando no posee registros relacionados que
* impidan realizar la eliminación.
*
* ENTRADA:
* @CustomerID: identificador del cliente que se desea eliminar.
*
* SALIDA:
* CustomerID_Eliminado del cliente eliminado.
*
* RESTRICCIONES:
* El cliente debe existir y no debe tener órdenes, facturas, transacciones,
* ofertas especiales, movimientos de inventario ni otros clientes que se
* facturen a él.
*
* OBJETIVO:
* Eliminar clientes manteniendo la integridad referencial de la información.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Eliminar

    @CustomerID INT

AS

BEGIN


    /* Valida que el identificador sea obligatorio. */
    IF @CustomerID IS NULL
    BEGIN
        RAISERROR('El CustomerID es obligatorio.', 16, 1);
        RETURN;
    END


    /* Verifica que el cliente exista. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR('El cliente que intenta eliminar no existe.', 16, 5);
        RETURN;
    END


    /* Verifica si el cliente tiene órdenes. */
    IF EXISTS
    (
        SELECT 1
        FROM Sales.Orders
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el cliente tiene ordenes.',
            16,
            6
        );
        RETURN;
    END


    /* Verifica si el cliente tiene facturas. */
    IF EXISTS
    (
        SELECT 1
        FROM Sales.Invoices
        WHERE CustomerID = @CustomerID
           OR BillToCustomerID = @CustomerID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el cliente tiene facturas.',
            16,
            6
        );
        RETURN;
    END


    /* Verifica si el cliente tiene transacciones. */
    IF EXISTS
    (
        SELECT 1
        FROM Sales.CustomerTransactions
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el cliente tiene transacciones.',
            16,
            6
        );
        RETURN;
    END


    /* Verifica si el cliente tiene ofertas especiales. */
    IF EXISTS
    (
        SELECT 1
        FROM Sales.SpecialDeals
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el cliente tiene ofertas especiales.',
            16,
            6
        );
        RETURN;
    END


    /* Verifica si el cliente tiene movimientos de inventario. */
    IF EXISTS
    (
        SELECT 1
        FROM Warehouse.StockItemTransactions
        WHERE CustomerID = @CustomerID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: el cliente tiene movimientos de inventario.',
            16,
            6
        );
        RETURN;
    END


    /* Verifica si otros clientes se facturan a este cliente. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.ClientesActuales
        WHERE BillToCustomerID = @CustomerID
          AND CustomerID <> @CustomerID
    )
    BEGIN
        RAISERROR(
            'No se puede eliminar: otros clientes se facturan a este cliente.',
            16,
            6
        );
        RETURN;
    END


    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SET XACT_ABORT ON;


    BEGIN TRY

        BEGIN TRANSACTION;


        /* Elimina el cliente. */
        DELETE FROM dbo.ClientesActuales

        WHERE CustomerID = @CustomerID;


        /* Confirma la eliminación. */
        COMMIT TRANSACTION;


        SELECT @CustomerID AS CustomerID_Eliminado;


    END TRY

    BEGIN CATCH

        /* Deshace la eliminación cuando ocurre un error. */
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;

    END CATCH;

END

GO


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SP_Clientes_Opciones
*
* DESCRIPCION:
* Obtiene todas las opciones necesarias para llenar los campos de selección
* utilizados en los formularios del módulo de clientes.
*
* ENTRADA:
* No recibe parámetros.
*
* SALIDA:
* Devuelve seis conjuntos de resultados:
* 1. Categorías.
* 2. Grupos de compra.
* 3. Personas y contactos.
* 4. Clientes para facturación.
* 5. Métodos de entrega.
* 6. Ciudades.
*
* RESTRICCIONES:
* Las tablas utilizadas deben contener la información correspondiente.
*
* OBJETIVO:
* Proporcionar al frontend todas las opciones necesarias mediante una sola
* llamada a la base de datos.
*
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE dbo.SP_Clientes_Opciones

AS

BEGIN

    SET NOCOUNT ON;


    /* 1. Categorías de clientes. */
    SELECT

        CustomerCategoryID AS ID,

        CustomerCategoryName AS Nombre

    FROM Sales.CustomerCategories

    ORDER BY CustomerCategoryName;


    /* 2. Grupos de compra. */
    SELECT

        BuyingGroupID AS ID,

        BuyingGroupName AS Nombre

    FROM Sales.BuyingGroups

    ORDER BY BuyingGroupName;


    /* 3. Personas y contactos disponibles. */
    SELECT

        PersonID AS ID,

        FullName AS Nombre

    FROM Application.People

    WHERE IsSalesperson = 0

    ORDER BY FullName;


    /* 4. Clientes disponibles para facturación. */
    SELECT

        CustomerID AS ID,

        CustomerName AS Nombre

    FROM Sales.Customers

    ORDER BY CustomerName;


    /* 5. Métodos de entrega disponibles. */
    SELECT

        DeliveryMethodID AS ID,

        DeliveryMethodName AS Nombre

    FROM Application.DeliveryMethods

    ORDER BY DeliveryMethodName;


    /* 6. Ciudades disponibles. */
    SELECT

        CityID AS ID,

        CityName AS Nombre

    FROM Application.Cities

    ORDER BY CityName;

END;

GO