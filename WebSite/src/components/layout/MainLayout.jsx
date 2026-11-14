/*---------------------------------------------------------------------------------------*
* NOMBRE: MainLayout.jsx
*
* DESCRIPCION: Marco de todas las páginas después de iniciar sesión: menú lateral,
* barra superior, barra de carga y el contenido de la página actual (<Outlet />).
* Escucha los avisos de services/http.js:
*   'wwi-cargando'   hay peticiones en curso -> barra de carga.
*   'wwi-nodo-caido' el nodo no respondió    -> franja de aviso.
*   'wwi-nodo-ok'    volvió a responder      -> se quita la franja.
*
* ENTRADA: La ruta actual (react-router).
*
* SALIDA: La estructura de la página.
*
* OBJETIVO: Compartir menú, barra y avisos entre todas las páginas.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const estiloAviso = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    margin: '0 0 1.2rem',
    padding: '0.9rem 1.1rem',
    border: '1px solid #b9853a',
    borderRadius: '12px',
    background: 'rgba(200, 145, 50, 0.14)',
    color: '#e3b85c',
    fontWeight: 600
};

function MainLayout() {
    const ubicacion = useLocation();
    const navegar = useNavigate();
    const [avisoNodo, setAvisoNodo] = useState('');
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        const alCaerNodo = (evento) => setAvisoNodo(evento.detail || 'El nodo no está disponible en este momento.');
        const alResponderNodo = () => setAvisoNodo('');
        const alCambiarCarga = (evento) => setCargando(evento.detail > 0);

        window.addEventListener('wwi-cargando', alCambiarCarga);
        window.addEventListener('wwi-nodo-caido', alCaerNodo);
        window.addEventListener('wwi-nodo-ok', alResponderNodo);
        return () => {
            window.removeEventListener('wwi-cargando', alCambiarCarga);
            window.removeEventListener('wwi-nodo-caido', alCaerNodo);
            window.removeEventListener('wwi-nodo-ok', alResponderNodo);
        };
    }, []);

    const paginaActual = ubicacion.pathname.split('/')[1];

    return (
        <div className="app-shell">
            <div className={`barra-carga ${cargando ? 'activa' : ''}`} role="progressbar" aria-label="Cargando" aria-busy={cargando} />
            <Sidebar paginaActual={paginaActual} onNavegar={(pagina) => navegar(`/${pagina}`)} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Topbar />
                <div className="content">
                    {avisoNodo && (
                        <div style={estiloAviso} role="alert">
                            <AlertTriangle size={20} />
                            <span>{avisoNodo} Intente de nuevo en unos momentos.</span>
                        </div>
                    )}
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default MainLayout;
