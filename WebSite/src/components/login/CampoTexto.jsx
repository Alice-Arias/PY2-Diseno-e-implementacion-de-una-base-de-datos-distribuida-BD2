import { useState } from 'react';
import './CampoTexto.css';

function CampoTexto({
    id,
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    autoComplete,
    error = false, 
}) {
    const [visible, setVisible] = useState(false);

    const esPassword = type === 'password';
    const tipoActual = esPassword && visible ? 'text' : type;

    return (
        <div className={`campo ${error ? 'campo-error' : ''}`}> 
            <div className='campo'>
                <label htmlFor={id}>{label}</label>

                <div className='campo-control'>
                    <input
                        id={id}
                        name={id}
                        className={`campo-input ${esPassword ? 'con-accion' : ''}`}
                        type={tipoActual}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        autoComplete={autoComplete}
                        required
                        aria-invalid={error}
                    />

                    {esPassword && (
                        <button
                            type='button'
                            className='campo-toggle'
                            onClick={() => setVisible((v) => !v)}
                            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            aria-pressed={visible}
                        >
                            {visible ? (
                                /* Ojo tachado: la contraseña está visible */
                                <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                                    <path d='M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' />
                                    <path d='M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' />
                                    <path d='M14.12 14.12A3 3 0 1 1 9.88 9.88' />
                                    <line x1='1' y1='1' x2='23' y2='23' />
                                </svg>
                            ) : (
                                /* Ojo abierto: la contraseña está oculta */
                                <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                                    <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                                    <circle cx='12' cy='12' r='3' />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CampoTexto;