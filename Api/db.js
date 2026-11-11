/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Conexiones con los tres nodos (PY2 - base de datos distribuida)
*
* DESCRIPCION: La API ya no usa una sola conexión con "sa". Mantiene un pool por cada
* combinación de NODO y PERFIL, y cada petición usa el que corresponde al usuario que
* inició sesión (ver auth.js):
*
*   Nodo          Servidor                         Perfiles (login de base de datos)
*   -----------   ------------------------------   -----------------------------------
*   corporativo   SQL Server de Windows (1433)     login (app_login), corporativo (app_corporativo)
*   sanjose       contenedor Linux (puerto 1436)   admin (app_admin)
*   limon         contenedor Linux (puerto 1437)   admin (app_admin)
*
* Cada login de base de datos solo tiene permiso de EJECUTAR sus procedimientos
* (scripts 10 y 11): así se relacionan los usuarios de la aplicación con los usuarios
* de la base de datos.
*
* ENTRADA: Variables del archivo .env (ver .env.ejemplo).
* SALIDA: getPool(nodo, perfil) -> promesa con el pool de conexiones.
*
* RESTRICCIONES: La API se ejecuta dentro de Ubuntu (WSL). Si CORP_SERVER=auto, la IP
* de Windows se calcula sola (cambia al reiniciar WSL).
*
*-----------------------------------------------------------------------------------------*/

require('dotenv').config();
const fs = require('fs');
const sql = require('mssql');

/* IP de Windows vista desde Ubuntu (WSL): es la puerta de enlace por defecto. */
function ipWindowsDesdeWSL() {
    try {
        const lineas = fs.readFileSync('/proc/net/route', 'utf8').trim().split('\n').slice(1);
        for (const linea of lineas) {
            const c = linea.trim().split(/\s+/);
            if (c[1] === '00000000') {
                const hex = c[2];
                return [3, 2, 1, 0].map((i) => parseInt(hex.substr(i * 2, 2), 16)).join('.');
            }
        }
    } catch {
        /* No es Linux: se usa localhost. */
    }
    return 'localhost';
}

const servidorCorporativo =
    !process.env.CORP_SERVER || process.env.CORP_SERVER === 'auto'
        ? ipWindowsDesdeWSL()
        : process.env.CORP_SERVER;

const NODOS = {
    corporativo: { nombre: 'Corporativo', server: servidorCorporativo,               port: Number(process.env.CORP_PORT || 1433) },
    sanjose:     { nombre: 'San José',    server: process.env.SJ_SERVER || 'localhost', port: Number(process.env.SJ_PORT || 1436) },
    limon:       { nombre: 'Limón',       server: process.env.LM_SERVER || 'localhost', port: Number(process.env.LM_PORT || 1437) }
};

const PERFILES = {
    login:       { user: process.env.APP_LOGIN_USER || 'app_login',       password: process.env.APP_LOGIN_PASSWORD },
    corporativo: { user: process.env.APP_CORP_USER  || 'app_corporativo', password: process.env.APP_CORP_PASSWORD },
    admin:       { user: process.env.APP_ADMIN_USER || 'app_admin',       password: process.env.APP_ADMIN_PASSWORD }
};

const pools = {};

/*---------------------------------------------------------------------------------------*
* NOMBRE: getPool
* DESCRIPCION: Devuelve (o crea) el pool del nodo y perfil indicados. Si el nodo no
* responde, el pool se descarta para volver a intentarlo en la siguiente petición.
*-----------------------------------------------------------------------------------------*/
function getPool(nodo, perfil) {
    const clave = `${nodo}:${perfil}`;

    if (!pools[clave]) {
        const destino = NODOS[nodo];
        const credenciales = PERFILES[perfil];

        const pool = new sql.ConnectionPool({
            server: destino.server,
            port: destino.port,
            database: process.env.DB_DATABASE || 'WideWorldImporters',
            user: credenciales.user,
            password: credenciales.password,
            connectionTimeout: 5000,
            requestTimeout: 60000,
            options: { encrypt: false, trustServerCertificate: true, useUTC: false }
        });

        pool.on('error', () => { delete pools[clave]; });

        pools[clave] = pool.connect().catch((err) => {
            delete pools[clave];
            const error = new Error(`El nodo ${destino.nombre} no está disponible en este momento.`);
            error.nodo = nodo;
            error.causa = err.message;
            throw error;
        });
    }

    return pools[clave];
}

console.log(`Nodos: Corporativo ${NODOS.corporativo.server}:${NODOS.corporativo.port} | ` +
            `San José ${NODOS.sanjose.server}:${NODOS.sanjose.port} | ` +
            `Limón ${NODOS.limon.server}:${NODOS.limon.port}`);

module.exports = { sql, getPool, NODOS };
