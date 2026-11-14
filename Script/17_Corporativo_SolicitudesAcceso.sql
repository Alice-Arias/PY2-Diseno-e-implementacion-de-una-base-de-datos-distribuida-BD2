/*---------------------------------------------------------------------------------------*
* NOMBRE: 17_Corporativo_SolicitudesAcceso.sql
* ENTRADA: Seguridad.Usuarios y las vistas Sensible.*.
* DESCRIPCION: El Administrador pide ver los datos sensibles de un cliente o proveedor y
*   el Corporativo aprueba o rechaza. Con aprobación los ve por unas horas.
* SALIDA: Tabla Seguridad.SolicitudesAcceso y los procedimientos Seguridad.SP_Solicitud*.
* OBJETIVO: Que la regla de acceso se cumpla en la base de datos.
* EJECUTAR: Solo en el Corporativo, después del 03, 09 y 10. Se puede repetir.
*-----------------------------------------------------------------------------------------*/

USE WideWorldImporters;
GO

DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(N'Este script es para el Corporativo, pero el servidor actual es %s. No se hizo ningún cambio.', 16, 1, @Servidor);
    SET NOEXEC ON;
END
GO

/*---------------------------------------------------------------------------------------*
* Tabla
*-----------------------------------------------------------------------------------------*/

IF OBJECT_ID(N'Seguridad.SolicitudesAcceso', N'U') IS NULL
    CREATE TABLE Seguridad.SolicitudesAcceso
    (
        IdSolicitud     INT            IDENTITY(1, 1) NOT NULL CONSTRAINT PK_SolicitudesAcceso PRIMARY KEY,
        IdUsuario       INT            NOT NULL CONSTRAINT FK_SolicitudesAcceso_Usuario REFERENCES Seguridad.Usuarios (iduser),
        SucursalID      TINYINT        NULL,
        TipoEntidad     NVARCHAR(20)   NOT NULL CONSTRAINT CK_SolicitudesAcceso_Tipo CHECK (TipoEntidad IN (N'Cliente', N'Proveedor')),
        EntidadID       INT            NOT NULL,
        NombreEntidad   NVARCHAR(100)  NOT NULL,
        Motivo          NVARCHAR(300)  NULL,
        Estado          NVARCHAR(20)   NOT NULL CONSTRAINT DF_SolicitudesAcceso_Estado DEFAULT (N'Pendiente')
                                       CONSTRAINT CK_SolicitudesAcceso_Estado CHECK (Estado IN (N'Pendiente', N'Aprobada', N'Rechazada')),
        FechaSolicitud  DATETIME2(0)   NOT NULL CONSTRAINT DF_SolicitudesAcceso_Fecha DEFAULT (SYSDATETIME()),
        FechaRespuesta  DATETIME2(0)   NULL,
        RespondidoPor   INT            NULL CONSTRAINT FK_SolicitudesAcceso_Responde REFERENCES Seguridad.Usuarios (iduser),
        VigenteHasta    DATETIME2(0)   NULL
    );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SolicitudesAcceso_Busqueda')
    CREATE INDEX IX_SolicitudesAcceso_Busqueda
        ON Seguridad.SolicitudesAcceso (IdUsuario, TipoEntidad, EntidadID, IdSolicitud DESC);
GO

/*---------------------------------------------------------------------------------------*
* Seguridad.SP_Solicitud_Estado: última solicitud del usuario para un cliente o proveedor.
* Estado: SinSolicitud, Pendiente, Aprobada, Rechazada o Vencida.
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Seguridad.SP_Solicitud_Estado
    @IdUsuario   INT,
    @TipoEntidad NVARCHAR(20),
    @EntidadID   INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Seguridad.SolicitudesAcceso
                   WHERE IdUsuario = @IdUsuario AND TipoEntidad = @TipoEntidad AND EntidadID = @EntidadID)
    BEGIN
        SELECT CAST(NULL AS INT) AS IdSolicitud, N'SinSolicitud' AS EstadoActual,
               CAST(NULL AS DATETIME2(0)) AS FechaSolicitud, CAST(NULL AS DATETIME2(0)) AS VigenteHasta;
        RETURN;
    END

    SELECT TOP (1)
           s.IdSolicitud,
           CASE WHEN s.Estado = N'Aprobada' AND s.VigenteHasta <= SYSDATETIME() THEN N'Vencida'
                ELSE s.Estado END AS EstadoActual,
           s.FechaSolicitud,
           s.VigenteHasta
    FROM   Seguridad.SolicitudesAcceso AS s
    WHERE  s.IdUsuario = @IdUsuario AND s.TipoEntidad = @TipoEntidad AND s.EntidadID = @EntidadID
    ORDER BY s.IdSolicitud DESC;
END
GO

/*---------------------------------------------------------------------------------------*
* Seguridad.SP_Solicitud_Crear: registra la solicitud (no repite si ya hay una activa)
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Seguridad.SP_Solicitud_Crear
    @IdUsuario   INT,
    @TipoEntidad NVARCHAR(20),
    @EntidadID   INT,
    @Motivo      NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Sucursal TINYINT, @Nombre NVARCHAR(100);

    SELECT @Sucursal = SucursalID
    FROM   Seguridad.Usuarios
    WHERE  iduser = @IdUsuario AND active = 1 AND rol = N'Administrador';

    IF @@ROWCOUNT = 0
        BEGIN RAISERROR('Solo un Administrador activo puede solicitar acceso.', 16, 10); RETURN; END

    IF @TipoEntidad = N'Cliente'
        SELECT @Nombre = CustomerName FROM Sales.Customers WHERE CustomerID = @EntidadID;
    ELSE IF @TipoEntidad = N'Proveedor'
        SELECT @Nombre = SupplierName FROM Purchasing.Suppliers WHERE SupplierID = @EntidadID;
    ELSE
        BEGIN RAISERROR('Tipo de dato no válido.', 16, 1); RETURN; END

    IF @Nombre IS NULL
        BEGIN RAISERROR('El cliente o proveedor indicado no existe.', 16, 5); RETURN; END

    IF NOT EXISTS (SELECT 1 FROM Seguridad.SolicitudesAcceso
                   WHERE IdUsuario = @IdUsuario AND TipoEntidad = @TipoEntidad AND EntidadID = @EntidadID
                     AND (Estado = N'Pendiente' OR (Estado = N'Aprobada' AND VigenteHasta > SYSDATETIME())))
    BEGIN
        INSERT INTO Seguridad.SolicitudesAcceso (IdUsuario, SucursalID, TipoEntidad, EntidadID, NombreEntidad, Motivo)
        VALUES (@IdUsuario, @Sucursal, @TipoEntidad, @EntidadID, @Nombre, NULLIF(LTRIM(RTRIM(@Motivo)), N''));
    END

    EXEC Seguridad.SP_Solicitud_Estado @IdUsuario = @IdUsuario, @TipoEntidad = @TipoEntidad, @EntidadID = @EntidadID;
END
GO

/*---------------------------------------------------------------------------------------*
* Seguridad.SP_DatosSensibles_Obtener: datos sensibles, solo con aprobación vigente
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Seguridad.SP_DatosSensibles_Obtener
    @IdUsuario   INT,
    @TipoEntidad NVARCHAR(20),
    @EntidadID   INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Seguridad.SolicitudesAcceso
                   WHERE IdUsuario = @IdUsuario AND TipoEntidad = @TipoEntidad AND EntidadID = @EntidadID
                     AND Estado = N'Aprobada' AND VigenteHasta > SYSDATETIME())
    BEGIN
        RAISERROR('No tiene una autorización vigente del Corporativo para ver estos datos.', 16, 10);
        RETURN;
    END

    IF @TipoEntidad = N'Cliente'
        SELECT  s.CustomerID,
                p1.FullName        AS Contacto_Primario,
                p1.PhoneNumber     AS Telefono_Primario,
                p1.EmailAddress    AS Email_Primario,
                p2.FullName        AS Contacto_Alternativo,
                p2.PhoneNumber     AS Telefono_Alternativo,
                p2.EmailAddress    AS Email_Alternativo,
                s.DeliveryPostalCode   AS Codigo_Postal,
                s.PhoneNumber          AS Telefono,
                s.FaxNumber            AS Fax,
                s.WebsiteURL           AS Sitio_Web,
                s.DeliveryAddressLine1 AS Direccion_Entrega1,
                s.DeliveryAddressLine2 AS Direccion_Entrega2,
                s.PostalAddressLine1   AS Direccion_Postal1,
                s.PostalAddressLine2   AS Direccion_Postal2,
                s.DeliveryLatitude     AS Latitud,
                s.DeliveryLongitude    AS Longitud
        FROM    Sensible.Clientes AS s
        LEFT JOIN Sensible.Personas AS p1 ON p1.PersonID = s.PrimaryContactPersonID
        LEFT JOIN Sensible.Personas AS p2 ON p2.PersonID = s.AlternateContactPersonID
        WHERE   s.CustomerID = @EntidadID;
    ELSE
        SELECT  s.SupplierID,
                p1.FullName        AS Contacto_Primario,
                p2.FullName        AS Contacto_Alternativo,
                s.DeliveryPostalCode    AS Codigo_Postal,
                s.BankAccountName       AS Nombre_Cuenta_Bancaria,
                s.BankAccountBranch     AS Sucursal_Cuenta_Bancaria,
                s.BankAccountCode       AS Codigo_Cuenta_Bancaria,
                s.BankAccountNumber     AS Numero_Cuenta_Bancaria,
                s.BankInternationalCode AS Codigo_Bancario_Internacional,
                s.PhoneNumber           AS Telefono,
                s.FaxNumber             AS Fax,
                s.WebsiteURL            AS Sitio_Web,
                s.DeliveryAddressLine1  AS Direccion_Entrega1,
                s.DeliveryAddressLine2  AS Direccion_Entrega2,
                s.DeliveryPostalCode    AS Codigo_Postal_Entrega,
                s.PostalAddressLine1    AS Direccion_Postal1,
                s.PostalAddressLine2    AS Direccion_Postal2,
                s.PostalPostalCode      AS Codigo_Postal_Postal,
                s.DeliveryLatitude      AS Latitud,
                s.DeliveryLongitude     AS Longitud
        FROM    Sensible.Proveedores AS s
        LEFT JOIN Sensible.Personas AS p1 ON p1.PersonID = s.PrimaryContactPersonID
        LEFT JOIN Sensible.Personas AS p2 ON p2.PersonID = s.AlternateContactPersonID
        WHERE   s.SupplierID = @EntidadID;
END
GO

/*---------------------------------------------------------------------------------------*
* Lado Corporativo
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Seguridad.SP_Solicitudes_Listar
    @Estado NVARCHAR(20) = NULL       -- NULL = todas
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (200)
           s.IdSolicitud,
           u.username      AS Usuario,
           u.fullname      AS NombreUsuario,
           CASE s.SucursalID WHEN 1 THEN N'San José' WHEN 2 THEN N'Limón' ELSE N'-' END AS Sucursal,
           s.TipoEntidad,
           s.EntidadID,
           s.NombreEntidad,
           s.Motivo,
           CASE WHEN s.Estado = N'Aprobada' AND s.VigenteHasta <= SYSDATETIME() THEN N'Vencida'
                ELSE s.Estado END AS Estado,
           s.FechaSolicitud,
           s.FechaRespuesta,
           r.fullname      AS RespondidoPor,
           s.VigenteHasta
    FROM   Seguridad.SolicitudesAcceso AS s
    JOIN   Seguridad.Usuarios AS u ON u.iduser = s.IdUsuario
    LEFT JOIN Seguridad.Usuarios AS r ON r.iduser = s.RespondidoPor
    WHERE  @Estado IS NULL OR s.Estado = @Estado
    ORDER BY CASE WHEN s.Estado = N'Pendiente' THEN 0 ELSE 1 END, s.IdSolicitud DESC;
END
GO

/*---------------------------------------------------------------------------------------*
* Seguridad.SP_Solicitudes_Pendientes: cantidad de pendientes (contador del menú)
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Seguridad.SP_Solicitudes_Pendientes
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS Pendientes FROM Seguridad.SolicitudesAcceso WHERE Estado = N'Pendiente';
END
GO

/*---------------------------------------------------------------------------------------*
* Seguridad.SP_Solicitud_Responder: aprueba (1) o rechaza (0); @Horas de acceso (8)
*-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Seguridad.SP_Solicitud_Responder
    @IdSolicitud   INT,
    @Aprobar       BIT,
    @RespondidoPor INT,
    @Horas         INT = 8
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Seguridad.Usuarios WHERE iduser = @RespondidoPor AND active = 1 AND rol = N'Corporativo')
        BEGIN RAISERROR('Solo el Corporativo puede responder solicitudes.', 16, 10); RETURN; END

    IF @Horas IS NULL OR @Horas NOT BETWEEN 1 AND 72 SET @Horas = 8;

    UPDATE Seguridad.SolicitudesAcceso
    SET    Estado         = CASE WHEN @Aprobar = 1 THEN N'Aprobada' ELSE N'Rechazada' END,
           FechaRespuesta = SYSDATETIME(),
           RespondidoPor  = @RespondidoPor,
           VigenteHasta   = CASE WHEN @Aprobar = 1 THEN DATEADD(HOUR, @Horas, SYSDATETIME()) END
    WHERE  IdSolicitud = @IdSolicitud
      AND  Estado = N'Pendiente';

    IF @@ROWCOUNT = 0
        BEGIN RAISERROR('La solicitud no existe o ya fue respondida.', 16, 5); RETURN; END

    EXEC Seguridad.SP_Solicitudes_Listar;
END
GO

/*---------------------------------------------------------------------------------------*
* Permisos
*-----------------------------------------------------------------------------------------*/

GRANT EXECUTE ON OBJECT::Seguridad.SP_Solicitud_Crear        TO rol_admin_catalogo;
GRANT EXECUTE ON OBJECT::Seguridad.SP_Solicitud_Estado       TO rol_admin_catalogo;
GRANT EXECUTE ON OBJECT::Seguridad.SP_DatosSensibles_Obtener TO rol_admin_catalogo;

GRANT EXECUTE ON OBJECT::Seguridad.SP_Solicitudes_Listar     TO rol_corporativo;
GRANT EXECUTE ON OBJECT::Seguridad.SP_Solicitudes_Pendientes TO rol_corporativo;
GRANT EXECUTE ON OBJECT::Seguridad.SP_Solicitud_Responder    TO rol_corporativo;
GO

/*---------------------------------------------------------------------------------------*
* Verificación: app_admin NO obtiene datos sin aprobación.
*-----------------------------------------------------------------------------------------*/

EXECUTE AS LOGIN = N'app_admin';
BEGIN TRY
    EXEC Seguridad.SP_DatosSensibles_Obtener @IdUsuario = 4, @TipoEntidad = N'Cliente', @EntidadID = 999999;
    PRINT N'ERROR: entregó datos sin aprobación.';
END TRY
BEGIN CATCH
    PRINT N'OK: sin aprobación no hay datos -> ' + ERROR_MESSAGE();
END CATCH
REVERT;
GO

SET NOEXEC OFF;
GO
