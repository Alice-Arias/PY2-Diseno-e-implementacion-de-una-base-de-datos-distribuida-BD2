/*---------------------------------------------------------------------------------------*
*
* NOMBRE: sesion.js (PY2)
*
* DESCRIPCION: Guarda en el navegador la sesión que devuelve POST /api/auth/login:
* el token y los datos del usuario (nombre, rol y sucursal). La API vuelve a validar
* el token en cada petición; esto solo sirve para que la web sepa qué mostrar.
*
*-----------------------------------------------------------------------------------------*/

const CLAVE = 'wwi_sesion';

export function guardarSesion(sesion) {
  localStorage.setItem(CLAVE, JSON.stringify(sesion));
}

export function obtenerSesion() {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE));
    return sesion?.token ? sesion : null;
  } catch {
    return null;
  }
}

export function obtenerUsuario() {
  return obtenerSesion()?.usuario ?? null;
}

export function obtenerToken() {
  return obtenerSesion()?.token ?? null;
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE);
}

/* Página inicial según el rol: el Corporativo solo ve Reportes. */
export function inicioSegunRol(usuario) {
  return usuario?.rol === 'Corporativo' ? '/reportes' : '/clientes';
}
