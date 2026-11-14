/*---------------------------------------------------------------------------------------*
* NOMBRE: BotonIngresar.jsx
*
* DESCRIPCION: Botón "Ingresar" del inicio de sesión. Se ve deshabilitado mientras
* faltan datos o se está validando (aria-disabled: sigue recibiendo el clic para
* poder mostrar qué falta).
*
* ENTRADA: bloqueado (true / false).
*
* SALIDA: El botón de envío del formulario.
*
* OBJETIVO: Enviar el formulario de inicio de sesión.
*-----------------------------------------------------------------------------------------*/

function BotonIngresar({ bloqueado = false }) {
    return (
        <button type="submit" className={`btn-ingresar ${bloqueado ? 'bloqueado' : ''}`} aria-disabled={bloqueado}>
            <span className="btn-ingresar-texto">Ingresar</span>
        </button>
    );
}

export default BotonIngresar;
