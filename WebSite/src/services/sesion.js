/*---------------------------------------------------------------------------------------*
* NOMBRE: sesion.js
*
* DESCRIPCION: Guarda en el navegador la sesión que devuelve el inicio de sesión: el
* token y los datos del usuario (nombre, rol y sucursal). La API vuelve a validar el
* token en cada petición; esto solo sirve para que la web sepa qué mostrar.
*
* ENTRADA: La sesión { token, usuario }.
*
* SALIDA: Funciones para guardar, leer y cerrar la sesión.
*
* OBJETIVO: Recordar al usuario hasta que cierre sesión o venza el token.
*-----------------------------------------------------------------------------------------*/

const CLAVE_SESION = 'wwi_sesion';

export function guardarSesion(sesion) {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

export function obtenerSesion() {
    try {
        const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION));
        return sesion?.token ? sesion : null;
    } catch {
        return null;
    }
}

export const obtenerUsuario = () => obtenerSesion()?.usuario ?? null;

export const obtenerToken = () => obtenerSesion()?.token ?? null;

export function cerrarSesion() {
    localStorage.removeItem(CLAVE_SESION);
}

/* Página inicial según el rol: el Corporativo empieza en Reportes; el Administrador en Clientes. */
export const inicioSegunRol = (usuario) => (usuario?.rol === 'Corporativo' ? '/reportes' : '/clientes');
