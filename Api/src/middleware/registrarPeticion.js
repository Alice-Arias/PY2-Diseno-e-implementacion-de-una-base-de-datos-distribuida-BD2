/*---------------------------------------------------------------------------------------*
* NOMBRE: registrarPeticion.js
*
* DESCRIPCION: Escribe en la consola cada petición al terminar, con su código de
* respuesta y cuánto tardó. Ejemplo:  GET /api/clientes -> 200 en 35 ms
*
* ENTRADA: La petición (req), la respuesta (res) y next.
*
* SALIDA: Una línea en la consola por petición.
*
* OBJETIVO: Ver rápido qué consultas son lentas o fallan.
*-----------------------------------------------------------------------------------------*/

function registrarPeticion(req, res, next) {
    const inicio = Date.now();
    res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} en ${Date.now() - inicio} ms`);
    });
    next();
}

module.exports = registrarPeticion;
