/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Configuración principal de la API
*
* DESCRIPCION: Configura y levanta el servidor Express de la aplicación.
* Carga las variables de entorno, habilita CORS y permite recibir datos en formato JSON.
* También registra las rutas correspondientes a los módulos de clientes, proveedores,
* inventarios y ventas.
*
* ENTRADA: Variables de entorno definidas en el archivo .env y solicitudes HTTP
* realizadas a las diferentes rutas de la API.
*
* SALIDA: Servidor API disponible mediante http://localhost:4000.
*
* RESTRICCIONES: Requiere Node.js, las dependencias instaladas y una conexión
* disponible con la API y la base de datos.
*
* OBJETIVO: Inicializar y poner en funcionamiento la API principal del proyecto,
* conectando cada módulo con sus respectivas rutas.
*
*-----------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Carga de variables de entorno
*
* DESCRIPCION: Carga las variables almacenadas en el archivo .env para que puedan
* ser utilizadas por la aplicación.
*
* ENTRADA: Archivo .env.
*
* SALIDA: Variables de configuración disponibles mediante process.env.
*
* RESTRICCIONES: El archivo .env debe existir y contener las variables necesarias.
*
* OBJETIVO: Mantener separada la configuración de la aplicación del código fuente.
*
*-----------------------------------------------------------------------------------------*/

require('dotenv').config();


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Importación de Express y CORS
*
* DESCRIPCION: Importa Express para crear y administrar el servidor web y CORS
* para permitir solicitudes desde el frontend.
*
* ENTRADA: Dependencias express y cors.
*
* SALIDA: Objetos necesarios para configurar el servidor.
*
* RESTRICCIONES: Las dependencias deben estar instaladas en el proyecto.
*
* OBJETIVO: Preparar las herramientas principales utilizadas por la API.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const cors = require('cors');


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Importación de rutas
*
* DESCRIPCION: Importa las rutas correspondientes a los módulos de clientes,
* proveedores, inventarios y ventas.
*
* ENTRADA: Archivos de rutas ubicados en la carpeta routes.
*
* SALIDA: Rutas disponibles para ser registradas en la aplicación.
*
* RESTRICCIONES: Los archivos de rutas deben existir y estar correctamente configurados.
*
* OBJETIVO: Separar la lógica de cada módulo para mantener organizada la API.
*
*---------------------------------------------------------------------------------------*/

const clientesRoutes = require('./routes/clientes.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const ventasRoutes = require('./routes/ventas.routes');
const reportesRoutes = require('./routes/reportes.routes');


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Creación de la aplicación Express
*
* DESCRIPCION: Crea la instancia principal de Express que será utilizada
* para configurar y ejecutar la API.
*
* ENTRADA: Librería Express.
*
* SALIDA: Objeto app con la configuración del servidor.
*
* RESTRICCIONES: Requiere que Express esté instalado correctamente.
*
* OBJETIVO: Crear la aplicación principal que manejará las solicitudes HTTP.
*
*---------------------------------------------------------------------------------------*/

const app = express();


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Configuración de CORS
*
* DESCRIPCION: Habilita el intercambio de solicitudes entre diferentes orígenes,
* permitiendo que el frontend pueda comunicarse con la API.
*
* ENTRADA: Solicitudes HTTP provenientes del frontend.
*
* SALIDA: Solicitudes permitidas entre diferentes orígenes.
*
* RESTRICCIONES: La configuración utilizada permite solicitudes mediante CORS.
*
* OBJETIVO: Permitir la comunicación entre el frontend y el backend.
*
*---------------------------------------------------------------------------------------*/

app.use(cors());


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Configuración del formato JSON
*
* DESCRIPCION: Permite que Express interprete automáticamente los datos enviados
* en formato JSON dentro de las solicitudes HTTP.
*
* ENTRADA: Datos JSON enviados por el frontend.
*
* SALIDA: Datos disponibles mediante req.body.
*
* RESTRICCIONES: Los datos enviados deben tener un formato JSON válido.
*
* OBJETIVO: Facilitar el intercambio de información entre frontend y backend.
*
*---------------------------------------------------------------------------------------*/

app.use(express.json());


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de clientes
*
* DESCRIPCION: Registra las rutas relacionadas con las operaciones de clientes
* utilizando el prefijo /api/clientes.
*
* ENTRADA: Solicitudes HTTP dirigidas al módulo de clientes.
*
* SALIDA: Respuestas generadas por clientesRoutes.
*
* RESTRICCIONES: Requiere que las rutas del módulo estén correctamente configuradas.
*
* OBJETIVO: Permitir el acceso a las operaciones de clientes mediante la API.
*
*---------------------------------------------------------------------------------------*/

app.use('/api/clientes', clientesRoutes);


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de proveedores
*
* DESCRIPCION: Registra las rutas relacionadas con las operaciones de proveedores
* utilizando el prefijo /api/proveedores.
*
* ENTRADA: Solicitudes HTTP dirigidas al módulo de proveedores.
*
* SALIDA: Respuestas generadas por proveedoresRoutes.
*
* RESTRICCIONES: Requiere que las rutas del módulo estén correctamente configuradas.
*
* OBJETIVO: Permitir el acceso a las operaciones de proveedores mediante la API.
*
*---------------------------------------------------------------------------------------*/

app.use('/api/proveedores', proveedoresRoutes);


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de inventarios
*
* DESCRIPCION: Registra las rutas relacionadas con las operaciones de inventario
* utilizando el prefijo /api/inventarios.
*
* ENTRADA: Solicitudes HTTP dirigidas al módulo de inventarios.
*
* SALIDA: Respuestas generadas por inventarioRoutes.
*
* RESTRICCIONES: Requiere que las rutas del módulo estén correctamente configuradas.
*
* OBJETIVO: Permitir el acceso a las operaciones de inventario mediante la API.
*
*---------------------------------------------------------------------------------------*/

app.use('/api/inventarios', inventarioRoutes);


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de ventas
*
* DESCRIPCION: Registra las rutas relacionadas con las operaciones de ventas
* utilizando el prefijo /api/ventas.
*
* ENTRADA: Solicitudes HTTP dirigidas al módulo de ventas.
*
* SALIDA: Respuestas generadas por ventasRoutes.
*
* RESTRICCIONES: Requiere que las rutas del módulo estén correctamente configuradas.
*
* OBJETIVO: Permitir el acceso a las operaciones de ventas mediante la API.
*
*---------------------------------------------------------------------------------------*/

app.use('/api/ventas', ventasRoutes);

app.use('/api/reportes', reportesRoutes);


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Configuración del puerto
*
* DESCRIPCION: Obtiene el puerto definido en las variables de entorno.
* Si no existe, utiliza el puerto 4000 como valor predeterminado.
*
* ENTRADA: Variable de entorno PORT.
*
* SALIDA: Número de puerto utilizado por el servidor.
*
* RESTRICCIONES: El puerto seleccionado no debe estar ocupado por otro proceso.
*
* OBJETIVO: Definir el puerto donde estará disponible la API.
*
*---------------------------------------------------------------------------------------*/

const PORT = process.env.PORT || 4000;


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Inicio del servidor
*
* DESCRIPCION: Inicia el servidor Express y muestra en consola la dirección
* donde se encuentra disponible la API.
*
* ENTRADA: Puerto definido en PORT.
*
* SALIDA: Servidor ejecutándose y disponible para recibir solicitudes.
*
* RESTRICCIONES: El puerto debe estar disponible y la configuración del servidor
* debe ser válida.
*
* OBJETIVO: Poner en funcionamiento la API para que pueda ser utilizada
* por el frontend y otras aplicaciones cliente.
*
*---------------------------------------------------------------------------------------*/

app.listen(PORT, () => {
    console.log(`API corriendo en http://localhost:${PORT}`);
});