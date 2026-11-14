/*---------------------------------------------------------------------------------------*
* NOMBRE: token.js
*
* DESCRIPCION: Crea y verifica el token de sesión. El token lleva los datos del usuario
* (id, nombre, rol y sucursal) y una firma HMAC-SHA256 con TOKEN_SECRET, así nadie lo
* puede cambiar sin que se note. Usa el módulo crypto de Node (sin librerías extra).
*
* ENTRADA: Variable TOKEN_SECRET del .env.
*
* SALIDA: crearToken(usuario) y verificarToken(token).
*
* OBJETIVO: Saber en cada petición quién es el usuario sin volver a pedir la contraseña.
*-----------------------------------------------------------------------------------------*/

const crypto = require('crypto');

const SECRETO = process.env.TOKEN_SECRET || 'cambiar-este-secreto';
const DURACION_HORAS = 8;

const aBase64Url = (texto) => Buffer.from(texto).toString('base64url');
const firmar = (datos) => crypto.createHmac('sha256', SECRETO).update(datos).digest('base64url');

/*---------------------------------------------------------------------------------------*
* NOMBRE: crearToken
* ENTRADA: usuario (fila que devuelve Seguridad.SP_Usuario_Login).
* SALIDA: Texto "datos.firma", válido por 8 horas.
*-----------------------------------------------------------------------------------------*/
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
    const datos = aBase64Url(JSON.stringify(carga));
    return `${datos}.${firmar(datos)}`;
}

/*---------------------------------------------------------------------------------------*
* NOMBRE: verificarToken
* ENTRADA: token recibido en el encabezado Authorization.
* SALIDA: Los datos del usuario, o null si la firma no coincide o ya venció.
*-----------------------------------------------------------------------------------------*/
function verificarToken(token) {
    const [datos, firma] = String(token || '').split('.');
    if (!datos || !firma) return null;

    const firmaEsperada = firmar(datos);
    const firmaValida = firma.length === firmaEsperada.length &&
        crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(firmaEsperada));
    if (!firmaValida) return null;

    const carga = JSON.parse(Buffer.from(datos, 'base64url').toString());
    return carga.exp > Date.now() ? carga : null;
}

module.exports = { crearToken, verificarToken };
