/*
-----------------------------------------------------------------------------------------
NOMBRE: 09_Corporativo_Usuarios.sql

DESCRIPCION:
Crea la tabla de usuarios del Corporativo y protege las contraseñas
mediante el cifrado nativo de SQL Server.

Jerarquía de cifrado:
    Service Master Key
        └── Database Master Key
              └── Certificado CertUsuarios
                    └── Llave simétrica LlaveUsuarios (AES_256)
                          └── Columna password

Procedimientos:
    Seguridad.SP_Usuario_Insertar
    Seguridad.SP_Usuario_Login

RESTRICCIONES:
    Ejecutar solamente en el Corporativo.
-----------------------------------------------------------------------------------------
*/

USE WideWorldImporters;
GO

/*-----------------------------------------------------------------------------------------
  VALIDAR QUE SE EJECUTE EN EL CORPORATIVO
-----------------------------------------------------------------------------------------*/

DECLARE @Servidor NVARCHAR(128) = @@SERVERNAME;

IF LOWER(@Servidor) IN (N'sanjose', N'limon')
BEGIN
    RAISERROR(
        N'Este script es exclusivo del Corporativo. Servidor actual: %s.',
        16, 1, @Servidor
    );
    SET NOEXEC ON;
END;
GO

/*-----------------------------------------------------------------------------------------
  PASO 1. CREAR LA JERARQUÍA DE CIFRADO
-----------------------------------------------------------------------------------------*/

-- 1.1 Crear la llave maestra de la base de datos.

IF NOT EXISTS (
    SELECT 1
    FROM sys.symmetric_keys
    WHERE name = N'##MS_DatabaseMasterKey##'
)
BEGIN
    CREATE MASTER KEY
    ENCRYPTION BY PASSWORD = N'LlaveMaestra#2026Wwi';

    PRINT N'Database Master Key creada correctamente.';
END
ELSE
BEGIN
    PRINT N'Database Master Key ya existe.';
END;
GO

-- 1.2 Crear el certificado.

IF NOT EXISTS (
    SELECT 1
    FROM sys.certificates
    WHERE name = N'CertUsuarios'
)
BEGIN
    CREATE CERTIFICATE CertUsuarios
    WITH
        SUBJECT = N'Cifrado de contraseñas de usuarios - Wide World Importers',
        EXPIRY_DATE = '20361231';

    PRINT N'Certificado CertUsuarios creado correctamente.';
END
ELSE
BEGIN
    PRINT N'Certificado CertUsuarios ya existe.';
END;
GO

-- 1.3 Comprobar que el certificado exista.

IF NOT EXISTS (
    SELECT 1
    FROM sys.certificates
    WHERE name = N'CertUsuarios'
)
BEGIN
    THROW 50001, N'No se pudo crear o encontrar el certificado CertUsuarios.', 1;
END;
GO

-- 1.4 Comprobar la relación entre la llave simétrica y el certificado.
-- Si existe una llave asociada a otro certificado, se revisa antes de reemplazarla.

IF EXISTS (
    SELECT 1
    FROM sys.symmetric_keys sk
    WHERE sk.name = N'LlaveUsuarios'
)
AND NOT EXISTS (
    SELECT 1
    FROM sys.symmetric_keys sk
    INNER JOIN sys.key_encryptions ke
        ON ke.key_id = sk.symmetric_key_id
    INNER JOIN sys.certificates c
        ON c.thumbprint = ke.thumbprint
    WHERE sk.name = N'LlaveUsuarios'
      AND c.name = N'CertUsuarios'
)
BEGIN
    -- No eliminar una llave que pueda proteger contraseñas existentes.
    IF OBJECT_ID(N'Seguridad.Usuarios', N'U') IS NOT NULL
       AND EXISTS (SELECT 1 FROM Seguridad.Usuarios)
    BEGIN
        THROW 50002,
        N'La llave existente no está asociada a CertUsuarios y hay usuarios registrados. No se eliminará para proteger sus datos.',
        1;
    END;

    DROP SYMMETRIC KEY LlaveUsuarios;

    PRINT N'Llave anterior eliminada porque no estaba asociada al certificado correcto.';
END;
GO

-- 1.5 Crear la llave simétrica AES_256.

IF NOT EXISTS (
    SELECT 1
    FROM sys.symmetric_keys
    WHERE name = N'LlaveUsuarios'
)
BEGIN
    CREATE SYMMETRIC KEY LlaveUsuarios
    WITH ALGORITHM = AES_256
    ENCRYPTION BY CERTIFICATE CertUsuarios;

    PRINT N'Llave simétrica LlaveUsuarios creada correctamente.';
END
ELSE
BEGIN
    PRINT N'Llave simétrica LlaveUsuarios ya existe.';
END;
GO

/*-----------------------------------------------------------------------------------------
  PASO 2. CREAR EL ESQUEMA Y LA TABLA DE USUARIOS
-----------------------------------------------------------------------------------------*/

IF SCHEMA_ID(N'Seguridad') IS NULL
BEGIN
    EXEC (N'CREATE SCHEMA Seguridad');
    PRINT N'Esquema Seguridad creado.';
END;
GO

IF OBJECT_ID(N'Seguridad.Usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE Seguridad.Usuarios
    (
        iduser INT IDENTITY(1,1) NOT NULL,

        username NVARCHAR(50) NOT NULL,

        -- 512 bytes para almacenar el resultado del cifrado.
        password VARBINARY(512) NOT NULL,

        fullname NVARCHAR(100) NOT NULL,

        active BIT NOT NULL
            CONSTRAINT DF_Usuarios_active DEFAULT (1),

        rol NVARCHAR(20) NOT NULL,

        email NVARCHAR(256) NOT NULL,

        hiredate DATE NOT NULL,

        SucursalID TINYINT NULL,

        CONSTRAINT PK_Usuarios
            PRIMARY KEY (iduser),

        CONSTRAINT UQ_Usuarios_username
            UNIQUE (username),

        CONSTRAINT CK_Usuarios_rol
            CHECK (rol IN (N'Administrador', N'Corporativo')),

        CONSTRAINT CK_Usuarios_rol_sucursal
            CHECK (
                (rol = N'Administrador' AND SucursalID IN (1, 2))
                OR
                (rol = N'Corporativo' AND SucursalID IS NULL)
            )
    );

    PRINT N'Tabla Seguridad.Usuarios creada correctamente.';
END
ELSE
BEGIN
    -- Ampliar la columna para evitar que el cifrado se trunque.
    IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID(N'Seguridad.Usuarios')
          AND name = N'password'
          AND max_length < 512
    )
    BEGIN
        ALTER TABLE Seguridad.Usuarios
        ALTER COLUMN password VARBINARY(512) NOT NULL;

        PRINT N'Columna password ampliada a VARBINARY(512).';
    END;

    PRINT N'Tabla Seguridad.Usuarios ya existe.';
END;
GO

/*-----------------------------------------------------------------------------------------
  PASO 3. PROCEDIMIENTO PARA INSERTAR USUARIOS
-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Seguridad.SP_Usuario_Insertar
    @username NVARCHAR(50),
    @password NVARCHAR(128),
    @fullname NVARCHAR(100),
    @rol NVARCHAR(20),
    @email NVARCHAR(256),
    @hiredate DATE,
    @SucursalID TINYINT = NULL

WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY

        -- Validar que la contraseña no esté vacía.
        IF @password IS NULL OR LEN(@password) = 0
        BEGIN
            THROW 50003, N'La contraseña no puede estar vacía.', 1;
        END;

        -- Evitar usuarios duplicados.
        IF EXISTS (
            SELECT 1
            FROM Seguridad.Usuarios
            WHERE username = @username
        )
        BEGIN
            THROW 50004, N'El nombre de usuario ya existe.', 1;
        END;

        -- Abrir la llave para realizar el cifrado.
        OPEN SYMMETRIC KEY LlaveUsuarios
        DECRYPTION BY CERTIFICATE CertUsuarios;

        DECLARE @PasswordCifrada VARBINARY(512);

        -- Cifrar la contraseña utilizando el username como autenticador.
        SET @PasswordCifrada = ENCRYPTBYKEY(
            KEY_GUID(N'LlaveUsuarios'),
            @password,
            1,
            CONVERT(VARBINARY(100), @username)
        );

        -- Comprobar que el cifrado haya funcionado.
        IF @PasswordCifrada IS NULL
        BEGIN
            THROW 50005, N'No fue posible cifrar la contraseña.', 1;
        END;

        -- Insertar el usuario.
        INSERT INTO Seguridad.Usuarios
        (
            username,
            password,
            fullname,
            rol,
            email,
            hiredate,
            SucursalID
        )
        VALUES
        (
            @username,
            @PasswordCifrada,
            @fullname,
            @rol,
            @email,
            @hiredate,
            @SucursalID
        );

        -- Cerrar la llave.
        CLOSE SYMMETRIC KEY LlaveUsuarios;

        SELECT SCOPE_IDENTITY() AS iduser;

    END TRY
    BEGIN CATCH

        -- Cerrar la llave si ocurrió algún error.
        IF EXISTS (
            SELECT 1
            FROM sys.openkeys
            WHERE key_name = N'LlaveUsuarios'
        )
        BEGIN
            CLOSE SYMMETRIC KEY LlaveUsuarios;
        END;

        THROW;

    END CATCH;
END;
GO

/*-----------------------------------------------------------------------------------------
  PASO 4. PROCEDIMIENTO PARA INICIAR SESIÓN
-----------------------------------------------------------------------------------------*/

CREATE OR ALTER PROCEDURE Seguridad.SP_Usuario_Login
    @username NVARCHAR(50),
    @password NVARCHAR(128)

WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY

        -- Abrir la llave para descifrar la contraseña almacenada.
        OPEN SYMMETRIC KEY LlaveUsuarios
        DECRYPTION BY CERTIFICATE CertUsuarios;

        -- Buscar el usuario y comprobar su contraseña.
        SELECT
            u.iduser,
            u.username,
            u.fullname,
            u.rol,
            u.email,
            u.SucursalID,

            CASE u.SucursalID
                WHEN 1 THEN N'San José'
                WHEN 2 THEN N'Limón'
                ELSE N'Corporativo'
            END AS NombreSucursal

        FROM Seguridad.Usuarios AS u

        WHERE u.username = @username
          AND u.active = 1

          AND CONVERT(
                NVARCHAR(128),
                DECRYPTBYKEY(
                    u.password,
                    1,
                    CONVERT(VARBINARY(100), u.username)
                )
          ) = @password;

        -- Cerrar la llave.
        CLOSE SYMMETRIC KEY LlaveUsuarios;

    END TRY
    BEGIN CATCH

        IF EXISTS (
            SELECT 1
            FROM sys.openkeys
            WHERE key_name = N'LlaveUsuarios'
        )
        BEGIN
            CLOSE SYMMETRIC KEY LlaveUsuarios;
        END;

        THROW;

    END CATCH;
END;
GO

/*-----------------------------------------------------------------------------------------
  PASO 5. INSERTAR USUARIOS DE EJEMPLO
-----------------------------------------------------------------------------------------*/

IF NOT EXISTS (
    SELECT 1 FROM Seguridad.Usuarios
    WHERE username = N'admin.sanjose'
)
BEGIN
    EXEC Seguridad.SP_Usuario_Insertar
        @username = N'admin.sanjose',
        @password = N'Admin#2026',
        @fullname = N'Administrador San José',
        @rol = N'Administrador',
        @email = N'admin.sanjose@wwi.cr',
        @hiredate = '20240201',
        @SucursalID = 1;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM Seguridad.Usuarios
    WHERE username = N'admin.limon'
)
BEGIN
    EXEC Seguridad.SP_Usuario_Insertar
        @username = N'admin.limon',
        @password = N'Admin#2026',
        @fullname = N'Administrador Limón',
        @rol = N'Administrador',
        @email = N'admin.limon@wwi.cr',
        @hiredate = '20240315',
        @SucursalID = 2;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM Seguridad.Usuarios
    WHERE username = N'gerente.corporativo'
)
BEGIN
    EXEC Seguridad.SP_Usuario_Insertar
        @username = N'gerente.corporativo',
        @password = N'Gerente#2026',
        @fullname = N'Gerente Corporativo Escazú',
        @rol = N'Corporativo',
        @email = N'gerente@wwi.cr',
        @hiredate = '20230801',
        @SucursalID = NULL;
END;
GO

/*-----------------------------------------------------------------------------------------
  PASO 6. VERIFICACIONES
-----------------------------------------------------------------------------------------*/

-- 6.1 Verificar que existan los elementos de cifrado.

SELECT
    name AS Objeto,
    type_desc AS Tipo
FROM sys.objects
WHERE 1 = 0;

SELECT name, algorithm_desc
FROM sys.symmetric_keys
WHERE name = N'LlaveUsuarios';

SELECT name, subject, expiry_date
FROM sys.certificates
WHERE name = N'CertUsuarios';

-- 6.2 Ver los usuarios y sus contraseñas cifradas.

SELECT
    iduser,
    username,
    password,
    fullname,
    active,
    rol,
    email,
    hiredate,
    SucursalID
FROM Seguridad.Usuarios;

/*-----------------------------------------------------------------------------------------
  PASO 6. VERIFICACIÓN DE INICIO DE SESIÓN
-----------------------------------------------------------------------------------------*/

-- 6.1 Inicio de sesión correcto: Administrador de San José.
EXEC Seguridad.SP_Usuario_Login
    @username = N'admin.sanjose',
    @password = N'Admin#2026';


-- 6.2 Inicio de sesión incorrecto: contraseña equivocada.
-- No debe devolver ninguna fila.
EXEC Seguridad.SP_Usuario_Login
    @username = N'admin.sanjose',
    @password = N'otra';


-- 6.3 Inicio de sesión correcto: Administrador de Limón.
EXEC Seguridad.SP_Usuario_Login
    @username = N'admin.limon',
    @password = N'Admin#2026';


-- 6.4 Inicio de sesión correcto: Gerente Corporativo.
EXEC Seguridad.SP_Usuario_Login
    @username = N'gerente.corporativo',
    @password = N'Gerente#2026';

GO

SET NOEXEC OFF;
GO
SET NOEXEC OFF;
GO