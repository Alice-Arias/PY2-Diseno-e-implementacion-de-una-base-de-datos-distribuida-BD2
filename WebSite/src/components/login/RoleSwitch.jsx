import './RoleSwitch.css';

const OPCIONES = [
    { valor: 'corporativo', texto: 'Corporativo' },
    { valor: 'administrador', texto: 'Administrador' },
];

function RoleSwitch({ valor, onChange }) {
    return (
        <div
            className='role-switch'
            role='radiogroup'
            aria-label='Tipo de acceso'
            data-activo={valor}
        >
            {/* Pieza que se desliza entre las dos opciones */}
            <span className='role-switch-indicador' aria-hidden='true' />

            {OPCIONES.map((opcion) => (
                <button
                    key={opcion.valor}
                    type='button'
                    role='radio'
                    aria-checked={valor === opcion.valor}
                    className={`role-switch-opcion ${valor === opcion.valor ? 'active' : ''}`}
                    onClick={() => onChange(opcion.valor)}
                >
                    {opcion.texto}
                </button>
            ))}
        </div>
    );
}

export default RoleSwitch;