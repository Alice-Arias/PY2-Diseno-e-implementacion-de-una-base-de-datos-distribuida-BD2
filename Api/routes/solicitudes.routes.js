/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas de solicitudes de acceso a datos sensibles (PY2)
*
* Los datos sensibles de clientes y proveedores viven solo en el Corporativo.
* El Administrador los ve como "xxxx" hasta que el Corporativo autoriza el acceso.
*
*   Administrador (se conecta al Corporativo con app_admin):
*     GET  /api/solicitudes/estado/:tipo/:id   -> estado de su última solicitud
*     POST /api/solicitudes                    -> { tipo, id, motivo } crea la solicitud
*     GET  /api/solicitudes/datos/:tipo/:id    -> datos sensibles (solo si está aprobada)
*
*   Corporativo (se conecta con app_corporativo):
*     GET  /api/solicitudes?estado=Pendiente   -> lista de solicitudes
*     GET  /api/solicitudes/pendientes         -> cantidad pendiente (notificación)
*     POST /api/solicitudes/:id/responder      -> { aprobar, horas }
*
* La regla se valida en la base de datos (17_Corporativo_SolicitudesAcceso.sql):
* SP_DatosSensibles_Obtener no entrega nada sin una aprobación vigente.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { requiereRol } = require('../auth');

const TIPOS = { cliente: 'Cliente', proveedor: 'Proveedor' };

/* Pool del Corporativo según el rol del usuario. */
async function poolCorporativo(req, res) {
    const perfil = req.usuario.rol === 'Corporativo' ? 'corporativo' : 'admin';
    try {
        return await getPool('corporativo', perfil);
    } catch (err) {
        console.error(err.message, '-', err.causa);
        res.status(503).json({ error: 'El Corporativo no está disponible en este momento.' });
        return null;
    }
}

function tipoDe(req, res) {
    const tipo = TIPOS[String(req.params.tipo || req.body?.tipo || '').toLowerCase()];
    if (!tipo) res.status(400).json({ error: 'Tipo no válido (cliente o proveedor).' });
    return tipo;
}

function responderError(res, err) {
    console.error(err);
    const codigo = { 1: 400, 5: 404, 10: 403 }[err.state] ?? 500;
    res.status(codigo).json({ error: codigo === 500 ? 'Error al procesar la solicitud.' : err.message });
}

/* ------------------------------- Administrador ------------------------------- */

router.get('/estado/:tipo/:id', requiereRol('Administrador'), async (req, res) => {
    const tipo = tipoDe(req, res); if (!tipo) return;
    const pool = await poolCorporativo(req, res); if (!pool) return;
    try {
        const r = await pool.request()
            .input('IdUsuario', sql.Int, req.usuario.iduser)
            .input('TipoEntidad', sql.NVarChar(20), tipo)
            .input('EntidadID', sql.Int, Number(req.params.id))
            .execute('Seguridad.SP_Solicitud_Estado');
        res.json(r.recordset[0]);
    } catch (err) { responderError(res, err); }
});

router.post('/', requiereRol('Administrador'), async (req, res) => {
    const tipo = tipoDe(req, res); if (!tipo) return;
    const pool = await poolCorporativo(req, res); if (!pool) return;
    try {
        const r = await pool.request()
            .input('IdUsuario', sql.Int, req.usuario.iduser)
            .input('TipoEntidad', sql.NVarChar(20), tipo)
            .input('EntidadID', sql.Int, Number(req.body.id))
            .input('Motivo', sql.NVarChar(300), req.body.motivo || null)
            .execute('Seguridad.SP_Solicitud_Crear');
        res.status(201).json(r.recordset[0]);
    } catch (err) { responderError(res, err); }
});

router.get('/datos/:tipo/:id', requiereRol('Administrador'), async (req, res) => {
    const tipo = tipoDe(req, res); if (!tipo) return;
    const pool = await poolCorporativo(req, res); if (!pool) return;
    try {
        const r = await pool.request()
            .input('IdUsuario', sql.Int, req.usuario.iduser)
            .input('TipoEntidad', sql.NVarChar(20), tipo)
            .input('EntidadID', sql.Int, Number(req.params.id))
            .execute('Seguridad.SP_DatosSensibles_Obtener');
        res.json(r.recordset[0] || null);
    } catch (err) { responderError(res, err); }
});

/* -------------------------------- Corporativo -------------------------------- */

router.get('/pendientes', requiereRol('Corporativo'), async (req, res) => {
    const pool = await poolCorporativo(req, res); if (!pool) return;
    try {
        const r = await pool.request().execute('Seguridad.SP_Solicitudes_Pendientes');
        res.json({ pendientes: r.recordset[0]?.Pendientes ?? 0 });
    } catch (err) { responderError(res, err); }
});

router.get('/', requiereRol('Corporativo'), async (req, res) => {
    const pool = await poolCorporativo(req, res); if (!pool) return;
    const estado = ['Pendiente', 'Aprobada', 'Rechazada'].includes(req.query.estado) ? req.query.estado : null;
    try {
        const r = await pool.request()
            .input('Estado', sql.NVarChar(20), estado)
            .execute('Seguridad.SP_Solicitudes_Listar');
        res.json(r.recordset);
    } catch (err) { responderError(res, err); }
});

router.post('/:id/responder', requiereRol('Corporativo'), async (req, res) => {
    const pool = await poolCorporativo(req, res); if (!pool) return;
    try {
        const r = await pool.request()
            .input('IdSolicitud', sql.Int, Number(req.params.id))
            .input('Aprobar', sql.Bit, Boolean(req.body.aprobar))
            .input('RespondidoPor', sql.Int, req.usuario.iduser)
            .input('Horas', sql.Int, Number(req.body.horas) || 8)
            .execute('Seguridad.SP_Solicitud_Responder');
        res.json(r.recordset);
    } catch (err) { responderError(res, err); }
});

module.exports = router;
