import { Navigate } from 'react-router-dom';
import LoginCard from '../components/login/LoginCard';
import { obtenerUsuario, inicioSegunRol } from '../services/sesion';
import './pagesStyles/LoginPage.css';

function LoginPage() {
    /* PY2: si ya hay una sesión abierta, se va directo a la página de su rol. */
    const usuario = obtenerUsuario();
    if (usuario) {
        return <Navigate to={inicioSegunRol(usuario)} replace />;
    }

    return (
        <div className='login-page'>
            <LoginCard />
        </div>
    );
}

export default LoginPage;
