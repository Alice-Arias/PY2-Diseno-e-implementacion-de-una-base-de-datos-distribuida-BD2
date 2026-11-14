/*---------------------------------------------------------------------------------------*
* NOMBRE: consultaCatalogo.js
* ENTRADA: { modulo, claveDetalle, mensajes }  ej. 'Clientes', 'CustomerID'.
* DESCRIPCION: Rutas de consulta que comparten Clientes y Proveedores:
*   GET /resumen  totales      GET /  lista paginada      GET /:id  detalle
* SALIDA: Un router de Express con las tres rutas.
* OBJETIVO: Escribir una sola vez las rutas de los dos módulos.
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const { sql } = require('../config/baseDatos');
const { numero, texto, agregarParametros } = require('../utils/parametros');
const { conManejoDeErrores, responderPaginado, responderDetalle } = require('../utils/respuestas');

function crearRutasDeConsulta({ modulo, claveDetalle, mensajes }) {
    const router = express.Router();

    /* Tarjetas de totales (SP_<Modulo>_Resumen). */
    router.get('/resumen', conManejoDeErrores(async (req, res) => {
        const resultado = await req.pool.request().execute(`SP_${modulo}_Resumen`);
        res.json({
            totales: resultado.recordsets[0][0],
            categorias: resultado.recordsets[1],
            metodos: resultado.recordsets[2]
        });
    }, { mensaje: mensajes.resumen }));

    /* Lista filtrada y paginada (SP_<Modulo>_Listar). */
    router.get('/', conManejoDeErrores(async (req, res) => {
        const filtros = req.query;
        const resultado = await agregarParametros(req.pool.request(), [
            ['Nombre', sql.NVarChar(100), texto(filtros.nombre)],
            ['Categoria', sql.NVarChar(100), texto(filtros.categoria)],
            ['MetodoEntrega', sql.NVarChar(100), texto(filtros.metodoEntrega)],
            ['Pagina', sql.Int, numero(filtros.pagina) ?? 1],
            ['TamanoPagina', sql.Int, numero(filtros.tamano) ?? 10]
        ]).execute(`SP_${modulo}_Listar`);
        responderPaginado(res, resultado);
    }, { mensaje: mensajes.listar }));

    /* Detalle de un ID o de varios separados por coma (SP_<Modulo>_Detalle). */
    router.get('/:id', conManejoDeErrores(async (req, res) => {
        const resultado = await req.pool.request()
            .input(claveDetalle, sql.NVarChar(sql.MAX), req.params.id)
            .execute(`SP_${modulo}_Detalle`);
        responderDetalle(res, resultado, mensajes.noEncontrado);
    }, { mensaje: mensajes.detalle }));

    return router;
}

module.exports = crearRutasDeConsulta;