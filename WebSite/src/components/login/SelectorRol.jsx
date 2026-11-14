/*---------------------------------------------------------------------------------------*
* NOMBRE: SelectorRol.jsx
*
* DESCRIPCION: Interruptor "Corporativo / Administrador" del inicio de sesión, con un
* indicador que se desliza hacia la opción elegida.
*
* ENTRADA: valor ('corporativo' | 'administrador') y onCambiar(valor).
*
* SALIDA: El interruptor.
*
* OBJETIVO: Elegir con qué rol se quiere entrar.
*-----------------------------------------------------------------------------------------*/

const ROLES = [
    { valor: 'corporativo', texto: 'Corporativo' },
    { valor: 'administrador', texto: 'Administrador' }
];

function SelectorRol({ valor, onCambiar }) {
    return (
        <div className="role-switch" role="radiogroup" aria-label="Tipo de acceso" data-activo={valor}>
            <span className="role-switch-indicador" aria-hidden="true" />
            {ROLES.map((rol) => (
                <button
                    key={rol.valor}
                    type="button"
                    role="radio"
                    aria-checked={valor === rol.valor}
                    className={`role-switch-opcion ${valor === rol.valor ? 'active' : ''}`}
                    onClick={() => onCambiar(rol.valor)}
                >
                    {rol.texto}
                </button>
            ))}
        </div>
    );
}

export default SelectorRol;
