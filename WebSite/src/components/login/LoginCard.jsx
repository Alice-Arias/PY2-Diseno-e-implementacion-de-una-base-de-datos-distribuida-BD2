import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bannerImg from '../../assets/WorldWidebanner.png';
import RoleSwitch from './RoleSwitch';
import CampoTexto from './CampoTexto';
import BotonIngresar from './BotonIngresar';
import { iniciarSesion } from '../../services/api';
import { guardarSesion, inicioSegunRol } from '../../services/sesion';
import './LoginCard.css';

function LoginCard() {
    const navigate = useNavigate();
    const [rol, setRol] = useState('corporativo');
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [intentoFallido, setIntentoFallido] = useState(false);
    const [errorLogin, setErrorLogin] = useState('');
    const [validando, setValidando] = useState(false);

    // Campos que aún faltan por llenar
    const faltantes = [];
    if (!usuario.trim()) faltantes.push({ id: 'usuario', label: 'Usuario' });
    if (!contrasena) faltantes.push({ id: 'contrasena', label: 'Contraseña' });

    const incompleto = faltantes.length > 0;
    const mostrarAviso = intentoFallido && incompleto;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validando) return;
        setErrorLogin('');

        if (incompleto) {
            setIntentoFallido(true);
            document.getElementById(faltantes[0].id)?.focus();
            return;
        }

        /* PY2: valida usuario y contraseña (encriptada) contra el Corporativo. */
        setValidando(true);
        try {
            const sesion = await iniciarSesion(usuario.trim(), contrasena, rol);
            guardarSesion(sesion);
            navigate(inicioSegunRol(sesion.usuario), { replace: true });
        } catch (err) {
            setErrorLogin(err.message);
        } finally {
            setValidando(false);
        }
    };

    return (
        <div className='login-card'>
            <div className='login-card-banner'>
                <img src={bannerImg} alt='World Wide' />
            </div>

            <form className='login-form' onSubmit={handleSubmit} noValidate>
                <RoleSwitch valor={rol} onChange={setRol} />

                <CampoTexto
                    id='usuario'
                    label='Usuario'
                    type='text'
                    value={usuario}
                    onChange={setUsuario}
                    placeholder='Ingresa tu usuario'
                    autoComplete='username'
                    error={intentoFallido && !usuario.trim()}
                />

                <CampoTexto
                    id='contrasena'
                    label='Contraseña'
                    type='password'
                    value={contrasena}
                    onChange={setContrasena}
                    placeholder='Ingresa tu contraseña'
                    autoComplete='current-password'
                    error={intentoFallido && !contrasena}
                />

                <BotonIngresar bloqueado={incompleto || validando} />

                {/* Aviso: aparece al hacer clic con campos vacíos y se va solo al completarlos */}
                {mostrarAviso && (
                    <p className='login-aviso' role='alert'>
                        Falta completar: {faltantes.map((f) => f.label).join(' y ')}
                    </p>
                )}

                {/* PY2: usuario o contraseña incorrectos, rol equivocado o nodo caído */}
                {errorLogin && (
                    <p className='login-aviso' role='alert'>
                        {errorLogin}
                    </p>
                )}
            </form>
        </div>
    );
}

export default LoginCard;