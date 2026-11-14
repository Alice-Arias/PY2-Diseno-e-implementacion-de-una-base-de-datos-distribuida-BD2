/*---------------------------------------------------------------------------------------*
* NOMBRE: respuestas.js
* ENTRADA: La respuesta (res) y el resultado del procedimiento.
* DESCRIPCION: Respuestas y manejo de errores comunes de las rutas.
* SALIDA: errorHttp, conManejoDeErrores, responderPaginado y responderDetalle.
* OBJETIVO: Quitar el try/catch y las respuestas repetidas de cada ruta.
*-----------------------------------------------------------------------------------------*/

/* Crea un error con su código HTTP (ej. 400 por un dato inválido). */
function errorHttp(codigo, mensaje) {
    const error = new Error(mensaje);
    error.codigoHttp = codigo;
    return error;
}

/*---------------------------------------------------------------------------------------*
* NOMBRE: conManejoDeErrores
* ENTRADA: accion de la ruta y opciones { mensaje, estados, codigoPorDefecto }.
*          estados = { estado de RAISERROR: código HTTP }.
* DESCRIPCION: Si la ruta falla, responde el error con el código correcto.
* SALIDA: Función (req, res) para usar en el router.
*-----------------------------------------------------------------------------------------*/
function conManejoDeErrores(accion, { mensaje = null, estados = {}, codigoPorDefecto = 500 } = {}) {
    return async (req, res) => {
        try {
            await accion(req, res);
        } catch (error) {
            console.error(error);
            const codigoConocido = error.codigoHttp ?? estados[error.state];
            const codigo = codigoConocido ?? codigoPorDefecto;
            const texto = codigoConocido || !mensaje ? error.message : mensaje;
            res.status(codigo).json({ error: texto });
        }
    };
}

/* Responde { datos, paginacion } de un procedimiento _Listar. */
function responderPaginado(res, resultado) {
    res.json({
        datos: resultado.recordsets[0],
        paginacion: resultado.recordsets[1][0]
    });
}

/* Responde las filas del detalle, o 404 si no hay ninguna. */
function responderDetalle(res, resultado, mensajeNoEncontrado) {
    if (resultado.recordset.length === 0) {
        return res.status(404).json({ error: mensajeNoEncontrado });
    }
    res.json(resultado.recordset);
}

module.exports = { errorHttp, conManejoDeErrores, responderPaginado, responderDetalle };