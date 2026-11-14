/*---------------------------------------------------------------------------------------*
* NOMBRE: app.js
*
* DESCRIPCION: Crea la aplicación Express: habilita CORS, lee JSON, registra cada
* petición en la consola y conecta las rutas de cada módulo con su seguridad.
*
*   Ruta               Quién puede usarla
*   ----------------   ------------------------------------------------------------
*   /api/auth          Todos (inicio de sesión)
*   /api/solicitudes   Usuario con sesión (cada ruta indica su rol)
*   /api/clientes      Administrador, solo consulta
*   /api/proveedores   Administrador, solo consulta
*   /api/inventarios   Administrador
*   /api/ventas        Administrador
*   /api/reportes      Corporativo
*
* ENTRADA: Ninguna.
*
* SALIDA: La aplicación Express lista para escuchar.
*
* OBJETIVO: Tener en un solo lugar qué rutas existen y quién puede usarlas.
*-----------------------------------------------------------------------------------------*/

const express = require('express');
const cors = require('cors');

const { autenticar, requiereRol, soloConsulta, conectarNodo } = require('./middleware/autenticacion');
const registrarPeticion = require('./middleware/registrarPeticion');

const authRoutes = require('./routes/auth.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const clientesRoutes = require('./routes/clientes.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const ventasRoutes = require('./routes/ventas.routes');
const reportesRoutes = require('./routes/reportes.routes');

/* Cadenas de seguridad por rol. Cada petición queda conectada al nodo del usuario. */
const administrador = [autenticar, requiereRol('Administrador'), conectarNodo];
const administradorConsulta = [autenticar, requiereRol('Administrador'), soloConsulta, conectarNodo];
const corporativo = [autenticar, requiereRol('Corporativo'), conectarNodo];

function crearAplicacion() {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(registrarPeticion);

    app.use('/api/auth', authRoutes);
    app.use('/api/solicitudes', autenticar, solicitudesRoutes);
    app.use('/api/clientes', ...administradorConsulta, clientesRoutes);
    app.use('/api/proveedores', ...administradorConsulta, proveedoresRoutes);
    app.use('/api/inventarios', ...administrador, inventarioRoutes);
    app.use('/api/ventas', ...administrador, ventasRoutes);
    app.use('/api/reportes', ...corporativo, reportesRoutes);

    return app;
}

module.exports = crearAplicacion;
