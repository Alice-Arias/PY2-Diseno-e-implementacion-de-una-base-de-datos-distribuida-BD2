/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Barra superior (Topbar)
*
* DESCRIPCION: Componente que muestra la barra superior de la aplicacion con la
* informacion del usuario activo. Presenta un avatar con las iniciales "AD", el texto
* "Administrador" y un icono de flecha desplegable.
*
* ENTRADA: Ninguna (no recibe props).
*
* SALIDA: Elemento JSX con la barra superior y el bloque de usuario.
*
* RESTRICCIONES: Requiere que existan los estilos de las clases topbar, user y avatar.
* El nombre y las iniciales del usuario estan escritos de forma fija en el codigo.
* (PY2: se quitaron los imports de Search y Bell, que no se usaban.)
*
* OBJETIVO: Mostrar al usuario que tiene la sesion activa en la parte superior de la
* aplicacion.
*
*---------------------------------------------------------------------------------------*/

import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { obtenerUsuario, cerrarSesion } from '../services/sesion';

/* PY2: muestra el usuario de la sesión, su rol y su sucursal, y permite salir. */
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
    ? 'Corporativo · Escazú'
    : `Administrador · ${usuario?.sucursal ?? ''}`;

  const salir = () => {
    cerrarSesion();
    navigate('/', { replace: true });
  };

  return (
    <div className="topbar">
      <div className="user">
        <div className="avatar">{iniciales}</div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span>{usuario?.fullname}</span>
          <small style={{ fontWeight: 500, opacity: 0.75 }}>{detalle}</small>
        </div>
        <button
          type="button"
          className="btn-restaurar"
          style={{ height: 34, marginLeft: '0.6rem' }}
          onClick={salir}
          title="Cerrar sesión"
        >
          <LogOut size={15} />
          Salir
        </button>
      </div>
    </div>
  );
}

export default Topbar;
