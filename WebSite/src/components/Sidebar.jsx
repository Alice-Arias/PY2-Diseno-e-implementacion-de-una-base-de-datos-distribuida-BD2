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
* navegar. La opcion Inicio esta comentada y no se muestra. (PY2: se quitó el import
* de Home, que no se usaba; si se activa Inicio hay que volver a importarlo.)
*
* OBJETIVO: Permitir al usuario navegar entre los modulos de la aplicacion.
*
*---------------------------------------------------------------------------------------*/

import {
  Users,
  Truck,
  Package,
  ShoppingCart,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { contarSolicitudesPendientes } from '../services/api';
import '../pages/pagesStyles/Solicitudes.css';

import WorldWideBanner from "../assets/WorldWidebanner.png"
import { obtenerUsuario } from '../services/sesion';


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
  { id: 'clientes', label: 'Clientes', icon: Users, roles: ['Administrador'] },
  { id: 'proveedores', label: 'Proveedores', icon: Truck, roles: ['Administrador'] },
  { id: 'inventario', label: 'Inventario', icon: Package, roles: ['Administrador'] },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart, roles: ['Administrador'] },
  { id: 'reportes', label: 'Reportes', icon: BarChart3, roles: ['Corporativo'] },
  { id: 'solicitudes', label: 'Solicitudes', icon: ShieldCheck, roles: ['Corporativo'] }
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
  /* PY2: notificación de solicitudes pendientes para el Corporativo (cada 20 s). */
  const [pendientes, setPendientes] = useState(0);
  const esCorporativo = obtenerUsuario()?.rol === 'Corporativo';

  useEffect(() => {
    if (!esCorporativo) return undefined;
    const contar = () => contarSolicitudesPendientes()
      .then((r) => setPendientes(r.pendientes))
      .catch(() => {});
    contar();
    const intervalo = setInterval(contar, 20000);
    window.addEventListener('wwi-solicitudes', contar);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('wwi-solicitudes', contar);
    };
  }, [esCorporativo]);


  return (

    <aside className="sidebar">

      {/* LOGO */}

      <div className="logo">

        {/* PY2: marca dibujada (la imagen tenía fondo negro y no combinaba con el menú) */}
        <div className="marca" aria-label="Wide World Importers">
          <svg className="marca-simbolo" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M6 9h36L24 41z" fill="currentColor" opacity="0.18" />
            <path d="M6 9h36L24 41z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M14.5 15.5l4.2 11 5.3-8.4 5.3 8.4 4.2-11" fill="none" stroke="currentColor"
                  strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="marca-texto">
            <span className="marca-nombre">Wide World</span>
            <span className="marca-sub">Importers</span>
          </div>
        </div>


      </div>


      {/* MENU DE NAVEGACION */}

      <nav>

        {/* PY2: solo los módulos del rol del usuario */}
        {items.filter((item) => item.roles.includes(obtenerUsuario()?.rol)).map((item) => (

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
            {item.id === 'solicitudes' && pendientes > 0 && (
              <span className="nav-badge">{pendientes}</span>
            )}

          </div>

        ))}

      </nav>

    </aside>
  );
}


export default Sidebar;