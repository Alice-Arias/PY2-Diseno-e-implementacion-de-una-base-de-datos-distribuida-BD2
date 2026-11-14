/*---------------------------------------------------------------------------------------*
* NOMBRE: EncabezadoPagina.jsx
*
* DESCRIPCION: Parte superior de cada página: ícono, título, descripción y, a la
* derecha, la hora en vivo con el botón de modo claro / oscuro.
*
* ENTRADA: icono (componente de lucide-react), titulo y descripcion.
*
* SALIDA: El encabezado de la página.
*
* OBJETIVO: Que todas las páginas tengan el mismo encabezado sin copiarlo.
*-----------------------------------------------------------------------------------------*/

import RelojTema from '../layout/RelojTema';

function EncabezadoPagina({ icono: Icono, titulo, descripcion }) {
    return (
        <div className="page-header">
            <div className="title-block">
                <div className="icon-box"><Icono size={22} /></div>
                <div>
                    <h1>{titulo}</h1>
                    <p>{descripcion}</p>
                </div>
            </div>
            <div className="header-right">
                <RelojTema />
            </div>
        </div>
    );
}

export default EncabezadoPagina;
