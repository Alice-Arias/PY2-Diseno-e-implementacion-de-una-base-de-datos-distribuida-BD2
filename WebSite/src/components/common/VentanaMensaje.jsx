/*---------------------------------------------------------------------------------------*
* NOMBRE: VentanaMensaje.jsx
*
* DESCRIPCION: Ventana de aviso (éxito o error) con un botón "Aceptar".
*
* ENTRADA:
*   mensaje   { tipo: 'exito' | 'error', titulo, mensaje } o null (no se muestra).
*   onCerrar  función del botón Aceptar.
*
* SALIDA: La ventana, o nada si no hay mensaje.
*
* OBJETIVO: Un solo aviso para todas las páginas.
*-----------------------------------------------------------------------------------------*/

function VentanaMensaje({ mensaje, onCerrar }) {
    if (!mensaje) return null;

    return (
        <div className="modal-overlay">
            <div className={`mensaje-modal ${mensaje.tipo}`}>
                <h2>{mensaje.titulo}</h2>
                <p>{mensaje.mensaje}</p>
                <button className="btn-aceptar" onClick={onCerrar}>Aceptar</button>
            </div>
        </div>
    );
}

export default VentanaMensaje;
