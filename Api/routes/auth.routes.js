/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas de autenticación (PY2)
*
*   POST /api/auth/login  { username, password, rol }
*        Valida contra Seguridad.SP_Usuario_Login en el Corporativo (contraseña
*        encriptada con la llave simétrica LlaveUsuarios). Se conecta con el login
*        app_login, que solo puede ejecutar ese procedimiento.
*        Devuelve { token, usuario }.
*
*   GET  /api/auth/me     Datos del usuario de la sesión actual.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { crearToken, autenticar } = require('../auth');

router.post('/login', async (req, res) => {
    const { username, password, rol } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'Debe indicar usuario y contraseña.' });
    }

    let pool;
    try {
        pool = await getPool('corporativo', 'login');
    } catch (err) {
        console.error(err.message, '-', err.causa);
        return res.status(503).json({
            error: 'El Corporativo no está disponible: no se puede validar el inicio de sesión en este momento.'
        });
    }

    try {
        const result = await pool.request()
            .input('username', sql.NVarChar(50), String(username).trim())
            .input('password', sql.NVarChar(128), String(password))
            .execute('Seguridad.SP_Usuario_Login');

        const usuario = result.recordset[0];

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        }

        if (rol && String(rol).toLowerCase() !== String(usuario.rol).toLowerCase()) {
            return res.status(403).json({ error: `Este usuario no tiene acceso como ${rol}. Su rol es ${usuario.rol}.` });
        }

        const token = crearToken(usuario);

        res.json({
            token,
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'No se pudo iniciar sesión.' });
    }
});

router.get('/me', autenticar, (req, res) => {
    res.json({ usuario: req.usuario });
});

module.exports = router;
