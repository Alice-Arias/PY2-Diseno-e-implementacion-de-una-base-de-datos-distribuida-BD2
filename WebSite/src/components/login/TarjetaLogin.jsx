/*---------------------------------------------------------------------------------------*
* NOMBRE: TarjetaLogin.jsx
*
* DESCRIPCION: Tarjeta del inicio de sesión: logo, rol, usuario, contraseña y botón.
*   - Si falta un dato, dice cuál y pone el cursor en ese campo.
*   - Si la API rechaza el acceso, muestra su mensaje.
*   - Si entra bien, guarda la sesión y va a la página inicial del rol.
*
* ENTRADA: Ninguna.
*
* SALIDA: La tarjeta con el formulario.
*
* OBJETIVO: Iniciar sesión en la aplicación.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import imagenBanner from '../../assets/WorldWidebanner.png';
import SelectorRol from './SelectorRol';
import CampoTexto from './CampoTexto';
import BotonIngresar from './BotonIngresar';
import { iniciarSesion } from '../../services/autenticacionApi';
import { guardarSesion, inicioSegunRol } from '../../services/sesion';

function TarjetaLogin() {
    const navegar = useNavigate();
    const [rol, setRol] = useState('corporativo');
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [intentoFallido, setIntentoFallido] = useState(false);
    const [errorLogin, setErrorLogin] = useState('');
    const [validando, setValidando] = useState(false);

    const faltantes = [
        !usuario.trim() && { id: 'usuario', etiqueta: 'Usuario' },
        !contrasena && { id: 'contrasena', etiqueta: 'Contraseña' }
    ].filter(Boolean);
    const incompleto = faltantes.length > 0;

    const ingresar = async (evento) => {
        evento.preventDefault();
        if (validando) return;
        setErrorLogin('');

        if (incompleto) {
            setIntentoFallido(true);
            document.getElementById(faltantes[0].id)?.focus();
            return;
        }

        setValidando(true);
        try {
            const sesion = await iniciarSesion(usuario.trim(), contrasena, rol);
            guardarSesion(sesion);
            navegar(inicioSegunRol(sesion.usuario), { replace: true });
        } catch (error) {
            setErrorLogin(error.message);
        } finally {
            setValidando(false);
        }
    };

    return (
        <div className="login-card">
            <div className="login-card-banner">
                <img src={imagenBanner} alt="World Wide" />
            </div>

            <form className="login-form" onSubmit={ingresar} noValidate>
                <SelectorRol valor={rol} onCambiar={setRol} />
                <CampoTexto
                    id="usuario"
                    etiqueta="Usuario"
                    valor={usuario}
                    onCambiar={setUsuario}
                    placeholder="Ingresa tu usuario"
                    autoComplete="username"
                    error={intentoFallido && !usuario.trim()}
                />
                <CampoTexto
                    id="contrasena"
                    etiqueta="Contraseña"
                    tipo="password"
                    valor={contrasena}
                    onCambiar={setContrasena}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    error={intentoFallido && !contrasena}
                />
                <BotonIngresar bloqueado={incompleto || validando} />

                {intentoFallido && incompleto && (
                    <p className="login-aviso" role="alert">
                        Falta completar: {faltantes.map((faltante) => faltante.etiqueta).join(' y ')}
                    </p>
                )}
                {errorLogin && <p className="login-aviso" role="alert">{errorLogin}</p>}
            </form>
        </div>
    );
}

export default TarjetaLogin;
