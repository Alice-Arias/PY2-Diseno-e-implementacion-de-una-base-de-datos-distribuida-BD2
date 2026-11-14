/*---------------------------------------------------------------------------------------*
* NOMBRE: catalogoReportes.js
*
* DESCRIPCION: Lista de los 10 reportes con su título, grupo y filtros.
*   Cada filtro tiene: id (nombre en la URL), etiqueta y tipo:
*     'texto'                     cuadro de texto libre.
*     nombre de una lista         selector con esa lista de /api/reportes/opciones
*                                 (aniosVentas, meses, categoriasProductos...).
*
* SALIDA: REPORTES y OPCIONES_VACIAS.
*
* OBJETIVO: Agregar o cambiar un reporte en un solo lugar.
*-----------------------------------------------------------------------------------------*/

const anioVentas = { id: 'anio', etiqueta: 'Año', tipo: 'aniosVentas' };
const anioCompras = { id: 'anio', etiqueta: 'Año', tipo: 'aniosCompras' };
const mes = { id: 'mes', etiqueta: 'Mes', tipo: 'meses' };
const categoriaProducto = { id: 'categoriaProducto', etiqueta: 'Categoría de producto', tipo: 'categoriasProductos' };
const categoriaCliente = { id: 'categoriaCliente', etiqueta: 'Categoría de cliente', tipo: 'categoriasClientes' };

export const REPORTES = [
    {
        id: 'comprasProveedores', titulo: 'Compras por proveedor', grupo: 'Compras',
        filtros: [
            { id: 'categoriaProveedor', etiqueta: 'Categoría de proveedor', tipo: 'categoriasProveedores' },
            { id: 'proveedor', etiqueta: 'Proveedor', tipo: 'texto' }
        ]
    },
    {
        id: 'ventasClientes', titulo: 'Ventas por cliente', grupo: 'Ventas',
        filtros: [categoriaCliente, { id: 'cliente', etiqueta: 'Cliente', tipo: 'texto' }]
    },
    { id: 'topProductos', titulo: 'Productos con más ganancia', grupo: 'Ventas', filtros: [anioVentas] },
    { id: 'topClientes', titulo: 'Clientes con más facturas', grupo: 'Ventas', filtros: [anioVentas] },
    { id: 'topProveedores', titulo: 'Proveedores con más órdenes', grupo: 'Compras', filtros: [anioCompras] },
    { id: 'ventasCategorias', titulo: 'Ventas por categoría y año', grupo: 'Ventas', filtros: [] },
    { id: 'seguimientoClientes', titulo: 'Seguimiento de compras de clientes', grupo: 'Ventas', filtros: [anioVentas, mes, categoriaProducto] },
    { id: 'seguimientoProveedores', titulo: 'Seguimiento de compras a proveedores', grupo: 'Compras', filtros: [anioCompras, mes, categoriaProducto] },
    {
        id: 'rotacionInventario', titulo: 'Rotación de inventario', grupo: 'Inventario',
        filtros: [categoriaProducto, anioCompras, { id: 'proveedor', etiqueta: 'Proveedor', tipo: 'proveedores' }]
    },
    {
        id: 'metodoEnvioFavorito', titulo: 'Método de envío favorito', grupo: 'Ventas',
        filtros: [anioVentas, mes, categoriaCliente, categoriaProducto, { id: 'producto', etiqueta: 'Producto', tipo: 'texto' }]
    }
];

export const OPCIONES_VACIAS = {
    aniosVentas: [],
    aniosCompras: [],
    meses: [],
    categoriasProductos: [],
    categoriasClientes: [],
    proveedores: [],
    categoriasProveedores: []
};
