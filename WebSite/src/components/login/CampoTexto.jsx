/*---------------------------------------------------------------------------------------*
* NOMBRE: CampoTexto.jsx
*
* DESCRIPCION: Campo del inicio de sesión (usuario o contraseña). Si es contraseña,
* tiene un botón con un ojo para mostrarla u ocultarla.
*
* ENTRADA: id, etiqueta, tipo ('text' | 'password'), valor, onCambiar(texto),
*          placeholder, autoComplete y error (true para marcarlo en rojo).
*
* SALIDA: El campo con su etiqueta.
*
* OBJETIVO: Escribir el usuario y la contraseña.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';

const atributosIcono = {
    viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor',
    strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true'
};

function OjoTachado() {
    return (
        <svg {...atributosIcono}>
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

function Ojo() {
    return (
        <svg {...atributosIcono}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function CampoTexto({ id, etiqueta, tipo = 'text', valor, onCambiar, placeholder, autoComplete, error = false }) {
    const [visible, setVisible] = useState(false);
    const esContrasena = tipo === 'password';
    const tipoMostrado = esContrasena && visible ? 'text' : tipo;

    return (
        // Dos contenedores .campo: los estilos del inicio de sesión dependen de esa estructura.
        <div className={`campo ${error ? 'campo-error' : ''}`}>
            <div className="campo">
                <label htmlFor={id}>{etiqueta}</label>
                <div className="campo-control">
                    <input
                        id={id}
                        name={id}
                        className={`campo-input ${esContrasena ? 'con-accion' : ''}`}
                        type={tipoMostrado}
                        value={valor}
                        onChange={(evento) => onCambiar(evento.target.value)}
                        placeholder={placeholder}
                        autoComplete={autoComplete}
                        required
                        aria-invalid={error}
                    />
                    {esContrasena && (
                        <button
                            type="button"
                            className="campo-toggle"
                            onClick={() => setVisible((anterior) => !anterior)}
                            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            aria-pressed={visible}
                        >
                            {visible ? <OjoTachado /> : <Ojo />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CampoTexto;
