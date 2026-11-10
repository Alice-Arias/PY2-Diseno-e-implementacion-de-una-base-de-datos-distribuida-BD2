/*---------------------------------------------------------------------------------------*
*
* NOMBRE: RutaProtegida (PY2)
*
* DESCRIPCION: Solo deja ver la página si hay una sesión abierta y el usuario tiene
* uno de los roles indicados. Si no hay sesión, vuelve al login; si el rol no
* corresponde, lo lleva a la página inicial de su rol.
* (La API también valida el rol en cada petición: esto es solo para la navegación.)
*
*-----------------------------------------------------------------------------------------*/

import { Navigate } from 'react-router-dom';
import { obtenerUsuario, inicioSegunRol } from '../services/sesion';

function RutaProtegida({ roles, children }) {
    const usuario = obtenerUsuario();

    if (!usuario) {
        return <Navigate to='/' replace />;
    }

    if (roles && !roles.includes(usuario.rol)) {
        return <Navigate to={inicioSegunRol(usuario)} replace />;
    }

    return children;
}

export default RutaProtegida;
