/*---------------------------------------------------------------------------------------*
* NOMBRE: autenticacion.js
* ENTRADA: req, res y next.
* DESCRIPCION: Revisiones que corren antes de cada ruta (sesión, rol y conexión).
* SALIDA: req.usuario y req.pool listos, o la respuesta de error.
* OBJETIVO: Que la seguridad se revise en la API, no solo en la pantalla.
*-----------------------------------------------------------------------------------------*/

const { obtenerConexion } = require('../config/baseDatos');
const { verificarToken } = require('../security/token');

/* Exige "Authorization: Bearer <token>" válido; si no, 401. */
function autenticar(req, res, next) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const usuario = verificarToken(token);

    if (!usuario) {
        return res.status(401).json({ error: 'Sesión no válida o vencida. Inicie sesión nuevamente.' });
    }

    req.usuario = usuario;
    next();
}

/* Deja pasar solo a los roles indicados; si no, 403. */
const requiereRol = (...roles) => (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
        return res.status(403).json({ error: `Esta sección es solo para el rol ${roles.join(' o ')}.` });
    }
    next();
};

/* Solo permite GET (el Administrador solo consulta clientes y proveedores). */
function soloConsulta(req, res, next) {
    if (req.method !== 'GET') {
        return res.status(403).json({ error: 'El Administrador solo puede consultar clientes y proveedores.' });
    }
    next();
}

/* Corporativo - corporativo; Administrador -> sanjose o limon con perfil admin. */
function nodoDelUsuario(usuario) {
    if (usuario.rol === 'Corporativo') {
        return { nodo: 'corporativo', perfil: 'corporativo' };
    }
    return { nodo: usuario.sucursalId === 1 ? 'sanjose' : 'limon', perfil: 'admin' };
}

/* Conecta la petición al nodo del usuario (req.pool); si no responde, 503. */
async function conectarNodo(req, res, next) {
    const { nodo, perfil } = nodoDelUsuario(req.usuario);

    try {
        req.pool = await obtenerConexion(nodo, perfil);
        req.nodo = nodo;
        next();
    } catch (error) {
        console.error(error.message, '-', error.causa);
        res.status(503).json({ error: error.message, nodo });
    }
}

module.exports = { autenticar, requiereRol, soloConsulta, conectarNodo };