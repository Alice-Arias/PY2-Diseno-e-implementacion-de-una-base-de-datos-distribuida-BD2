/*---------------------------------------------------------------------------------------*
* NOMBRE: server.js
*
* DESCRIPCION: Punto de arranque de la API. Carga el archivo .env, crea la aplicación
* (src/app.js) y la pone a escuchar.
*
* ENTRADA: Variable PORT del .env (por defecto 4000).
*
* SALIDA: API disponible en http://localhost:4000.
*
* OBJETIVO: Separar el arranque del servidor de la configuración de la aplicación.
*-----------------------------------------------------------------------------------------*/

require('dotenv').config();

const crearAplicacion = require('./src/app');

const PUERTO = process.env.PORT || 4000;

crearAplicacion().listen(PUERTO, () => {
    console.log(`API corriendo en http://localhost:${PUERTO}`);
});
