import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import MainLayout from './components/MainLayout';
import RutaProtegida from './components/RutaProtegida';

import LoginPage from './pages/LoginPage';
import ClientesPage from './pages/ClientesPage';
import ProveedoresPage from './pages/ProveedoresPage';
import InventarioPage from './pages/InventarioPage';
import VentasPage from './pages/VentasPage';
import ReportesPage from './pages/ReportesPage';
import SolicitudesPage from './pages/SolicitudesPage';

import './App.css';
import './tema.css';   // PY2: tema profesional claro / oscuro (va después de App.css)
import { temaGuardado } from './components/RelojTema';


/*--------------------------------------------------------------------------------------------------------------------------------
NOMBRE: App
DESCRIPCION: Componente principal. Muestra el menú lateral, la barra  superior y la página del módulo seleccionado.
ENTRADA: Ninguna (la página activa se guarda en el estado "page").
SALIDA: Interfaz principal de la aplicación (JSX).
RESTRICCIONES: Solo se muestra una página a la vez; los valores válidos de "page" son clientes, proveedores,  inventario y ventas.
OBJETIVO: Controlar la navegación entre los módulos del sistema.
-------------------------------------------------------------------------------------------------------------------------------------*/

function App() {

    /*-------------------------------------------------------------
    Estado: page
    Página que se muestra al abrir la aplicación (Clientes).
    -------------------------------------------------------------------*/
    const [page, setPage] = useState('clientes');

    /* PY2: modo claro / oscuro elegido por el usuario (botón junto a la hora). */
    const [tema, setTema] = useState(temaGuardado);

    useEffect(() => {
        const cambiar = (e) => setTema(e.detail);
        window.addEventListener('wwi-tema', cambiar);
        return () => window.removeEventListener('wwi-tema', cambiar);
    }, []);

    return (
        <div className={`wwi ${tema === 'oscuro' ? 'modo-oscuro' : 'modo-claro'}`}>
            <Routes>
                {/* Login: siempre es la primera pantalla */}
                <Route path="/" element={<LoginPage />} />

                {/* Resto de la app, dentro del layout con Sidebar y Topbar */}
                {/* PY2: Administrador -> módulos de su sucursal. Corporativo -> Reportes. */}
                <Route element={<RutaProtegida><MainLayout /></RutaProtegida>}>
                    <Route path="/clientes" element={<RutaProtegida roles={['Administrador']}><ClientesPage /></RutaProtegida>} />
                    <Route path="/proveedores" element={<RutaProtegida roles={['Administrador']}><ProveedoresPage /></RutaProtegida>} />
                    <Route path="/inventario" element={<RutaProtegida roles={['Administrador']}><InventarioPage /></RutaProtegida>} />
                    <Route path="/ventas" element={<RutaProtegida roles={['Administrador']}><VentasPage /></RutaProtegida>} />
                    <Route path="/reportes" element={<RutaProtegida roles={['Corporativo']}><ReportesPage /></RutaProtegida>} />
                    <Route path="/solicitudes" element={<RutaProtegida roles={['Corporativo']}><SolicitudesPage /></RutaProtegida>} />
                </Route>

                {/* Cualquier ruta desconocida vuelve al login */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;