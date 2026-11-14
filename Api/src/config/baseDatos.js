/*---------------------------------------------------------------------------------------*
* NOMBRE: baseDatos.js
*
* DESCRIPCION: Conexiones con los tres nodos. Mantiene un grupo de conexiones (pool)
* por cada combinación de NODO y PERFIL:
*
*   Nodo          Servidor                         Perfiles (login de base de datos)
*   -----------   ------------------------------   -----------------------------------
*   corporativo   SQL Server de Windows (1433)     login, corporativo, admin
*   sanjose       contenedor de Ubuntu (1436)      admin
*   limon         contenedor de Ubuntu (1437)      admin
*
* Cada login solo puede EJECUTAR sus procedimientos (scripts 10 y 11).
*
* ENTRADA: Variables del archivo .env (ver .env.ejemplo).
*
* SALIDA: obtenerConexion(nodo, perfil) -> promesa con el pool de conexiones.
*
* OBJETIVO: Que cada petición use el nodo y los permisos del usuario que la hace.
*-----------------------------------------------------------------------------------------*/

const fs = require('fs');
const sql = require('mssql');

/*---------------------------------------------------------------------------------------*
* NOMBRE: ipWindowsDesdeUbuntu
* DESCRIPCION: La IP de Windows vista desde Ubuntu (WSL) es la puerta de enlace por
* defecto; se lee de /proc/net/route porque cambia al reiniciar.
* SALIDA: La IP de Windows, o 'localhost' si no se está en Linux.
*-----------------------------------------------------------------------------------------*/
function ipWindowsDesdeUbuntu() {
    try {
        const filas = fs.readFileSync('/proc/net/route', 'utf8').trim().split('\n').slice(1);
        for (const fila of filas) {
            const columnas = fila.trim().split(/\s+/);
            const esRutaPorDefecto = columnas[1] === '00000000';
            if (esRutaPorDefecto) {
                const puertaHex = columnas[2];   // La IP viene en hexadecimal y al revés.
                return [3, 2, 1, 0].map((byte) => parseInt(puertaHex.substr(byte * 2, 2), 16)).join('.');
            }
        }
    } catch {
        /* No es Linux: se usa localhost. */
    }
    return 'localhost';
}

const servidorCorporativo =
    !process.env.CORP_SERVER || process.env.CORP_SERVER === 'auto'
        ? ipWindowsDesdeUbuntu()
        : process.env.CORP_SERVER;

const NODOS = {
    corporativo: { nombre: 'Corporativo', server: servidorCorporativo, port: Number(process.env.CORP_PORT || 1433) },
    sanjose: { nombre: 'San José', server: process.env.SJ_SERVER || 'localhost', port: Number(process.env.SJ_PORT || 1436) },
    limon: { nombre: 'Limón', server: process.env.LM_SERVER || 'localhost', port: Number(process.env.LM_PORT || 1437) }
};

const PERFILES = {
    login: { user: process.env.APP_LOGIN_USER || 'app_login', password: process.env.APP_LOGIN_PASSWORD },
    corporativo: { user: process.env.APP_CORP_USER || 'app_corporativo', password: process.env.APP_CORP_PASSWORD },
    admin: { user: process.env.APP_ADMIN_USER || 'app_admin', password: process.env.APP_ADMIN_PASSWORD }
};

const conexionesAbiertas = {};

/*---------------------------------------------------------------------------------------*
* NOMBRE: obtenerConexion
* ENTRADA: nodo ('corporativo' | 'sanjose' | 'limon'), perfil ('login' | 'corporativo' | 'admin').
* DESCRIPCION: Devuelve el pool del nodo y perfil, y lo crea la primera vez. Si el nodo
* no responde, el pool se descarta para volver a intentarlo en la siguiente petición.
* SALIDA: Promesa con el pool. Si falla, el error dice qué nodo no está disponible.
*-----------------------------------------------------------------------------------------*/
function obtenerConexion(nodo, perfil) {
    const clave = `${nodo}:${perfil}`;

    if (!conexionesAbiertas[clave]) {
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

        pool.on('error', () => { delete conexionesAbiertas[clave]; });

        conexionesAbiertas[clave] = pool.connect().catch((errorConexion) => {
            delete conexionesAbiertas[clave];
            const error = new Error(`El nodo ${destino.nombre} no está disponible en este momento.`);
            error.nodo = nodo;
            error.causa = errorConexion.message;
            throw error;
        });
    }

    return conexionesAbiertas[clave];
}

console.log(`Nodos: Corporativo ${NODOS.corporativo.server}:${NODOS.corporativo.port} | ` +
            `San José ${NODOS.sanjose.server}:${NODOS.sanjose.port} | ` +
            `Limón ${NODOS.limon.server}:${NODOS.limon.port}`);

module.exports = { sql, obtenerConexion, NODOS };
