/*---------------------------------------------------------------------------------------*
* NOMBRE: ModalCargando.jsx
*
* DESCRIPCION: Ventana con un ícono girando mientras se cargan los datos de un registro.
*
* ENTRADA: texto (ej. "Cargando información de la venta...") y onCerrar.
*
* SALIDA: La ventana de espera.
*
* OBJETIVO: Avisar que algo se está cargando, igual en todos los formularios.
*-----------------------------------------------------------------------------------------*/

import { Loader2 } from 'lucide-react';

function ModalCargando({ texto, onCerrar }) {
    return (
        <div className="modal-fondo" onClick={onCerrar}>
            <div className="modal-contenido modal-cliente-form" onClick={(evento) => evento.stopPropagation()}>
                <div className="modal-cargando">
                    <Loader2 size={30} className="girando" />
                    <p>{texto}</p>
                </div>
            </div>
        </div>
    );
}

export default ModalCargando;
