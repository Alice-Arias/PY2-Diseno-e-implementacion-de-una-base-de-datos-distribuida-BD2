/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de clientes
*
* DESCRIPCION: Define las rutas de la API relacionadas con la gestión de clientes.
* Permite consultar opciones para formularios, listar clientes, consultar detalles,
* crear, actualizar y eliminar clientes mediante procedimientos almacenados de SQL Server.
*
* ENTRADA: Solicitudes HTTP realizadas a las rutas /api/clientes.
*
* SALIDA: Respuestas JSON con información de clientes, opciones de formularios
* o mensajes de confirmación y error.
*
* RESTRICCIONES: Requiere conexión con SQL Server y que los procedimientos almacenados
* utilizados se encuentren disponibles en la base de datos.
*
* OBJETIVO: Proporcionar los endpoints necesarios para realizar las operaciones
* CRUD y consultas del módulo de clientes.
*
*-----------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Importación de Express
*
* DESCRIPCION: Importa Express para crear y administrar las rutas de la API.
*
* ENTRADA: Dependencia express.
*
* SALIDA: Objeto express disponible para crear el router.
*
* RESTRICCIONES: Express debe estar instalado correctamente.
*
* OBJETIVO: Permitir la definición de las rutas HTTP del módulo.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Creación del router
*
* DESCRIPCION: Crea un objeto Router de Express que permite definir y organizar
* las diferentes rutas correspondientes al módulo de clientes.
*
* ENTRADA: Librería Express.
*
* SALIDA: Objeto router.
*
* RESTRICCIONES: Requiere Express correctamente configurado.
*
* OBJETIVO: Mantener las rutas de clientes separadas y organizadas.
*
*-----------------------------------------------------------------------------------------*/

const router = express.Router();


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Importación de conexión con SQL Server
*
* DESCRIPCION: Importa el objeto sql para definir los tipos de datos de los parámetros
* y poolPromise para utilizar la conexión con la base de datos.
*
* ENTRADA: Módulo de conexión ubicado en ../db.
*
* SALIDA: Objetos sql y poolPromise disponibles para las consultas.
*
* RESTRICCIONES: Requiere que el módulo de conexión esté configurado correctamente.
*
* OBJETIVO: Permitir que las rutas ejecuten procedimientos almacenados en SQL Server.
*
*-----------------------------------------------------------------------------------------*/

const { sql, poolPromise } = require('../db');


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Obtener opciones para formularios
*
* DESCRIPCION: Consulta las listas desplegables necesarias para agregar o modificar
* clientes. Ejecuta el procedimiento almacenado SP_Clientes_Opciones.
*
* ENTRADA: Ninguna.
*
* SALIDA: Objeto con categorías, grupos de compra, contactos, clientes,
* métodos de entrega y ciudades.
*
* RESTRICCIONES: Requiere conexión con la API y la base de datos.
*
* OBJETIVO: Llenar los campos de selección utilizados en los formularios de clientes.
*
*-----------------------------------------------------------------------------------------*/

router.get('/opciones', async (req, res) => {

    try {

        /* Obtiene el pool de conexión con SQL Server. */
        const pool = await poolPromise;

        /* Ejecuta el procedimiento almacenado que obtiene las opciones. */
        const result = await pool.request().execute(
            'SP_Clientes_Opciones'
        );

        /* Devuelve cada resultado en una propiedad diferente. */
        res.json({
            categorias: result.recordsets[0],
            gruposCompra: result.recordsets[1],
            contactos: result.recordsets[2],
            clientes: result.recordsets[3],
            metodosEntrega: result.recordsets[4],
            ciudades: result.recordsets[5]
        });

    } catch (err) {

        /* Registra el error ocurrido durante la consulta. */
        console.error(err);

        /* Devuelve un error interno al cliente. */
        res.status(500).json({
            error: 'Error al obtener las opciones del formulario'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Listar clientes
*
* DESCRIPCION: Obtiene los clientes registrados aplicando filtros opcionales
* por nombre, categoría y método de entrega. Ejecuta SP_Clientes_Listar.
*
* ENTRADA: Parámetros opcionales nombre, categoria y metodoEntrega mediante
* la cadena de consulta de la solicitud HTTP.
*
* SALIDA: Lista de clientes que cumplen con los filtros indicados.
*
* RESTRICCIONES: Los filtros son opcionales. Si no se proporcionan, se utiliza NULL.
*
* OBJETIVO: Permitir consultar y filtrar los clientes registrados.
*
*-----------------------------------------------------------------------------------------*/

router.get('/', async (req, res) => {

    try {

        /* Obtiene los filtros enviados mediante la URL. */
        const {
            nombre,
            categoria,
            metodoEntrega
        } = req.query;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea una solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Envía el filtro por nombre. */
        request.input(
            'Nombre',
            sql.NVarChar(100),
            nombre || null
        );

        /* Envía el filtro por categoría. */
        request.input(
            'Categoria',
            sql.NVarChar(100),
            categoria || null
        );

        /* Envía el filtro por método de entrega. */
        request.input(
            'MetodoEntrega',
            sql.NVarChar(100),
            metodoEntrega || null
        );

        /* Ejecuta el procedimiento almacenado de listado. */
        const result = await request.execute(
            'SP_Clientes_Listar'
        );

        /* Devuelve los clientes obtenidos. */
        res.json(result.recordset);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al listar clientes'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Obtener detalle de clientes
*
* DESCRIPCION: Obtiene la información detallada de uno o varios clientes utilizando
* el identificador recibido en la URL. Ejecuta SP_Clientes_Detalle.
*
* ENTRADA: Identificador o identificadores de cliente mediante req.params.id.
*
* SALIDA: Información detallada de los clientes solicitados.
*
* RESTRICCIONES: Si no existe ningún cliente con el identificador indicado,
* devuelve el código HTTP 404.
*
* OBJETIVO: Permitir consultar la información completa de un cliente.
*
*-----------------------------------------------------------------------------------------*/

router.get('/:id', async (req, res) => {

    try {

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Envía el identificador del cliente. */
        request.input(
            'CustomerID',
            sql.NVarChar(sql.MAX),
            req.params.id
        );

        /* Ejecuta el procedimiento almacenado de detalle. */
        const result = await request.execute(
            'SP_Clientes_Detalle'
        );

        /* Verifica si se encontró algún cliente. */
        if (result.recordset.length === 0) {

            return res.status(404).json({
                error: 'Cliente no encontrado'
            });
        }

        /* Devuelve la información encontrada. */
        res.json(result.recordset);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al obtener el detalle del cliente'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Crear cliente
*
* DESCRIPCION: Recibe la información de un nuevo cliente y ejecuta el procedimiento
* almacenado SP_Clientes_Insertar para registrarlo en la base de datos.
*
* ENTRADA: Datos del cliente enviados mediante req.body.
*
* SALIDA: Mensaje de confirmación y datos del cliente creado.
*
* RESTRICCIONES: Los campos obligatorios deben ser enviados correctamente.
* Los campos opcionales utilizan valores predeterminados cuando no se proporcionan.
*
* OBJETIVO: Registrar nuevos clientes en la base de datos.
*
*-----------------------------------------------------------------------------------------*/

router.post('/', async (req, res) => {

    try {

        /* Obtiene los datos enviados por el formulario. */
        const {
            Nombre,
            CategoriaID,
            GrupoCompraID,
            ContactoPrimarioID,
            ContactoAlternativoID,
            ClienteFacturarID,
            MetodoEntregaID,
            CiudadEntregaID,
            LimiteCredito,
            Descuento,
            DiasGracia,
            Telefono,
            Fax,
            SitioWeb,
            DireccionEntrega1,
            DireccionEntrega2,
            CodigoPostal,
            DireccionPostal1,
            DireccionPostal2,
            UsuarioID
        } = req.body;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Agrega los parámetros del nuevo cliente. */
        request.input('Nombre', sql.NVarChar(100), Nombre);
        request.input('CategoriaID', sql.Int, CategoriaID);
        request.input('GrupoCompraID', sql.Int, GrupoCompraID ?? null);
        request.input('ContactoPrimarioID', sql.Int, ContactoPrimarioID);
        request.input('ContactoAlternativoID', sql.Int, ContactoAlternativoID ?? null);
        request.input('ClienteFacturarID', sql.Int, ClienteFacturarID ?? null);
        request.input('MetodoEntregaID', sql.Int, MetodoEntregaID);
        request.input('CiudadEntregaID', sql.Int, CiudadEntregaID);
        request.input('LimiteCredito', sql.Decimal(18, 2), LimiteCredito ?? null);
        request.input('Descuento', sql.Decimal(18, 3), Descuento ?? 0);
        request.input('DiasGracia', sql.Int, DiasGracia ?? 7);
        request.input('Telefono', sql.NVarChar(20), Telefono);
        request.input('Fax', sql.NVarChar(20), Fax ?? '');
        request.input('SitioWeb', sql.NVarChar(256), SitioWeb ?? '');
        request.input('DireccionEntrega1', sql.NVarChar(60), DireccionEntrega1);
        request.input('DireccionEntrega2', sql.NVarChar(60), DireccionEntrega2 ?? null);
        request.input('CodigoPostal', sql.NVarChar(10), CodigoPostal);
        request.input('DireccionPostal1', sql.NVarChar(60), DireccionPostal1);
        request.input('DireccionPostal2', sql.NVarChar(60), DireccionPostal2 ?? null);
        request.input('UsuarioID', sql.Int, UsuarioID ?? 1);

        /* Ejecuta el procedimiento almacenado para insertar el cliente. */
        const result = await request.execute(
            'SP_Clientes_Insertar'
        );

        /* Devuelve el cliente creado con código HTTP 201. */
        res.status(201).json({
            mensaje: 'Cliente creado correctamente',
            cliente: result.recordset[0]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Actualizar cliente
*
* DESCRIPCION: Recibe el identificador del cliente y sus nuevos datos para actualizar
* la información existente mediante SP_Clientes_Actualizar.
*
* ENTRADA: Identificador del cliente mediante req.params.id y nuevos datos
* mediante req.body.
*
* SALIDA: Mensaje de confirmación y datos actualizados del cliente.
*
* RESTRICCIONES: El cliente debe existir y los datos enviados deben cumplir
* las reglas establecidas en la base de datos.
*
* OBJETIVO: Modificar la información de un cliente existente.
*
*-----------------------------------------------------------------------------------------*/

router.put('/:id', async (req, res) => {

    try {

        /* Obtiene los datos enviados para actualizar el cliente. */
        const {
            Nombre,
            CategoriaID,
            GrupoCompraID,
            ContactoPrimarioID,
            ContactoAlternativoID,
            ClienteFacturarID,
            MetodoEntregaID,
            CiudadEntregaID,
            LimiteCredito,
            Descuento,
            DiasGracia,
            Telefono,
            Fax,
            SitioWeb,
            DireccionEntrega1,
            DireccionEntrega2,
            CodigoPostal,
            DireccionPostal1,
            DireccionPostal2,
            UsuarioID
        } = req.body;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Envía el identificador del cliente que será actualizado. */
        request.input(
            'CustomerID',
            sql.Int,
            req.params.id
        );

        /* Agrega los datos actualizados del cliente. */
        request.input('Nombre', sql.NVarChar(100), Nombre);
        request.input('CategoriaID', sql.Int, CategoriaID);
        request.input('GrupoCompraID', sql.Int, GrupoCompraID ?? null);
        request.input('ContactoPrimarioID', sql.Int, ContactoPrimarioID);
        request.input('ContactoAlternativoID', sql.Int, ContactoAlternativoID ?? null);
        request.input('ClienteFacturarID', sql.Int, ClienteFacturarID ?? null);
        request.input('MetodoEntregaID', sql.Int, MetodoEntregaID);
        request.input('CiudadEntregaID', sql.Int, CiudadEntregaID);
        request.input('LimiteCredito', sql.Decimal(18, 2), LimiteCredito ?? null);
        request.input('Descuento', sql.Decimal(18, 3), Descuento ?? 0);
        request.input('DiasGracia', sql.Int, DiasGracia ?? 7);
        request.input('Telefono', sql.NVarChar(20), Telefono);
        request.input('Fax', sql.NVarChar(20), Fax ?? '');
        request.input('SitioWeb', sql.NVarChar(256), SitioWeb ?? '');
        request.input('DireccionEntrega1', sql.NVarChar(60), DireccionEntrega1);
        request.input('DireccionEntrega2', sql.NVarChar(60), DireccionEntrega2 ?? null);
        request.input('CodigoPostal', sql.NVarChar(10), CodigoPostal);
        request.input('DireccionPostal1', sql.NVarChar(60), DireccionPostal1);
        request.input('DireccionPostal2', sql.NVarChar(60), DireccionPostal2 ?? null);
        request.input('UsuarioID', sql.Int, UsuarioID ?? 1);

        /* Ejecuta el procedimiento almacenado de actualización. */
        const result = await request.execute(
            'SP_Clientes_Actualizar'
        );

        /* Devuelve los datos actualizados. */
        res.json({
            mensaje: 'Cliente actualizado correctamente',
            cliente: result.recordset[0]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Eliminar cliente
*
* DESCRIPCION: Recibe el identificador de un cliente y ejecuta el procedimiento
* almacenado SP_Clientes_Eliminar para eliminarlo de la base de datos.
*
* ENTRADA: Identificador del cliente mediante req.params.id.
*
* SALIDA: Mensaje de confirmación y datos del cliente eliminado.
*
* RESTRICCIONES: El cliente debe existir y no debe tener registros relacionados
* que impidan su eliminación.
*
* OBJETIVO: Eliminar un cliente registrado en la base de datos.
*
*-----------------------------------------------------------------------------------------*/

router.delete('/:id', async (req, res) => {

    try {

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Envía el identificador del cliente que será eliminado. */
        request.input(
            'CustomerID',
            sql.Int,
            req.params.id
        );

        /* Ejecuta el procedimiento almacenado de eliminación. */
        const result = await request.execute(
            'SP_Clientes_Eliminar'
        );

        /* Devuelve el mensaje de confirmación. */
        res.json({
            mensaje: 'Cliente eliminado correctamente',
            cliente: result.recordset[0]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Exportación de rutas
*
* DESCRIPCION: Exporta el router del módulo de clientes para que pueda ser utilizado
* por el archivo principal de la API.
*
* ENTRADA: Objeto router.
*
* SALIDA: Rutas disponibles para ser registradas en la aplicación Express.
*
* RESTRICCIONES: El archivo principal debe importar correctamente este módulo.
*
* OBJETIVO: Habilitar las rutas del módulo mediante el prefijo /api/clientes.
*
*-----------------------------------------------------------------------------------------*/

module.exports = router;