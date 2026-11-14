/*---------------------------------------------------------------------------------------*
* NOMBRE: Topbar.jsx
*
* DESCRIPCION: Barra superior con las iniciales, el nombre y el rol del usuario, y el
* botón "Cerrar sesión".
*
* ENTRADA: Ninguna (lee el usuario de la sesión).
*
* SALIDA: La barra superior.
*
* OBJETIVO: Que el usuario vea con quién inició sesión y pueda salir.
*-----------------------------------------------------------------------------------------*/

import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { obtenerUsuario, cerrarSesion } from '../../services/sesion';

/* "Administrador San José" -> "AS" */
const iniciales = (nombre) =>
    nombre.split(' ').filter(Boolean).slice(0, 2).map((palabra) => palabra[0].toUpperCase()).join('');

function Topbar() {
    const navegar = useNavigate();
    const usuario = obtenerUsuario();

    const descripcionRol = usuario?.rol === 'Corporativo'
        ? 'Corporativo, Escazú'
        : `Administrador de ${usuario?.sucursal ?? 'sucursal'}`;

    const salir = () => {
        cerrarSesion();
        navegar('/', { replace: true });
    };

    return (
        <header className="topbar">
            <div className="topbar-usuario">
                <div className="topbar-avatar" aria-hidden="true">
                    {iniciales(usuario?.fullname || usuario?.username || '?')}
                </div>
                <div className="topbar-datos">
                    <span className="topbar-nombre">{usuario?.fullname}</span>
                    <span className="topbar-rol">{descripcionRol}</span>
                </div>
                <button type="button" className="btn-salir" onClick={salir}>
                    <LogOut size={16} />
                    Cerrar sesión
                </button>
            </div>
        </header>
    );
}

export default Topbar;
