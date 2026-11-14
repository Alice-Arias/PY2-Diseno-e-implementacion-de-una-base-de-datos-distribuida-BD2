/*---------------------------------------------------------------------------------------*
* NOMBRE: main.jsx
*
* DESCRIPCION: Punto de entrada de la web. Carga los estilos (styles/index.css) y
* monta la aplicación dentro del elemento "root" de index.html, con el enrutador.
*
* ENTRADA: El elemento <div id="root"> de index.html.
*
* SALIDA: La aplicación dibujada en el navegador.
*
* OBJETIVO: Arrancar la aplicación React.
*-----------------------------------------------------------------------------------------*/

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);
