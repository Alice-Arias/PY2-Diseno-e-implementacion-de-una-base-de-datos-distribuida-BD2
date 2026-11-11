/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas de ciudades (NUEVO PY2)
*
* GET /api/ciudades?buscar=san  -> hasta 20 ciudades que contienen "san".
* GET /api/ciudades/242         -> la ciudad 242 (para mostrar su nombre en Modificar).
*
* Ambas usan SP_Ciudades_Buscar. Reemplaza el envío de ~38 000 ciudades a cada
* formulario de Clientes y Proveedores.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const router = express.Router();
const { sql } = require('../db');

router.get('/', async (req, res) => {
    try {
        const texto = String(req.query.buscar || '').trim().slice(0, 50);
        const pool = req.pool;   // PY2: pool del nodo del usuario (auth.js)
        const result = await pool.request()
            .input('Texto', sql.NVarChar(50), texto || null)
            .input('CityID', sql.Int, null)
            .execute('SP_Ciudades_Buscar');
        res.json(result.recordset || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al buscar ciudades' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'ID de ciudad inválido' });
        }
        const pool = req.pool;   // PY2: pool del nodo del usuario (auth.js)
        const result = await pool.request()
            .input('Texto', sql.NVarChar(50), null)
            .input('CityID', sql.Int, id)
            .execute('SP_Ciudades_Buscar');
        res.json(result.recordset[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener la ciudad' });
    }
});

module.exports = router;
