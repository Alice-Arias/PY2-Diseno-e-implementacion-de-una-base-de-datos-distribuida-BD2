/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Configuración de conexión con SQL Server
*
* DESCRIPCION: Configura y establece la conexión entre la API y la base de datos
* SQL Server utilizando las variables de entorno definidas en el archivo .env.
* También crea un pool de conexiones reutilizable para las diferentes operaciones
* de la aplicación.
*
* ENTRADA: Variables de entorno DB_USER, DB_PASSWORD, DB_SERVER, DB_PORT y
* DB_DATABASE.
*
* SALIDA: Conexión activa con SQL Server mediante poolPromise y el objeto sql.
*
* RESTRICCIONES: Requiere que SQL Server esté disponible, que las credenciales
* sean correctas y que las variables de conexión estén configuradas en el archivo .env.
*
* OBJETIVO: Centralizar la configuración y conexión de la API con la base de datos.
*
*-----------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Carga de variables de entorno
*
* DESCRIPCION: Carga las variables definidas en el archivo .env para utilizarlas
* durante la configuración de la conexión con SQL Server.
*
* ENTRADA: Archivo .env.
*
* SALIDA: Variables de configuración disponibles mediante process.env.
*
* RESTRICCIONES: El archivo .env debe contener las variables necesarias para
* realizar la conexión.
*
* OBJETIVO: Mantener separadas las credenciales y configuraciones de la base de datos
* del código fuente.
*
*-----------------------------------------------------------------------------------------*/

require('dotenv').config();


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Importación de mssql
*
* DESCRIPCION: Importa la librería mssql, utilizada para establecer conexiones
* y ejecutar operaciones sobre SQL Server.
*
* ENTRADA: Dependencia mssql instalada en el proyecto.
*
* SALIDA: Objeto sql con las funcionalidades necesarias para trabajar con SQL Server.
*
* RESTRICCIONES: La dependencia mssql debe estar instalada correctamente.
*
* OBJETIVO: Permitir que la API pueda comunicarse con la base de datos.
*
*-----------------------------------------------------------------------------------------*/

const sql = require('mssql');


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Configuración de conexión
*
* DESCRIPCION: Define los datos necesarios para establecer la conexión con
* la base de datos SQL Server.
*
* ENTRADA: Usuario, contraseña, servidor, puerto y nombre de la base de datos
* obtenidos desde las variables de entorno.
*
* SALIDA: Objeto config con la configuración completa de la conexión.
*
* RESTRICCIONES: Los datos proporcionados deben corresponder a una instancia
* disponible de SQL Server.
*
* OBJETIVO: Preparar la configuración que utilizará el pool de conexiones.
*
*-----------------------------------------------------------------------------------------*/

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE,

    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: poolPromise
*
* DESCRIPCION: Crea un pool de conexiones con SQL Server y establece la conexión
* utilizando la configuración definida anteriormente.
*
* ENTRADA: Configuración almacenada en config.
*
* SALIDA: Promesa que devuelve el pool de conexiones cuando la conexión es exitosa.
*
* RESTRICCIONES: SQL Server debe estar disponible y las credenciales deben ser válidas.
*
* OBJETIVO: Mantener una conexión reutilizable para ejecutar las operaciones
* de la API sobre la base de datos.
*
*-----------------------------------------------------------------------------------------*/

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {

        /*--------------------------------------------------------------------------------*
        *
        * NOMBRE: Confirmación de conexión
        *
        * DESCRIPCION: Muestra un mensaje en consola cuando la conexión con SQL Server
        * se establece correctamente.
        *
        * ENTRADA: Pool de conexión establecido.
        *
        * SALIDA: Mensaje indicando que la conexión fue exitosa.
        *
        * RESTRICCIONES: Solo se ejecuta si la conexión fue establecida correctamente.
        *
        * OBJETIVO: Permitir verificar visualmente que la API logró conectarse
        * a la base de datos.
        *
        *--------------------------------------------------------------------------------*/

        console.log('Conectado a SQL Server');

        return pool;
    })
    .catch((err) => {

        /*--------------------------------------------------------------------------------*
        *
        * NOMBRE: Manejo de error de conexión
        *
        * DESCRIPCION: Captura y muestra en consola cualquier error ocurrido
        * durante el intento de conexión con SQL Server.
        *
        * ENTRADA: Error generado durante la conexión.
        *
        * SALIDA: Mensaje de error mostrado en consola.
        *
        * RESTRICCIONES: Se ejecuta únicamente cuando ocurre un error de conexión.
        *
        * OBJETIVO: Facilitar la identificación de problemas relacionados con
        * la conexión a la base de datos.
        *
        *--------------------------------------------------------------------------------*/

        console.error('Error de conexion a la base de datos:', err);
    });


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Exportación de conexión
*
* DESCRIPCION: Exporta el objeto sql y la promesa del pool de conexiones para
* que puedan ser utilizados por las diferentes rutas y módulos de la API.
*
* ENTRADA: Objeto sql y poolPromise.
*
* SALIDA: Objetos disponibles para otros archivos mediante require().
*
* RESTRICCIONES: Los archivos que necesiten acceder a la base de datos deben
* importar correctamente este módulo.
*
* OBJETIVO: Compartir la conexión y las herramientas de SQL Server entre
* los diferentes componentes de la aplicación.
*
*-----------------------------------------------------------------------------------------*/

module.exports = { sql, poolPromise };