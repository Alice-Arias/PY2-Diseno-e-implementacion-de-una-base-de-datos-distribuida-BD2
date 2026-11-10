import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bannerImg from '../../assets/WorldWidebanner.png';
import RoleSwitch from './RoleSwitch';
import CampoTexto from './CampoTexto';
import BotonIngresar from './BotonIngresar';
import './LoginCard.css';

function LoginCard() {
    const navigate = useNavigate();
    const [rol, setRol] = useState('corporativo');
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [intentoFallido, setIntentoFallido] = useState(false);

    // Campos que aún faltan por llenar
    const faltantes = [];
    if (!usuario.trim()) faltantes.push({ id: 'usuario', label: 'Usuario' });
    if (!contrasena) faltantes.push({ id: 'contrasena', label: 'Contraseña' });

    const incompleto = faltantes.length > 0;
    const mostrarAviso = intentoFallido && incompleto;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (incompleto) {
            setIntentoFallido(true);
            document.getElementById(faltantes[0].id)?.focus();
            return;
        }

        // TODO: validar credenciales antes de navegar
        console.log({ rol, usuario, contrasena });
        navigate('/clientes');
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

                <BotonIngresar bloqueado={incompleto} />

                {/* Aviso: aparece al hacer clic con campos vacíos y se va solo al completarlos */}
                {mostrarAviso && (
                    <p className='login-aviso' role='alert'>
                        Falta completar: {faltantes.map((f) => f.label).join(' y ')}
                    </p>
                )}
            </form>
        </div>
    );
}

export default LoginCard;