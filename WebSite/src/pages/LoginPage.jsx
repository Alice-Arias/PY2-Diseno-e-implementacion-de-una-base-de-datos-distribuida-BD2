/*---------------------------------------------------------------------------------------*
* NOMBRE: LoginPage.jsx
*
* DESCRIPCION: Pantalla de inicio de sesión. Si ya hay una sesión abierta, envía al
* usuario a la página inicial de su rol.
*
* ENTRADA: Ninguna.
*
* SALIDA: La pantalla de inicio de sesión.
*
* OBJETIVO: Punto de entrada de la aplicación.
*-----------------------------------------------------------------------------------------*/

import { Navigate } from 'react-router-dom';
import TarjetaLogin from '../components/login/TarjetaLogin';
import { obtenerUsuario, inicioSegunRol } from '../services/sesion';

function LoginPage() {
    const usuario = obtenerUsuario();

    if (usuario) {
        return <Navigate to={inicioSegunRol(usuario)} replace />;
    }

    return (
        <div className="login-page">
            <TarjetaLogin />
        </div>
    );
}

export default LoginPage;
