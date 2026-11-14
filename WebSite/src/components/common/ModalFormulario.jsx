/*---------------------------------------------------------------------------------------*
* NOMBRE: ModalFormulario.jsx
*
* DESCRIPCION: Ventana de los formularios de crear y modificar: encabezado con ícono,
* título y botón cerrar; el formulario; y abajo los botones Cancelar y Guardar.
* Mientras se guarda, el botón dice "Guardando..." y no se puede cerrar.
*
* ENTRADA:
*   icono, titulo, subtitulo   encabezado.
*   textoGuardar               texto del botón (ej. "Guardar producto").
*   guardando                  true mientras se envía.
*   deshabilitarGuardar        true si todavía no se puede guardar.
*   onGuardar(evento)          al enviar el formulario.
*   onCerrar                   al cerrar o cancelar.
*   children                   los campos del formulario.
*
* SALIDA: La ventana con el formulario.
*
* OBJETIVO: Que todos los formularios tengan la misma ventana sin copiarla.
*-----------------------------------------------------------------------------------------*/

import { X, Save, Loader2 } from 'lucide-react';

function ModalFormulario({
    icono: Icono, titulo, subtitulo, textoGuardar,
    guardando, deshabilitarGuardar, onGuardar, onCerrar, children
}) {
    return (
        <div className="modal-fondo" onClick={onCerrar}>
            <div className="modal-contenido modal-cliente-form" onClick={(evento) => evento.stopPropagation()}>
                <header className="cd-encabezado">
                    <div className="cd-avatar">
                        <Icono size={25} />
                    </div>
                    <div className="cd-titulo">
                        <h2>{titulo}</h2>
                        <p className="cd-subtitulo">{subtitulo}</p>
                    </div>
                    <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar" disabled={guardando}>
                        <X size={22} />
                    </button>
                </header>

                <form onSubmit={onGuardar}>
                    {children}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-claro" onClick={onCerrar} disabled={guardando}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-azul" disabled={guardando || deshabilitarGuardar}>
                            {guardando
                                ? <><Loader2 size={17} className="girando" />Guardando...</>
                                : <><Save size={17} />{textoGuardar}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ModalFormulario;
