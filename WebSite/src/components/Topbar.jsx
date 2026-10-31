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
* El nombre y las iniciales del usuario estan escritos de forma fija en el codigo. Los
* iconos Search y Bell se importan pero no se usan en este archivo, por lo que se
* podrian eliminar.
*
* OBJETIVO: Mostrar al usuario que tiene la sesion activa en la parte superior de la
* aplicacion.
*
*---------------------------------------------------------------------------------------*/

import {
  Search,
  Bell,
  ChevronDown
} from 'lucide-react';


function Topbar() {

  return (

    <div className="topbar">

      <div className="user">


        <div className="avatar">
          AD
        </div>

        Administrador

        <ChevronDown size={16} />

      </div>

    </div>
  );
}


export default Topbar;