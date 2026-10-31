/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Menu lateral (Sidebar)
*
* DESCRIPCION: Componente que crea el menu lateral de la aplicacion. Muestra el logo del
* sistema (icono de base de datos y el texto "Sistema BD2") y una lista de opciones de
* navegacion: Clientes, Proveedores, Inventario, Ventas y Reportes. La opcion que
* corresponde a la pagina abierta se marca como activa y al hacer clic en una opcion se
* avisa a App.jsx para cambiar de pagina.
*
* ENTRADA: current - id de la pagina que esta abierta (por ejemplo clientes o ventas).
* Sirve para marcar la opcion activa.
* onNavigate - funcion que cambia de pagina. Se ejecuta al hacer clic en una opcion y
* recibe el id de la opcion elegida.
*
* SALIDA: Elemento JSX con el menu lateral.
*
* RESTRICCIONES: Requiere que existan los estilos de las clases sidebar, logo, nav-item
* y active. Los ids de las opciones deben coincidir con los que reconoce App.jsx para
* navegar. La opcion Inicio esta comentada y no se muestra. El icono Home se importa
* pero no se usa mientras esa opcion siga comentada, por lo que se podria eliminar.
*
* OBJETIVO: Permitir al usuario navegar entre los modulos de la aplicacion.
*
*---------------------------------------------------------------------------------------*/

import {
  Home,
  Users,
  Truck,
  Package,
  ShoppingCart,
  BarChart3,
  Database
} from 'lucide-react';


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: items
*
* DESCRIPCION: Lista de las opciones que se muestran en el menu de navegacion. Cada
* opcion define su id (identificador de la pagina), su label (texto que se muestra) y
* su icon (icono que se dibuja junto al texto).
*
* ENTRADA: Ninguna.
*
* SALIDA: Arreglo de objetos con las opciones del menu.
*
* RESTRICCIONES: Cada id debe ser unico y coincidir con una pagina existente en App.jsx.
*
* OBJETIVO: Centralizar la configuracion de las opciones del menu.
*
*---------------------------------------------------------------------------------------*/

const items = [
  //{ id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'proveedores', label: 'Proveedores', icon: Truck },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
  { id: 'reportes', label: 'Reportes', icon: BarChart3 }
];


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Sidebar
*
* DESCRIPCION: Componente que dibuja el logo y recorre la lista items para mostrar cada
* opcion del menu. Agrega la clase active solo a la opcion cuyo id coincide con la
* pagina actual y, al hacer clic, ejecuta onNavigate con el id de la opcion.
*
* ENTRADA: current - id de la pagina abierta.
* onNavigate - funcion que cambia de pagina.
*
* SALIDA: Elemento JSX con el menu lateral.
*
* RESTRICCIONES: Ambas propiedades son obligatorias. Si onNavigate no es una funcion
* ocurre un error al hacer clic en una opcion.
*
* OBJETIVO: Mostrar el menu y resaltar la pagina en la que se encuentra el usuario.
*
*---------------------------------------------------------------------------------------*/

function Sidebar({ current, onNavigate }) {

  return (

    <aside className="sidebar">

      {/* LOGO */}

      <div className="logo">

        <Database color="#071cff" />

        <span>
          Sistema BD2
        </span>

      </div>


      {/* MENU DE NAVEGACION */}

      <nav>

        {items.map((item) => (

          <div

            key={item.id}

            // Tendra "active" solo si es la pagina actual.

            className={`nav-item ${current === item.id ? 'active' : ''}`}

            // Al hacer clic, le avisamos a App.jsx
            // que pagina queremos abrir.

            onClick={() => onNavigate(item.id)}

            style={{ cursor: 'pointer' }}
          >

            <item.icon size={18} />

            {item.label}

          </div>

        ))}

      </nav>

    </aside>
  );
}


export default Sidebar;