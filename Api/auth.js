/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Autenticación y autorización (PY2)
*
* DESCRIPCION:
*   - crearToken / verificarToken: token firmado con HMAC-SHA256 (módulo crypto de
*     Node, sin dependencias nuevas). Guarda iduser, username, rol y sucursal.
*   - autenticar: exige el encabezado "Authorization: Bearer <token>".
*   - requiereRol: limita una ruta a un rol (Administrador o Corporativo).
*   - soloConsulta: el Administrador solo CONSULTA clientes y proveedores.
*   - conPool: conecta la petición al nodo que corresponde al usuario:
*       Administrador San José -> nodo sanjose, login app_admin
*       Administrador Limón    -> nodo limon,   login app_admin
*       Corporativo            -> nodo corporativo, login app_corporativo
*     Si el nodo no responde, devuelve 503 con un mensaje claro (manejo de fallas).
*
*-----------------------------------------------------------------------------------------*/

const crypto = require('crypto');
const { getPool } = require('./db');

const SECRETO = process.env.TOKEN_SECRET || 'cambiar-este-secreto';
const DURACION_HORAS = 8;

const base64url = (texto) => Buffer.from(texto).toString('base64url');
const firmar = (datos) => crypto.createHmac('sha256', SECRETO).update(datos).digest('base64url');

function crearToken(usuario) {
    const carga = {
        iduser: usuario.iduser,
        username: usuario.username,
        fullname: usuario.fullname,
        rol: usuario.rol,
        sucursalId: usuario.SucursalID ?? null,
        sucursal: usuario.NombreSucursal,
        exp: Date.now() + DURACION_HORAS * 3600 * 1000
    };
    const datos = base64url(JSON.stringify(carga));
    return `${datos}.${firmar(datos)}`;
}

function verificarToken(token) {
    const [datos, firma] = String(token || '').split('.');
    if (!datos || !firma) return null;

    const esperada = firmar(datos);
    if (firma.length !== esperada.length ||
        !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) {
        return null;
    }

    const carga = JSON.parse(Buffer.from(datos, 'base64url').toString());
    return carga.exp > Date.now() ? carga : null;
}

function autenticar(req, res, next) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const usuario = verificarToken(token);

    if (!usuario) {
        return res.status(401).json({ error: 'Sesión no válida o vencida. Inicie sesión nuevamente.' });
    }

    req.usuario = usuario;
    next();
}

const requiereRol = (...roles) => (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
        return res.status(403).json({ error: `Esta sección es solo para el rol ${roles.join(' o ')}.` });
    }
    next();
};

function soloConsulta(req, res, next) {
    if (req.method !== 'GET') {
        return res.status(403).json({ error: 'El Administrador solo puede consultar clientes y proveedores.' });
    }
    next();
}

async function conPool(req, res, next) {
    const u = req.usuario;
    let nodo;
    let perfil;

    if (u.rol === 'Corporativo') {
        nodo = 'corporativo';
        perfil = 'corporativo';
    } else {
        nodo = u.sucursalId === 1 ? 'sanjose' : 'limon';
        perfil = 'admin';
    }

    try {
        req.pool = await getPool(nodo, perfil);
        req.nodo = nodo;
        next();
    } catch (err) {
        console.error(err.message, '-', err.causa);
        res.status(503).json({ error: err.message, nodo });
    }
}

module.exports = { crearToken, verificarToken, autenticar, requiereRol, soloConsulta, conPool };
