/*---------------------------------------------------------------------------------------*
* NOMBRE: Sidebar.jsx
*
* DESCRIPCION: Menú lateral con el logo y las páginas que puede ver el rol del usuario:
*   Administrador -> Clientes, Proveedores, Inventario y Ventas.
*   Corporativo   -> Reportes y Solicitudes (con el número de pendientes, que se
*                    actualiza cada 20 segundos o al responder una solicitud).
*
* ENTRADA: paginaActual (para resaltarla) y onNavegar(pagina).
*
* SALIDA: El menú lateral.
*
* OBJETIVO: Mostrar a cada rol solo sus módulos.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Users, Truck, Package, ShoppingCart, BarChart3, ShieldCheck } from 'lucide-react';
import { solicitudesApi } from '../../services/solicitudesApi';
import { obtenerUsuario } from '../../services/sesion';

const PAGINAS = [
    { id: 'clientes', texto: 'Clientes', icono: Users, roles: ['Administrador'] },
    { id: 'proveedores', texto: 'Proveedores', icono: Truck, roles: ['Administrador'] },
    { id: 'inventario', texto: 'Inventario', icono: Package, roles: ['Administrador'] },
    { id: 'ventas', texto: 'Ventas', icono: ShoppingCart, roles: ['Administrador'] },
    { id: 'reportes', texto: 'Reportes', icono: BarChart3, roles: ['Corporativo'] },
    { id: 'solicitudes', texto: 'Solicitudes', icono: ShieldCheck, roles: ['Corporativo'] }
];

const REVISAR_PENDIENTES_MS = 20000;

/* Logo de Wide World Importers dibujado en SVG (se adapta al color del tema). */
function Marca() {
    return (
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
    );
}

function Sidebar({ paginaActual, onNavegar }) {
    const [pendientes, setPendientes] = useState(0);
    const rol = obtenerUsuario()?.rol;
    const esCorporativo = rol === 'Corporativo';

    useEffect(() => {
        if (!esCorporativo) return undefined;

        const contar = () => solicitudesApi.contarPendientes()
            .then((respuesta) => setPendientes(respuesta.pendientes))
            .catch(() => {});

        contar();
        const intervalo = setInterval(contar, REVISAR_PENDIENTES_MS);
        window.addEventListener('wwi-solicitudes', contar);   // Lo envía la página Solicitudes.
        return () => {
            clearInterval(intervalo);
            window.removeEventListener('wwi-solicitudes', contar);
        };
    }, [esCorporativo]);

    return (
        <aside className="sidebar">
            <div className="logo">
                <Marca />
            </div>

            <nav>
                {PAGINAS.filter((pagina) => pagina.roles.includes(rol)).map((pagina) => (
                    <div
                        key={pagina.id}
                        className={`nav-item ${paginaActual === pagina.id ? 'active' : ''}`}
                        onClick={() => onNavegar(pagina.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <pagina.icono size={18} />
                        {pagina.texto}
                        {pagina.id === 'solicitudes' && pendientes > 0 && (
                            <span className="nav-badge">{pendientes}</span>
                        )}
                    </div>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;
