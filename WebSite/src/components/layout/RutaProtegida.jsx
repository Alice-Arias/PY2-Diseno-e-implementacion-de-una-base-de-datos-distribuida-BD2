/*---------------------------------------------------------------------------------------*
* NOMBRE: RutaProtegida.jsx
*
* DESCRIPCION: Deja entrar a una página solo si hay sesión y el rol está permitido.
*   Sin sesión          -> pantalla de inicio de sesión.
*   Rol no permitido    -> página inicial de su rol.
*
* ENTRADA: roles (lista de roles permitidos; si no se indica, cualquier rol) y children.
*
* SALIDA: La página, o la redirección.
*
* OBJETIVO: Proteger las páginas en la web (la API también lo revisa).
*-----------------------------------------------------------------------------------------*/

import { Navigate } from 'react-router-dom';
import { obtenerUsuario, inicioSegunRol } from '../../services/sesion';

function RutaProtegida({ roles, children }) {
    const usuario = obtenerUsuario();

    if (!usuario) {
        return <Navigate to="/" replace />;
    }
    if (roles && !roles.includes(usuario.rol)) {
        return <Navigate to={inicioSegunRol(usuario)} replace />;
    }
    return children;
}

export default RutaProtegida;
