/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de proveedores
*
* DESCRIPCION:
* Define las rutas de la API utilizadas para consultar, crear, actualizar y eliminar
* proveedores. También permite obtener las opciones necesarias para los formularios.
*
* ENTRADA:
* Solicitudes HTTP, parámetros de URL, filtros de búsqueda y datos de proveedores
* enviados desde el frontend.
*
* SALIDA:
* Respuestas JSON con información de proveedores, opciones de formularios o mensajes
* de error.
*
* RESTRICCIONES:
* Requiere una conexión activa con SQL Server y los procedimientos almacenados
* correspondientes en la base de datos WideWorldImporters.
*
* OBJETIVO:
* Permitir que el frontend gestione la información de proveedores mediante la API.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');

const router = express.Router();

const { sql, poolPromise } = require('../db');


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: agregarParametros
*
* DESCRIPCION:
* Agrega al objeto request todos los parámetros necesarios para ejecutar los
* procedimientos almacenados de proveedores.
*
* ENTRADA:
* request: solicitud de SQL Server a la que se agregan los parámetros.
* body: objeto con los datos del proveedor enviados desde el frontend.
*
* SALIDA:
* No retorna un valor. Modifica el objeto request agregando los parámetros.
*
* RESTRICCIONES:
* Los nombres y tipos de los parámetros deben coincidir con los esperados por
* los procedimientos almacenados.
*
* OBJETIVO:
* Evitar repetir la definición de los parámetros en las operaciones de insertar
* y actualizar proveedores.
*
*-----------------------------------------------------------------------------------------*/

function agregarParametros(request, body) {

    request.input('Nombre', sql.NVarChar(100), body.Nombre);

    request.input('CategoriaID', sql.Int, body.CategoriaID);

    request.input('ContactoPrimarioID', sql.Int, body.ContactoPrimarioID);

    request.input(
        'ContactoAlternativoID',
        sql.Int,
        body.ContactoAlternativoID ?? null
    );

    request.input('MetodoEntregaID', sql.Int, body.MetodoEntregaID);

    request.input('CiudadEntregaID', sql.Int, body.CiudadEntregaID);

    request.input('CiudadPostalID', sql.Int, body.CiudadPostalID);

    request.input(
        'ReferenciaProveedor',
        sql.NVarChar(20),
        body.ReferenciaProveedor ?? null
    );

    request.input(
        'NombreCuentaBancaria',
        sql.NVarChar(50),
        body.NombreCuentaBancaria ?? null
    );

    request.input(
        'SucursalBancaria',
        sql.NVarChar(50),
        body.SucursalBancaria ?? null
    );

    request.input(
        'CodigoBanco',
        sql.NVarChar(20),
        body.CodigoBanco ?? null
    );

    request.input(
        'NumeroCuentaBancaria',
        sql.NVarChar(50),
        body.NumeroCuentaBancaria ?? null
    );

    request.input(
        'CodigoInternacionalBanco',
        sql.NVarChar(20),
        body.CodigoInternacionalBanco ?? null
    );

    request.input(
        'DiasPago',
        sql.Int,
        body.DiasPago ?? 7
    );

    request.input(
        'ComentariosInternos',
        sql.NVarChar(sql.MAX),
        body.ComentariosInternos ?? null
    );

    request.input(
        'Telefono',
        sql.NVarChar(20),
        body.Telefono
    );

    request.input(
        'Fax',
        sql.NVarChar(20),
        body.Fax ?? ''
    );

    request.input(
        'SitioWeb',
        sql.NVarChar(256),
        body.SitioWeb ?? ''
    );

    request.input(
        'DireccionEntrega1',
        sql.NVarChar(60),
        body.DireccionEntrega1
    );

    request.input(
        'DireccionEntrega2',
        sql.NVarChar(60),
        body.DireccionEntrega2 ?? null
    );

    request.input(
        'CodigoPostalEntrega',
        sql.NVarChar(10),
        body.CodigoPostalEntrega
    );

    request.input(
        'DireccionPostal1',
        sql.NVarChar(60),
        body.DireccionPostal1
    );

    request.input(
        'DireccionPostal2',
        sql.NVarChar(60),
        body.DireccionPostal2 ?? null
    );

    request.input(
        'CodigoPostalPostal',
        sql.NVarChar(10),
        body.CodigoPostalPostal
    );

    request.input(
        'UsuarioID',
        sql.Int,
        body.UsuarioID ?? 1
    );
}


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: responderError
*
* DESCRIPCION:
* Determina el código HTTP que debe devolver la API según el estado del error
* generado por los procedimientos almacenados.
*
* ENTRADA:
* res: objeto de respuesta de Express.
* err: error generado durante la operación.
*
* SALIDA:
* Respuesta JSON con el mensaje de error y el código HTTP correspondiente.
*
* RESTRICCIONES:
* Los estados utilizados deben coincidir con los códigos definidos en los
* procedimientos almacenados.
*
* OBJETIVO:
* Centralizar el manejo de errores de las operaciones de proveedores.
*
*-----------------------------------------------------------------------------------------*/

function responderError(res, err) {

    console.error(err);

    const estados = {
        1: 400,
        2: 400,
        3: 400,
        4: 409,
        5: 404,
        6: 409
    };

    const status = estados[err.state] ?? 500;

    res.status(status).json({
        error: err.message
    });
}


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Obtener opciones de proveedores
*
* DESCRIPCION:
* Obtiene las categorías, contactos, métodos de entrega y ciudades disponibles
* para utilizar en los formularios de proveedores.
*
* ENTRADA:
* Solicitud GET realizada a la ruta /opciones.
*
* SALIDA:
* Objeto JSON con las opciones disponibles para los formularios.
*
* RESTRICCIONES:
* Requiere que exista el procedimiento almacenado SP_Proveedores_Opciones.
*
* OBJETIVO:
* Proporcionar al frontend los datos necesarios para llenar los campos de selección.
*
*-----------------------------------------------------------------------------------------*/

router.get('/opciones', async (req, res) => {

    try {

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Ejecuta el procedimiento almacenado de opciones. */
        const result = await pool.request().execute(
            'SP_Proveedores_Opciones'
        );

        /* Devuelve las diferentes opciones organizadas por tipo. */
        res.json({
            categorias: result.recordsets[0],
            contactos: result.recordsets[1],
            metodosEntrega: result.recordsets[2],
            ciudades: result.recordsets[3]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al obtener las opciones del formulario'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Listar proveedores
*
* DESCRIPCION:
* Obtiene una lista de proveedores aplicando filtros opcionales por nombre,
* categoría y método de entrega.
*
* ENTRADA:
* Parámetros de consulta nombre, categoria y metodoEntrega.
*
* SALIDA:
* Lista de proveedores en formato JSON.
*
* RESTRICCIONES:
* Los filtros son opcionales y son enviados al procedimiento almacenado.
*
* OBJETIVO:
* Permitir consultar y filtrar los proveedores registrados.
*
*-----------------------------------------------------------------------------------------*/

router.get('/', async (req, res) => {

    try {

        /* Obtiene los filtros enviados desde el frontend. */
        const {
            nombre,
            categoria,
            metodoEntrega
        } = req.query;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        request.input(
            'Nombre',
            sql.NVarChar(100),
            nombre || null
        );

        request.input(
            'Categoria',
            sql.NVarChar(100),
            categoria || null
        );

        request.input(
            'MetodoEntrega',
            sql.NVarChar(100),
            metodoEntrega || null
        );

        /* Ejecuta el procedimiento almacenado para listar proveedores. */
        const result = await request.execute(
            'SP_Proveedores_Listar'
        );

        res.json(result.recordset);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al listar proveedores'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Obtener detalle de proveedor
*
* DESCRIPCION:
* Obtiene la información detallada de un proveedor utilizando su identificador.
*
* ENTRADA:
* id: identificador del proveedor recibido como parámetro de la URL.
*
* SALIDA:
* Información detallada del proveedor en formato JSON.
*
* RESTRICCIONES:
* Si el proveedor no existe, se devuelve el código HTTP 404.
*
* OBJETIVO:
* Consultar toda la información asociada a un proveedor específico.
*
*-----------------------------------------------------------------------------------------*/

router.get('/:id', async (req, res) => {

    try {

        const pool = await poolPromise;

        const request = pool.request();

        request.input(
            'SupplierID',
            sql.NVarChar(sql.MAX),
            req.params.id
        );

        const result = await request.execute(
            'SP_Proveedores_Detalle'
        );

        /* Verifica si el proveedor existe. */
        if (result.recordset.length === 0) {

            return res.status(404).json({
                error: 'Proveedor no encontrado'
            });
        }

        res.json(result.recordset);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al obtener el detalle del proveedor'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Crear proveedor
*
* DESCRIPCION:
* Registra un nuevo proveedor utilizando los datos enviados desde el frontend.
*
* ENTRADA:
* Datos del proveedor enviados mediante req.body.
*
* SALIDA:
* Respuesta JSON con el proveedor creado.
*
* RESTRICCIONES:
* Los datos deben cumplir las validaciones establecidas en el procedimiento
* almacenado SP_Proveedores_Insertar.
*
* OBJETIVO:
* Permitir registrar nuevos proveedores en la base de datos.
*
*-----------------------------------------------------------------------------------------*/

router.post('/', async (req, res) => {

    try {

        const pool = await poolPromise;

        const request = pool.request();

        /* Agrega los parámetros del proveedor a la solicitud. */
        agregarParametros(request, req.body);

        /* Ejecuta el procedimiento almacenado para insertar. */
        const result = await request.execute(
            'SP_Proveedores_Insertar'
        );

        res.status(201).json({
            mensaje: 'Proveedor creado correctamente',
            proveedor: result.recordset[0]
        });

    } catch (err) {

        /* Envía el error con el código HTTP correspondiente. */
        responderError(res, err);
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Actualizar proveedor
*
* DESCRIPCION:
* Actualiza la información de un proveedor existente utilizando su identificador
* y los nuevos datos enviados desde el frontend.
*
* ENTRADA:
* id: identificador del proveedor recibido en la URL.
* Datos actualizados del proveedor enviados mediante req.body.
*
* SALIDA:
* Respuesta JSON con el proveedor actualizado.
*
* RESTRICCIONES:
* El proveedor debe existir y los datos deben cumplir las validaciones del
* procedimiento almacenado SP_Proveedores_Actualizar.
*
* OBJETIVO:
* Permitir modificar la información de proveedores existentes.
*
*-----------------------------------------------------------------------------------------*/

router.put('/:id', async (req, res) => {

    try {

        const pool = await poolPromise;

        const request = pool.request();

        /* Agrega el identificador del proveedor. */
        request.input(
            'SupplierID',
            sql.Int,
            req.params.id
        );

        /* Agrega los demás datos del proveedor. */
        agregarParametros(request, req.body);

        /* Ejecuta el procedimiento almacenado para actualizar. */
        const result = await request.execute(
            'SP_Proveedores_Actualizar'
        );

        res.json({
            mensaje: 'Proveedor actualizado correctamente',
            proveedor: result.recordset[0]
        });

    } catch (err) {

        /* Envía el error con el código HTTP correspondiente. */
        responderError(res, err);
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Eliminar proveedor
*
* DESCRIPCION:
* Elimina un proveedor existente utilizando su identificador.
*
* ENTRADA:
* id: identificador del proveedor recibido en la URL.
*
* SALIDA:
* Respuesta JSON con un mensaje de confirmación y el proveedor eliminado.
*
* RESTRICCIONES:
* El proveedor debe existir y no debe tener registros relacionados que impidan
* su eliminación.
*
* OBJETIVO:
* Permitir eliminar proveedores de la base de datos.
*
*-----------------------------------------------------------------------------------------*/

router.delete('/:id', async (req, res) => {

    try {

        const pool = await poolPromise;

        const request = pool.request();

        /* Agrega el identificador del proveedor. */
        request.input(
            'SupplierID',
            sql.Int,
            req.params.id
        );

        /* Ejecuta el procedimiento almacenado para eliminar. */
        const result = await request.execute(
            'SP_Proveedores_Eliminar'
        );

        res.json({
            mensaje: 'Proveedor eliminado correctamente',
            proveedor: result.recordset[0]
        });

    } catch (err) {

        /* Envía el error con el código HTTP correspondiente. */
        responderError(res, err);
    }
});


/* Exporta las rutas del módulo de proveedores. */
module.exports = router;