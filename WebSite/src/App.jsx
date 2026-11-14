/*---------------------------------------------------------------------------------------*
* NOMBRE: App.jsx
*
* DESCRIPCION: Componente principal de la web. Define las rutas (páginas) y aplica el
* modo claro u oscuro.
*
* ENTRADA: Ninguna. La ruta actual la da el navegador y el tema lo elige el usuario
* con el botón junto a la hora.
*
* SALIDA: La pantalla de inicio de sesión o la página del módulo, dentro del menú
* lateral y la barra superior.
*
* OBJETIVO: Controlar la navegación y mostrar a cada rol solo sus módulos:
*   Administrador -> Clientes, Proveedores, Inventario y Ventas de su sucursal.
*   Corporativo   -> Reportes y Solicitudes.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './components/layout/MainLayout';
import RutaProtegida from './components/layout/RutaProtegida';
import { temaGuardado } from './services/tema';

import LoginPage from './pages/LoginPage';
import ClientesPage from './pages/ClientesPage';
import ProveedoresPage from './pages/ProveedoresPage';
import InventarioPage from './pages/InventarioPage';
import VentasPage from './pages/VentasPage';
import ReportesPage from './pages/ReportesPage';
import SolicitudesPage from './pages/SolicitudesPage';

/* Página protegida: solo entra el rol indicado. */
const soloPara = (rol, pagina) => <RutaProtegida roles={[rol]}>{pagina}</RutaProtegida>;

function App() {
    const [tema, setTema] = useState(temaGuardado);

    // RelojTema avisa con el evento 'wwi-tema' cuando el usuario cambia el modo.
    useEffect(() => {
        const cambiarTema = (evento) => setTema(evento.detail);
        window.addEventListener('wwi-tema', cambiarTema);
        return () => window.removeEventListener('wwi-tema', cambiarTema);
    }, []);

    return (
        <div className={`wwi ${tema === 'oscuro' ? 'modo-oscuro' : 'modo-claro'}`}>
            <Routes>
                {/* Inicio de sesión: siempre es la primera pantalla. */}
                <Route path="/" element={<LoginPage />} />

                {/* Resto de la aplicación: exige sesión y va dentro del menú y la barra superior. */}
                <Route element={<RutaProtegida><MainLayout /></RutaProtegida>}>
                    <Route path="/clientes" element={soloPara('Administrador', <ClientesPage />)} />
                    <Route path="/proveedores" element={soloPara('Administrador', <ProveedoresPage />)} />
                    <Route path="/inventario" element={soloPara('Administrador', <InventarioPage />)} />
                    <Route path="/ventas" element={soloPara('Administrador', <VentasPage />)} />
                    <Route path="/reportes" element={soloPara('Corporativo', <ReportesPage />)} />
                    <Route path="/solicitudes" element={soloPara('Corporativo', <SolicitudesPage />)} />
                </Route>

                {/* Cualquier ruta desconocida vuelve al inicio de sesión. */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;
