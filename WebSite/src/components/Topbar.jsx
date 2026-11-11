/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Topbar (PY2)
*
* DESCRIPCION: Barra superior con el usuario de la sesión, su rol y su sucursal, y el
* botón para cerrar la sesión.
*
*-----------------------------------------------------------------------------------------*/

import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { obtenerUsuario, cerrarSesion } from '../services/sesion';

function Topbar() {
  const navigate = useNavigate();
  const usuario = obtenerUsuario();

  const iniciales = (usuario?.fullname || usuario?.username || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');

  const detalle = usuario?.rol === 'Corporativo'
    ? 'Corporativo, Escazú'
    : `Administrador de ${usuario?.sucursal ?? 'sucursal'}`;

  const salir = () => {
    cerrarSesion();
    navigate('/', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-usuario">
        <div className="topbar-avatar" aria-hidden="true">{iniciales}</div>
        <div className="topbar-datos">
          <span className="topbar-nombre">{usuario?.fullname}</span>
          <span className="topbar-rol">{detalle}</span>
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
