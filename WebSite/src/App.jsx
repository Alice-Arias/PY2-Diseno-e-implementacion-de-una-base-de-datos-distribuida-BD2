import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import MainLayout from './components/MainLayout';

import LoginPage from './pages/LoginPage';
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
        <div className="modo-oscuro">
            <Routes>
                {/* Login: siempre es la primera pantalla */}
                <Route path="/" element={<LoginPage />} />

                {/* Resto de la app, dentro del layout con Sidebar y Topbar */}
                <Route element={<MainLayout />}>
                    <Route path="/clientes" element={<ClientesPage />} />
                    <Route path="/proveedores" element={<ProveedoresPage />} />
                    <Route path="/inventario" element={<InventarioPage />} />
                    <Route path="/ventas" element={<VentasPage />} />
                    <Route path="/reportes" element={<ReportesPage />} />
                </Route>

                {/* Cualquier ruta desconocida vuelve al login */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;