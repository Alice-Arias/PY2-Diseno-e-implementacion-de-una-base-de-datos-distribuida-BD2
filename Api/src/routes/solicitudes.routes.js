/*---------------------------------------------------------------------------------------*
* NOMBRE: solicitudes.routes.js
* ENTRADA: Datos en la URL o en el cuerpo. :tipo es "cliente" o "proveedor".
* DESCRIPCION: Solicitudes de acceso a los datos sensibles. El Administrador las pide
*   y el Corporativo las aprueba o rechaza. Todo se guarda en el Corporativo.
* SALIDA: JSON con el resultado de cada procedimiento Seguridad.SP_*.
* OBJETIVO: Que la regla de acceso se cumpla en la base de datos y no solo en la pantalla.
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const { sql, obtenerConexion } = require('../config/baseDatos');
const { requiereRol } = require('../middleware/autenticacion');
const { conManejoDeErrores, errorHttp } = require('../utils/respuestas');

const router = express.Router();

const TIPOS = { cliente: 'Cliente', proveedor: 'Proveedor' };
const ESTADOS_FILTRO = ['Pendiente', 'Aprobada', 'Rechazada'];

/* Estado de RAISERROR -> código HTTP: 1 dato inválido, 5 no existe, 10 sin permiso. */
const ERRORES_SOLICITUD = { estados: { 1: 400, 5: 404, 10: 403 }, mensaje: 'Error al procesar la solicitud.' };

/* Conexión al Corporativo con el perfil del usuario; si no responde, error 503. */
async function conexionCorporativo(usuario) {
    const perfil = usuario.rol === 'Corporativo' ? 'corporativo' : 'admin';
    try {
        return await obtenerConexion('corporativo', perfil);
    } catch (error) {
        console.error(error.message, '-', error.causa);
        throw errorHttp(503, 'El Corporativo no está disponible en este momento.');
    }
}

/* "cliente" -> "Cliente". Si no es un tipo válido, error 400. */
function tipoDeEntidad(valor) {
    const tipo = TIPOS[String(valor || '').toLowerCase()];
    if (!tipo) throw errorHttp(400, 'Tipo no válido (cliente o proveedor).');
    return tipo;
}

/* Ejecuta un procedimiento del Administrador sobre un cliente o proveedor. */
async function consultarEntidad(req, procedimiento) {
    const tipo = tipoDeEntidad(req.params.tipo);
    const pool = await conexionCorporativo(req.usuario);
    return pool.request()
        .input('IdUsuario', sql.Int, req.usuario.iduser)
        .input('TipoEntidad', sql.NVarChar(20), tipo)
        .input('EntidadID', sql.Int, Number(req.params.id))
        .execute(procedimiento);
}

/* --------------------------------- Administrador --------------------------------- */

/* Estado de su última solicitud. */
router.get('/estado/:tipo/:id', requiereRol('Administrador'), conManejoDeErrores(async (req, res) => {
    const resultado = await consultarEntidad(req, 'Seguridad.SP_Solicitud_Estado');
    res.json(resultado.recordset[0]);
}, ERRORES_SOLICITUD));

/* Pide acceso: { tipo, id, motivo }. */
router.post('/', requiereRol('Administrador'), conManejoDeErrores(async (req, res) => {
    const tipo = tipoDeEntidad(req.body?.tipo);
    const pool = await conexionCorporativo(req.usuario);
    const resultado = await pool.request()
        .input('IdUsuario', sql.Int, req.usuario.iduser)
        .input('TipoEntidad', sql.NVarChar(20), tipo)
        .input('EntidadID', sql.Int, Number(req.body.id))
        .input('Motivo', sql.NVarChar(300), req.body.motivo || null)
        .execute('Seguridad.SP_Solicitud_Crear');
    res.status(201).json(resultado.recordset[0]);
}, ERRORES_SOLICITUD));

/* Datos sensibles (solo con aprobación vigente). */
router.get('/datos/:tipo/:id', requiereRol('Administrador'), conManejoDeErrores(async (req, res) => {
    const resultado = await consultarEntidad(req, 'Seguridad.SP_DatosSensibles_Obtener');
    res.json(resultado.recordset[0] || null);
}, ERRORES_SOLICITUD));

/* ---------------------------------- Corporativo ---------------------------------- */

/* Cantidad de pendientes (contador del menú). */
router.get('/pendientes', requiereRol('Corporativo'), conManejoDeErrores(async (req, res) => {
    const pool = await conexionCorporativo(req.usuario);
    const resultado = await pool.request().execute('Seguridad.SP_Solicitudes_Pendientes');
    res.json({ pendientes: resultado.recordset[0]?.Pendientes ?? 0 });
}, ERRORES_SOLICITUD));

/* Lista de solicitudes; ?estado=Pendiente, Aprobada o Rechazada. */
router.get('/', requiereRol('Corporativo'), conManejoDeErrores(async (req, res) => {
    const estado = ESTADOS_FILTRO.includes(req.query.estado) ? req.query.estado : null;
    const pool = await conexionCorporativo(req.usuario);
    const resultado = await pool.request()
        .input('Estado', sql.NVarChar(20), estado)
        .execute('Seguridad.SP_Solicitudes_Listar');
    res.json(resultado.recordset);
}, ERRORES_SOLICITUD));

/* Aprueba o rechaza: { aprobar, horas }. */
router.post('/:id/responder', requiereRol('Corporativo'), conManejoDeErrores(async (req, res) => {
    const pool = await conexionCorporativo(req.usuario);
    const resultado = await pool.request()
        .input('IdSolicitud', sql.Int, Number(req.params.id))
        .input('Aprobar', sql.Bit, Boolean(req.body.aprobar))
        .input('RespondidoPor', sql.Int, req.usuario.iduser)
        .input('Horas', sql.Int, Number(req.body.horas) || 8)
        .execute('Seguridad.SP_Solicitud_Responder');
    res.json(resultado.recordset);
}, ERRORES_SOLICITUD));

module.exports = router;