/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Rutas del módulo de inventario
*
* DESCRIPCION: Define las rutas de la API relacionadas con la gestión de productos
* del inventario. Permite consultar opciones para formularios, listar productos,
* consultar detalles, crear, actualizar y eliminar productos.
*
* ENTRADA: Solicitudes HTTP realizadas a las rutas /api/inventarios.
*
* SALIDA: Respuestas JSON con información de productos, opciones de formularios
* o mensajes de confirmación y error.
*
* RESTRICCIONES: Requiere conexión con SQL Server y que los procedimientos almacenados
* utilizados se encuentren disponibles en la base de datos.
*
* OBJETIVO: Proporcionar los endpoints necesarios para realizar las operaciones
* CRUD y consultas del módulo de inventario.
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
* OBJETIVO: Permitir la definición de las rutas HTTP del módulo de inventario.
*
*-----------------------------------------------------------------------------------------*/

const express = require('express');


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Creación del router
*
* DESCRIPCION: Crea un objeto Router de Express que permite definir y organizar
* las diferentes rutas correspondientes al módulo de inventario.
*
* ENTRADA: Librería Express.
*
* SALIDA: Objeto router.
*
* RESTRICCIONES: Requiere Express correctamente configurado.
*
* OBJETIVO: Mantener las rutas del inventario separadas y organizadas.
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
* productos del inventario. Ejecuta el procedimiento almacenado
* SP_Inventario_Opciones.
*
* ENTRADA: Ninguna.
*
* SALIDA: Objeto con proveedores, colores y tipos de paquete.
*
* RESTRICCIONES: Requiere conexión con la API y la base de datos.
*
* OBJETIVO: Llenar los campos de selección utilizados en los formularios
* del módulo de inventario.
*
*-----------------------------------------------------------------------------------------*/

router.get('/opciones', async (req, res) => {

    try {

        /* Obtiene el pool de conexión con SQL Server. */
        const pool = await poolPromise;

        /* Ejecuta el procedimiento almacenado que obtiene las opciones. */
        const result = await pool.request().execute(
            'SP_Inventario_Opciones'
        );

        /* Devuelve cada resultado en una propiedad diferente. */
        res.json({
            proveedores: result.recordsets[0],
            colores: result.recordsets[1],
            tiposPaquete: result.recordsets[2]
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
* NOMBRE: Listar inventarios
*
* DESCRIPCION: Obtiene los productos registrados en el inventario aplicando filtros
* opcionales por nombre, grupo y cantidad. Ejecuta SP_Inventarios_Listar.
*
* ENTRADA: Parámetros opcionales nombre, grupo y cantidad mediante la cadena
* de consulta de la solicitud HTTP.
*
* SALIDA: Lista de productos que cumplen con los filtros indicados.
*
* RESTRICCIONES: Los filtros son opcionales. Si no se proporcionan, se utiliza NULL.
*
* OBJETIVO: Permitir consultar y filtrar los productos registrados en el inventario.
*
*-----------------------------------------------------------------------------------------*/

router.get('/', async (req, res) => {

    try {

        /* Obtiene los filtros enviados mediante la URL. */
        const {
            nombre,
            grupo,
            cantidad
        } = req.query;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea una solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Envía el filtro por nombre del producto. */
        request.input(
            'Nombre',
            sql.NVarChar(100),
            nombre || null
        );

        /* Envía el filtro por grupo. */
        request.input(
            'Grupo',
            sql.NVarChar(100),
            grupo || null
        );

        /* Envía el filtro por cantidad cuando fue proporcionado. */
        request.input(
            'Cantidad',
            sql.Int,
            cantidad !== undefined && cantidad !== ''
                ? Number(cantidad)
                : null
        );

        /* Ejecuta el procedimiento almacenado de listado. */
        const result = await request.execute(
            'SP_Inventarios_Listar'
        );

        /* Devuelve los productos obtenidos. */
        res.json(result.recordset);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al listar inventarios'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Obtener detalle del producto
*
* DESCRIPCION: Obtiene la información detallada de uno o varios productos utilizando
* el identificador recibido en la URL. Ejecuta SP_Inventarios_Detalle.
*
* ENTRADA: Identificador o identificadores del producto mediante req.params.id.
*
* SALIDA: Información detallada de los productos solicitados.
*
* RESTRICCIONES: Si no existe ningún producto con el identificador indicado,
* devuelve el código HTTP 404.
*
* OBJETIVO: Permitir consultar la información completa de un producto.
*
*-----------------------------------------------------------------------------------------*/

router.get('/:id', async (req, res) => {

    try {

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Envía el identificador del producto. */
        request.input(
            'StockItemID',
            sql.NVarChar(sql.MAX),
            req.params.id
        );

        /* Ejecuta el procedimiento almacenado de detalle. */
        const result = await request.execute(
            'SP_Inventarios_Detalle'
        );

        /* Verifica si se encontró algún producto. */
        if (result.recordset.length === 0) {

            return res.status(404).json({
                error: 'Producto no encontrado'
            });
        }

        /* Devuelve la información encontrada. */
        res.json(result.recordset);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Error al obtener el detalle del producto'
        });
    }
});


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Crear producto
*
* DESCRIPCION: Recibe la información de un nuevo producto y ejecuta el procedimiento
* almacenado SP_Inventario_Insertar para registrarlo en la base de datos.
*
* ENTRADA: Datos del producto enviados mediante req.body.
*
* SALIDA: Mensaje de confirmación y datos del producto creado.
*
* RESTRICCIONES: Los campos obligatorios deben ser enviados correctamente.
* Los campos opcionales utilizan NULL o valores predeterminados cuando no se proporcionan.
*
* OBJETIVO: Registrar nuevos productos en el inventario.
*
*-----------------------------------------------------------------------------------------*/

router.post('/', async (req, res) => {

    try {

        /* Obtiene los datos enviados por el formulario. */
        const {
            StockItemName,
            SupplierID,
            ColorID,
            UnitPackageID,
            OuterPackageID,
            Brand,
            Size,
            LeadTimeDays,
            QuantityPerOuter,
            IsChillerStock,
            Barcode,
            TaxRate,
            UnitPrice,
            RecommendedRetailPrice,
            Weight,
            MarketingComments,
            InternalComments,
            Photo,
            CustomFields,
            LastEditedBy
        } = req.body;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Agrega los parámetros del nuevo producto. */
        request.input('StockItemName', sql.NVarChar(100), StockItemName);
        request.input('SupplierID', sql.Int, SupplierID);
        request.input('ColorID', sql.Int, ColorID ?? null);
        request.input('UnitPackageID', sql.Int, UnitPackageID);
        request.input('OuterPackageID', sql.Int, OuterPackageID);
        request.input('Brand', sql.NVarChar(50), Brand ?? null);
        request.input('Size', sql.NVarChar(20), Size ?? null);
        request.input('LeadTimeDays', sql.Int, LeadTimeDays);
        request.input('QuantityPerOuter', sql.Int, QuantityPerOuter);
        request.input('IsChillerStock', sql.Bit, IsChillerStock);
        request.input('Barcode', sql.NVarChar(50), Barcode ?? null);
        request.input('TaxRate', sql.Decimal(18, 3), TaxRate);
        request.input('UnitPrice', sql.Decimal(18, 2), UnitPrice);
        request.input(
            'RecommendedRetailPrice',
            sql.Decimal(18, 2),
            RecommendedRetailPrice ?? null
        );
        request.input('Weight', sql.Decimal(18, 3), Weight);
        request.input(
            'MarketingComments',
            sql.NVarChar(sql.MAX),
            MarketingComments ?? null
        );
        request.input(
            'InternalComments',
            sql.NVarChar(sql.MAX),
            InternalComments ?? null
        );
        request.input(
            'Photo',
            sql.VarBinary(sql.MAX),
            Photo ?? null
        );
        request.input(
            'CustomFields',
            sql.NVarChar(sql.MAX),
            CustomFields ?? null
        );
        request.input(
            'LastEditedBy',
            sql.Int,
            LastEditedBy ?? 1
        );

        /* Ejecuta el procedimiento almacenado para insertar el producto. */
        const result = await request.execute(
            'SP_Inventario_Insertar'
        );

        /* Devuelve el producto creado con código HTTP 201. */
        res.status(201).json({
            mensaje: 'Producto creado correctamente',
            inventario: result.recordset[0]
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
* NOMBRE: Actualizar producto
*
* DESCRIPCION: Recibe el identificador del producto y sus nuevos datos para actualizar
* la información existente mediante SP_Inventario_Actualizar.
*
* ENTRADA: Identificador del producto mediante req.params.id y nuevos datos
* mediante req.body.
*
* SALIDA: Mensaje de confirmación y datos actualizados del producto.
*
* RESTRICCIONES: El producto debe existir y los datos enviados deben cumplir
* las reglas establecidas en la base de datos.
*
* OBJETIVO: Modificar la información de un producto existente.
*
*-----------------------------------------------------------------------------------------*/

router.put('/:id', async (req, res) => {

    try {

        /* Obtiene los datos enviados para actualizar el producto. */
        const {
            StockItemName,
            SupplierID,
            ColorID,
            UnitPackageID,
            OuterPackageID,
            Brand,
            Size,
            LeadTimeDays,
            QuantityPerOuter,
            IsChillerStock,
            Barcode,
            TaxRate,
            UnitPrice,
            RecommendedRetailPrice,
            Weight,
            MarketingComments,
            InternalComments,
            Photo,
            CustomFields,
            LastEditedBy
        } = req.body;

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Envía el identificador del producto que será actualizado. */
        request.input(
            'StockItemID',
            sql.Int,
            req.params.id
        );

        /* Agrega los datos actualizados del producto. */
        request.input('StockItemName', sql.NVarChar(100), StockItemName);
        request.input('SupplierID', sql.Int, SupplierID);
        request.input('ColorID', sql.Int, ColorID ?? null);
        request.input('UnitPackageID', sql.Int, UnitPackageID);
        request.input('OuterPackageID', sql.Int, OuterPackageID);
        request.input('Brand', sql.NVarChar(50), Brand ?? null);
        request.input('Size', sql.NVarChar(20), Size ?? null);
        request.input('LeadTimeDays', sql.Int, LeadTimeDays);
        request.input('QuantityPerOuter', sql.Int, QuantityPerOuter);
        request.input('IsChillerStock', sql.Bit, IsChillerStock);
        request.input('Barcode', sql.NVarChar(50), Barcode ?? null);
        request.input('TaxRate', sql.Decimal(18, 3), TaxRate);
        request.input('UnitPrice', sql.Decimal(18, 2), UnitPrice);
        request.input(
            'RecommendedRetailPrice',
            sql.Decimal(18, 2),
            RecommendedRetailPrice ?? null
        );
        request.input('Weight', sql.Decimal(18, 3), Weight);
        request.input(
            'MarketingComments',
            sql.NVarChar(sql.MAX),
            MarketingComments ?? null
        );
        request.input(
            'InternalComments',
            sql.NVarChar(sql.MAX),
            InternalComments ?? null
        );
        request.input(
            'Photo',
            sql.VarBinary(sql.MAX),
            Photo ?? null
        );
        request.input(
            'CustomFields',
            sql.NVarChar(sql.MAX),
            CustomFields ?? null
        );
        request.input(
            'LastEditedBy',
            sql.Int,
            LastEditedBy ?? 1
        );

        /* Ejecuta el procedimiento almacenado de actualización. */
        const result = await request.execute(
            'SP_Inventario_Actualizar'
        );

        /* Devuelve los datos actualizados. */
        res.json({
            mensaje: 'Producto actualizado correctamente',
            inventario: result.recordset[0]
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
* NOMBRE: Eliminar producto
*
* DESCRIPCION: Recibe el identificador de un producto y ejecuta el procedimiento
* almacenado SP_Inventario_Eliminar para eliminarlo de la base de datos.
*
* ENTRADA: Identificador del producto mediante req.params.id.
*
* SALIDA: Mensaje de confirmación y datos del producto eliminado.
*
* RESTRICCIONES: El producto debe existir y no debe tener registros relacionados
* que impidan su eliminación.
*
* OBJETIVO: Eliminar un producto registrado en el inventario.
*
*-----------------------------------------------------------------------------------------*/

router.delete('/:id', async (req, res) => {

    try {

        /* Obtiene la conexión con SQL Server. */
        const pool = await poolPromise;

        /* Crea la solicitud para ejecutar el procedimiento almacenado. */
        const request = pool.request();

        /* Envía el identificador del producto que será eliminado. */
        request.input(
            'StockItemID',
            sql.Int,
            req.params.id
        );

        /* Ejecuta el procedimiento almacenado de eliminación. */
        const result = await request.execute(
            'SP_Inventario_Eliminar'
        );

        /* Devuelve el mensaje de confirmación. */
        res.json({
            mensaje: 'Producto eliminado correctamente',
            inventario: result.recordset[0]
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
* DESCRIPCION: Exporta el router del módulo de inventario para que pueda ser utilizado
* por el archivo principal de la API.
*
* ENTRADA: Objeto router.
*
* SALIDA: Rutas disponibles para ser registradas en la aplicación Express.
*
* RESTRICCIONES: El archivo principal debe importar correctamente este módulo.
*
* OBJETIVO: Habilitar las rutas del módulo mediante el prefijo /api/inventarios.
*
*-----------------------------------------------------------------------------------------*/

module.exports = router;