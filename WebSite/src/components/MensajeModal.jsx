// ============================================================
// MODAL PARA MOSTRAR MENSAJES
// ============================================================

import {
    X,
    CheckCircle2,
    AlertCircle,
    Info
} from 'lucide-react';


function MensajeModal({
    mensaje,
    onCerrar
}) {

    // Si no existe mensaje, no mostramos nada.
    if (!mensaje) {
        return null;
    }


    // ========================================================
    // DETERMINAR TIPO
    // ========================================================

    const esExito = mensaje.tipo === 'exito';

    const esError = mensaje.tipo === 'error';


    return (

        <div
            className="modal-fondo"
            onClick={onCerrar}
        >

            <div
                className={`modal-contenido mensaje-modal ${
                    esExito
                        ? 'mensaje-exito'
                        : esError
                            ? 'mensaje-error'
                            : 'mensaje-info'
                }`}
                onClick={(e) => e.stopPropagation()}
            >

                {/* ==================================================
                    ENCABEZADO
                ================================================== */}

                <div className="mensaje-encabezado">

                    <div className="mensaje-icono">

                        {esExito && (
                            <CheckCircle2 size={30} />
                        )}

                        {esError && (
                            <AlertCircle size={30} />
                        )}

                        {!esExito && !esError && (
                            <Info size={30} />
                        )}

                    </div>


                    <button
                        type="button"
                        className="modal-cerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                    >

                        <X size={21} />

                    </button>

                </div>


                {/* ==================================================
                    CONTENIDO
                ================================================== */}

                <div className="mensaje-contenido">

                    <h2>
                        {mensaje.titulo}
                    </h2>


                    <p>
                        {mensaje.mensaje}
                    </p>

                </div>


                {/* ==================================================
                    BOTÓN
                ================================================== */}

                <div className="mensaje-footer">

                    <button
                        type="button"
                        className="btn btn-azul"
                        onClick={onCerrar}
                    >

                        Aceptar

                    </button>

                </div>

            </div>

        </div>
    );
}


export default MensajeModal;