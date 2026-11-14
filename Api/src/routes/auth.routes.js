/*---------------------------------------------------------------------------------------*
* NOMBRE: auth.routes.js
* ENTRADA: Usuario, contraseña y rol de la pantalla de inicio.
* DESCRIPCION: Inicio de sesión contra el Corporativo.
*   POST /api/auth/login  valida con Seguridad.SP_Usuario_Login.
*   GET  /api/auth/me     datos del usuario de la sesión.
* SALIDA: { token, usuario } o un mensaje de error.
* OBJETIVO: Validar al usuario contra la tabla de usuarios encriptada.
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const { sql, obtenerConexion } = require('../config/baseDatos');
const { crearToken } = require('../security/token');
const { autenticar } = require('../middleware/autenticacion');
const { conManejoDeErrores, errorHttp } = require('../utils/respuestas');

const router = express.Router();

/* Conexión de solo login al Corporativo; si no responde, error 503. */
async function conexionLogin() {
    try {
        return await obtenerConexion('corporativo', 'login');
    } catch (error) {
        console.error(error.message, '-', error.causa);
        throw errorHttp(503, 'El Corporativo no está disponible: no se puede validar el inicio de sesión en este momento.');
    }
}

/* Revisa usuario, contraseña y rol, y devuelve el token. */
router.post('/login', conManejoDeErrores(async (req, res) => {
    const { username, password, rol } = req.body || {};

    if (!username || !password) {
        throw errorHttp(400, 'Debe indicar usuario y contraseña.');
    }

    const pool = await conexionLogin();
    const resultado = await pool.request()
        .input('username', sql.NVarChar(50), String(username).trim())
        .input('password', sql.NVarChar(128), String(password))
        .execute('Seguridad.SP_Usuario_Login');

    const usuario = resultado.recordset[0];

    if (!usuario) {
        throw errorHttp(401, 'Usuario o contraseña incorrectos.');
    }

    const rolElegidoNoCoincide = rol && String(rol).toLowerCase() !== String(usuario.rol).toLowerCase();
    if (rolElegidoNoCoincide) {
        throw errorHttp(403, `Este usuario no tiene acceso como ${rol}. Su rol es ${usuario.rol}.`);
    }

    res.json({
        token: crearToken(usuario),
        usuario: {
            iduser: usuario.iduser,
            username: usuario.username,
            fullname: usuario.fullname,
            rol: usuario.rol,
            email: usuario.email,
            sucursalId: usuario.SucursalID,
            sucursal: usuario.NombreSucursal
        }
    });
}, { mensaje: 'No se pudo iniciar sesión.' }));

/* Devuelve el usuario de la sesión actual. */
router.get('/me', autenticar, (req, res) => {
    res.json({ usuario: req.usuario });
});

module.exports = router;