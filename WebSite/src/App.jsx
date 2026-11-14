/*---------------------------------------------------------------------------------------*
*
* NOMBRE: App.jsx
*
* DESCRIPCION: Componente principal de la web. Define las rutas (páginas) de la
* aplicación y aplica el tema claro u oscuro.
*
* ENTRADA: Ninguna. La ruta actual la da el navegador y el tema lo elige el
* usuario con el botón junto a la hora.
*
* SALIDA: La pantalla de inicio de sesión o la página del módulo, dentro del
* menú lateral y la barra superior.
*
* OBJETIVO: Controlar la navegación y mostrar a cada rol solo sus módulos:
*   Administrador -> Clientes, Proveedores, Inventario y Ventas de su sucursal.
*   Corporativo   -> Reportes y Solicitudes.
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Estructura: menú lateral + barra superior, y protección de rutas por rol.
import MainLayout from './components/MainLayout';
import RutaProtegida from './components/RutaProtegida';

// Páginas
import LoginPage from './pages/LoginPage';
import ClientesPage from './pages/ClientesPage';
import ProveedoresPage from './pages/ProveedoresPage';
import InventarioPage from './pages/InventarioPage';
import VentasPage from './pages/VentasPage';
import ReportesPage from './pages/ReportesPage';
import SolicitudesPage from './pages/SolicitudesPage';

// Estilos (el orden importa: cada archivo ajusta al anterior).
import './App.css';
import './tema.css';     // Colores del modo claro y oscuro.
import './mejoras.css';  // Animaciones, alineación y accesibilidad.
import { temaGuardado } from './components/RelojTema';


/*---------------------------------------------------------------------------------------*
* NOMBRE: App
* ENTRADA: Ninguna.
* DESCRIPCION: Escucha el cambio de tema y dibuja las rutas.
* SALIDA: La interfaz de la aplicación (JSX).
* OBJETIVO: Ser el punto de entrada de todas las páginas.
*-----------------------------------------------------------------------------------------*/
function App() {

    // Tema actual ('claro' u 'oscuro'). Empieza con el que se guardó en el navegador.
    const [tema, setTema] = useState(temaGuardado);

    // Cuando el usuario presiona el botón de tema, RelojTema avisa con el evento
    // 'wwi-tema' y aquí se actualiza.
    useEffect(() => {
        const cambiar = (e) => setTema(e.detail);
        window.addEventListener('wwi-tema', cambiar);
        return () => window.removeEventListener('wwi-tema', cambiar);
    }, []);

    return (
        <div className={`wwi ${tema === 'oscuro' ? 'modo-claro' : 'modo-oscuro'}`}>
            <Routes>
                {/* Inicio de sesión: siempre es la primera pantalla. */}
                <Route path="/" element={<LoginPage />} />

                {/* Resto de la aplicación: exige sesión y va dentro del menú y la barra superior.
                    roles = quién puede entrar a cada página. */}
                <Route element={<RutaProtegida><MainLayout /></RutaProtegida>}>
                    <Route path="/clientes" element={<RutaProtegida roles={['Administrador']}><ClientesPage /></RutaProtegida>} />
                    <Route path="/proveedores" element={<RutaProtegida roles={['Administrador']}><ProveedoresPage /></RutaProtegida>} />
                    <Route path="/inventario" element={<RutaProtegida roles={['Administrador']}><InventarioPage /></RutaProtegida>} />
                    <Route path="/ventas" element={<RutaProtegida roles={['Administrador']}><VentasPage /></RutaProtegida>} />
                    <Route path="/reportes" element={<RutaProtegida roles={['Corporativo']}><ReportesPage /></RutaProtegida>} />
                    <Route path="/solicitudes" element={<RutaProtegida roles={['Corporativo']}><SolicitudesPage /></RutaProtegida>} />
                </Route>

                {/* Cualquier ruta desconocida vuelve al inicio de sesión. */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;