import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

/* PY2 (fallas): franja de aviso cuando el nodo de la sucursal no responde.
   La activa services/api.js al recibir un 503 y la quita al primer éxito. */
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
    const location = useLocation();
    const navigate = useNavigate();
    const [avisoNodo, setAvisoNodo] = useState('');
    const [cargando, setCargando] = useState(false);   // PY2: barra de carga global

    useEffect(() => {
        const caido = (e) => setAvisoNodo(e.detail || 'El nodo no está disponible en este momento.');
        const ok = () => setAvisoNodo('');
        const carga = (e) => setCargando(e.detail > 0);
        window.addEventListener('wwi-cargando', carga);
        window.addEventListener('wwi-nodo-caido', caido);
        window.addEventListener('wwi-nodo-ok', ok);
        return () => {
            window.removeEventListener('wwi-cargando', carga);
            window.removeEventListener('wwi-nodo-caido', caido);
            window.removeEventListener('wwi-nodo-ok', ok);
        };
    }, []);

    // "/clientes" -> "clientes"
    const current = location.pathname.split('/')[1];

    return (
        <div className="app-shell">
            {/* PY2: barra de carga: aparece mientras hay consultas en curso */}
            <div className={`barra-carga ${cargando ? 'activa' : ''}`} role="progressbar" aria-label="Cargando" aria-busy={cargando} />

            <Sidebar
                current={current}
                onNavigate={(page) => navigate(`/${page}`)}
            />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Topbar />

                <div className="content">
                    {avisoNodo && (
                        <div style={estiloAviso} role="alert">
                            <AlertTriangle size={20} />
                            <span>
                                {avisoNodo} Intente de nuevo en unos momentos.
                            </span>
                        </div>
                    )}
                    <Outlet />
                </div>
            </div>

        </div>
    );
}

export default MainLayout;
