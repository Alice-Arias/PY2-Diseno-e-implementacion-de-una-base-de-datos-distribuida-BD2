import { useState } from 'react';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import ClientesPage from './pages/ClientesPage';
import ProveedoresPage from './pages/ProveedoresPage';
import InventarioPage from './pages/InventarioPage';
import VentasPage from './pages/VentasPage';
import ReportesPage from './pages/ReportesPage';

import './App.css';


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

    return (
        <div className="app-shell">

            <Sidebar
                current={page}
                onNavigate={setPage}
            />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Topbar />

                <div className="content">
                    {page === 'clientes' && <ClientesPage />}
                    {page === 'proveedores' && <ProveedoresPage />}
                    {page === 'inventario' && <InventarioPage />}
                    {page === 'ventas' && <VentasPage />}
                    {page === 'reportes' && <ReportesPage />}
                </div>
            </div>

        </div>
    );
}

export default App;