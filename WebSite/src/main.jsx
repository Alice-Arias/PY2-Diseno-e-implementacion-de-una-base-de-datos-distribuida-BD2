/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Punto de entrada de la aplicacion React
*
* DESCRIPCION: Inicializa la aplicacion React, importa los estilos globales y el
* componente principal App, y lo monta dentro del elemento con id "root" del HTML
* envuelto en StrictMode para detectar problemas potenciales durante el desarrollo.
*
* ENTRADA: Elemento del DOM con id "root", archivo de estilos index.css y el
* componente App definido en App.jsx.
*
* SALIDA: Interfaz de usuario renderizada en el navegador.
*
* RESTRICCIONES: Requiere que exista un elemento con id "root" en el HTML y que los
* archivos index.css y App.jsx se encuentren disponibles en la ruta indicada.
*
* OBJETIVO: Arrancar la aplicacion y renderizar el componente principal en la pagina.
*
*---------------------------------------------------------------------------------------*/

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)