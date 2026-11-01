/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de inventario (CORREGIDO)
*
* CAMBIOS:
*   - GET /            -> recibe pagina y tamano, devuelve { datos, paginacion }.
*                         La paginación la hace SQL Server (SP_Inventarios_Listar).
*   - GET /resumen     -> estadísticas calculadas en SQL (SP_Inventarios_Resumen).
*   - GET /opciones    -> ahora incluye la lista de grupos.
*   - POST / y PUT /:id -> envían grupos e inventario (holdings) al SP.
*
* IMPORTANTE: las rutas fijas (/opciones, /resumen) van ANTES de /:id.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

/* Convierte '' / undefined en null; si trae valor lo convierte a número. */
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
const txt = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

/*---------------------------------------------------------------------------------------*
* GET /api/inventarios/opciones
*-----------------------------------------------------------------------------------------*/
router.get('/opciones', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('SP_Inventario_Opciones');

        res.json({
            proveedores: result.recordsets[0],
            colores: result.recordsets[1],
            tiposPaquete: result.recordsets[2],
            grupos: result.recordsets[3]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener las opciones del formulario' });
    }
});

/*---------------------------------------------------------------------------------------*
* GET /api/inventarios/resumen
*-----------------------------------------------------------------------------------------*/
router.get('/resumen', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('SP_Inventarios_Resumen');

        res.json({
            totales: result.recordsets[0][0],
            grupos: result.recordsets[1]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el resumen de inventario' });
    }
});

/*---------------------------------------------------------------------------------------*
* GET /api/inventarios?nombre=&grupo=&cantidad=&pagina=1&tamano=10
*-----------------------------------------------------------------------------------------*/
router.get('/', async (req, res) => {
    try {
        const { nombre, grupo, cantidad, pagina, tamano } = req.query;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('Nombre', sql.NVarChar(100), txt(nombre))
            .input('Grupo', sql.NVarChar(100), txt(grupo))
            .input('Cantidad', sql.Int, num(cantidad))
            .input('Pagina', sql.Int, num(pagina) ?? 1)
            .input('TamanoPagina', sql.Int, num(tamano) ?? 10)
            .execute('SP_Inventarios_Listar');

        res.json({
            datos: result.recordsets[0],
            paginacion: result.recordsets[1][0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al listar inventarios' });
    }
});

/*---------------------------------------------------------------------------------------*
* GET /api/inventarios/:id   (uno o varios IDs separados por coma)
*-----------------------------------------------------------------------------------------*/
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('StockItemID', sql.NVarChar(sql.MAX), req.params.id)
            .execute('SP_Inventarios_Detalle');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el detalle del producto' });
    }
});

/*---------------------------------------------------------------------------------------*
* Agrega al request los parámetros comunes de insertar y actualizar.
*-----------------------------------------------------------------------------------------*/
function parametrosProducto(request, b) {
    const grupos = Array.isArray(b.StockGroupIDs)
        ? b.StockGroupIDs.join(',')
        : txt(b.StockGroupIDs);

    return request
        .input('StockItemName', sql.NVarChar(100), txt(b.StockItemName))
        .input('SupplierID', sql.Int, num(b.SupplierID))
        .input('ColorID', sql.Int, num(b.ColorID))
        .input('UnitPackageID', sql.Int, num(b.UnitPackageID))
        .input('OuterPackageID', sql.Int, num(b.OuterPackageID))
        .input('Brand', sql.NVarChar(50), txt(b.Brand))
        .input('Size', sql.NVarChar(20), txt(b.Size))
        .input('LeadTimeDays', sql.Int, num(b.LeadTimeDays))
        .input('QuantityPerOuter', sql.Int, num(b.QuantityPerOuter))
        .input('IsChillerStock', sql.Bit, b.IsChillerStock == null ? null : Boolean(b.IsChillerStock))
        .input('Barcode', sql.NVarChar(50), txt(b.Barcode))
        .input('TaxRate', sql.Decimal(18, 3), num(b.TaxRate))
        .input('UnitPrice', sql.Decimal(18, 2), num(b.UnitPrice))
        .input('RecommendedRetailPrice', sql.Decimal(18, 2), num(b.RecommendedRetailPrice))
        .input('Weight', sql.Decimal(18, 3), num(b.Weight))
        .input('MarketingComments', sql.NVarChar(sql.MAX), txt(b.MarketingComments))
        .input('InternalComments', sql.NVarChar(sql.MAX), txt(b.InternalComments))
        .input('CustomFields', sql.NVarChar(sql.MAX), txt(b.CustomFields))
        .input('StockGroupIDs', sql.NVarChar(sql.MAX), grupos || null)
        .input('QuantityOnHand', sql.Int, num(b.QuantityOnHand))
        .input('BinLocation', sql.NVarChar(20), txt(b.BinLocation))
        .input('LastCostPrice', sql.Decimal(18, 2), num(b.LastCostPrice))
        .input('ReorderLevel', sql.Int, num(b.ReorderLevel))
        .input('TargetStockLevel', sql.Int, num(b.TargetStockLevel))
        .input('LastEditedBy', sql.Int, num(b.LastEditedBy) ?? 1);
}

/*---------------------------------------------------------------------------------------*
* POST /api/inventarios
*-----------------------------------------------------------------------------------------*/
router.post('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await parametrosProducto(pool.request(), req.body)
            .execute('SP_Inventario_Insertar');

        res.status(201).json({
            mensaje: 'Producto creado correctamente',
            inventario: result.recordset[0]
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

/*---------------------------------------------------------------------------------------*
* PUT /api/inventarios/:id
*-----------------------------------------------------------------------------------------*/
router.put('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const request = pool.request().input('StockItemID', sql.Int, num(req.params.id));
        const result = await parametrosProducto(request, req.body)
            .execute('SP_Inventario_Actualizar');

        res.json({
            mensaje: 'Producto actualizado correctamente',
            inventario: result.recordset[0]
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

/*---------------------------------------------------------------------------------------*
* DELETE /api/inventarios/:id
*-----------------------------------------------------------------------------------------*/
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('StockItemID', sql.Int, num(req.params.id))
            .execute('SP_Inventario_Eliminar');

        res.json({
            mensaje: 'Producto eliminado correctamente',
            inventario: result.recordset[0]
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
