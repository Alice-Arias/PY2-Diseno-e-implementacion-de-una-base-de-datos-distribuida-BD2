/*-----------------------------------------------------------------------
CONSTANTE: API_URL
DESCRIPCION: Dirección base del servidor backend (Node + Express).
RESTRICCIONES: La API debe estar en ejecución en ese puerto.
OBJETIVO: Centralizar la ruta para no repetirla en cada petición.
-----------------------------------*-----------------------------------*/

const API_URL = 'http://localhost:4000/api';

/*-------------------------------------
MODULO: CLIENTES
-------------------------------------*/

/*----------------------------------------------------------------------------------------------------------------------
NOMBRE: listarClientes
DESCRIPCION: Consulta la lista de clientes aplicando filtros.
ENTRADA: filtros { nombre, categoria, metodoEntrega } (todos opcionales).
SALIDA: Arreglo de clientes (nombre, categoría, método de entrega).
RESTRICCIONES: Texto parcial, máx. 100 caracteres por filtro. Los  filtros vacíos se ignoran y los acumulativos se suman.
OBJETIVO: Llenar la tabla general del módulo de Clientes.
-------------------------------------------------------------------------------------------------------------------------*/

export async function listarClientes(filtros = {}) {

  const params = new URLSearchParams();

  if (filtros.nombre) {
    params.append('nombre', filtros.nombre);
  }

  if (filtros.categoria) {
    params.append('categoria', filtros.categoria);
  }

  if (filtros.metodoEntrega) {
    params.append('metodoEntrega', filtros.metodoEntrega);
  }

  const res = await fetch(
    `${API_URL}/clientes?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error('Error al obtener clientes');
  }

  return res.json();

}


/*-----------------------------------------------------------------------------
NOMBRE: obtenerDetalleClientes
DESCRIPCION: Obtiene la información completa de uno o varios clientes.
ENTRADA: ids (un ID o un arreglo de IDs).
SALIDA: Datos detallados de los clientes solicitados.
RESTRICCIONES: Los IDs deben existir en la base de datos.
OBJETIVO: Mostrar la ventana de detalle (botón Ver).
--------------------------------------------------------------------------------*/

export async function obtenerDetalleClientes(ids) {

  const idsStr = Array.isArray(ids)
    ? ids.join(',')
    : String(ids);

  const res = await fetch(
    `${API_URL}/clientes/${idsStr}`
  );

  if (!res.ok) {
    throw new Error('Error al obtener el detalle');
  }

  return res.json();

}


/*----------------------------------------------------*------------------------------------------------------------
NOMBRE: insertarCliente
DESCRIPCION: Envía los datos de un cliente nuevo para guardarlo.
ENTRADA: cliente (objeto con los campos del formulario).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: Las validaciones (obligatorios, rangos, nombre único), las realiza el procedimiento almacenado.
OBJETIVO: Registrar un cliente desde el formulario Agregar.
------------------------------------------------------------------------------------------------------------------*/

export async function insertarCliente(cliente) {

  const res = await fetch(
    `${API_URL}/clientes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo crear el cliente');
  }

  return data;

}


/*-------------------------------------------------------------------------------------------------
NOMBRE: actualizarCliente
DESCRIPCION: Envía los cambios de un cliente existente.
ENTRADA: id (cliente a modificar), cliente (datos nuevos).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: El cliente debe existir; las reglas de validación, las aplica el procedimiento almacenado.
OBJETIVO: Guardar los cambios del formulario Modificar.
----------------------------------------------------------------------------------------------------------*/

export async function actualizarCliente(id, cliente) {

  const res = await fetch(
    `${API_URL}/clientes/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo actualizar el cliente');
  }

  return data;

}


/*---------------------------------------------------------------------------------------------------------------
NOMBRE: eliminarCliente
DESCRIPCION: Solicita la eliminación de un cliente.
ENTRADA: id (cliente a eliminar).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: No se elimina si tiene órdenes, facturas,  transacciones u otros registros relacionados.
OBJETIVO: Ejecutar el botón Eliminar del módulo de Clientes.
-------------------------------------------------------------------------------------------------------------------------*/

export async function eliminarCliente(id) {

  const res = await fetch(
    `${API_URL}/clientes/${id}`,
    { method: 'DELETE' }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo eliminar el cliente');
  }

  return data;

}


/*--------------------------------------------------------------------------------------------------------------------
NOMBRE: obtenerOpcionesClientes
DESCRIPCION: Consulta las listas desplegables del formulario.
ENTRADA: Ninguna.
SALIDA: Opciones (categorías, contactos, métodos de entrega,ciudades, etc.).
RESTRICCIONES: Requiere conexión con la API y la base de datos.
OBJETIVO: Llenar los campos de selección al agregar o modificar.
-------------------------------------------------------------------------------------------------------------------*/

export async function obtenerOpcionesClientes() {

  const res = await fetch(`${API_URL}/clientes/opciones`);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || 'No se pudieron obtener las opciones de clientes.'
    );
  }

  return data;
}


/*-------------------------------------
MODULO: PROVEEDORES
-------------------------------------*/


/*-------------------------------------------------------------------------------------------------------------
NOMBRE: listarProveedores
DESCRIPCION: Consulta la lista de proveedores aplicando filtros.
ENTRADA: filtros { nombre, categoria, metodoEntrega } (todos opcionales).
SALIDA: Arreglo de proveedores (nombre, categoría, método de entrega).
RESTRICCIONES: Texto parcial, máx. 100 caracteres por filtro. Los  filtros vacíos se ignoran y los acumulativos se suman.
OBJETIVO: Llenar la tabla general del módulo de Proveedores.
---------------------------------------------------------------------------------------------------------------------------*/

export async function listarProveedores(filtros = {}) {

  const params = new URLSearchParams();

  if (filtros.nombre) {
    params.append('nombre', filtros.nombre);
  }

  if (filtros.categoria) {
    params.append('categoria', filtros.categoria);
  }

  if (filtros.metodoEntrega) {
    params.append('metodoEntrega', filtros.metodoEntrega);
  }

  const res = await fetch(
    `${API_URL}/proveedores?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error('Error al obtener proveedores');
  }

  return res.json();

}


/*------------------------------------------------------------------------------
NOMBRE: obtenerDetalleProveedores
DESCRIPCION: Obtiene la información completa de uno o varios proveedores.
ENTRADA: ids (un ID o un arreglo de IDs).
SALIDA: Datos detallados de los proveedores solicitados.
RESTRICCIONES: Los IDs deben existir en la base de datos.
OBJETIVO: Mostrar la ventana de detalle (botón Ver).
-----------------------------------------------------------------------------------------*/

export async function obtenerDetalleProveedores(ids) {

  const idsStr = Array.isArray(ids)
    ? ids.join(',')
    : String(ids);

  const res = await fetch(
    `${API_URL}/proveedores/${idsStr}`
  );

  if (!res.ok) {
    throw new Error('Error al obtener el detalle');
  }

  return res.json();

}


/*--------------------------------------------------------------------------------------------------------------------------
NOMBRE: insertarProveedor
DESCRIPCION: Envía los datos de un proveedor nuevo para guardarlo.
ENTRADA: proveedor (objeto con los campos del formulario).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: Las validaciones (obligatorios, nombre único, sitio  web con http) las realiza el procedimiento almacenado.
OBJETIVO: Registrar un proveedor desde el formulario Agregar.
-----------------------------------------------------------------------------------------------------------------------------*/

export async function insertarProveedor(proveedor) {

  const res = await fetch(
    `${API_URL}/proveedores`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proveedor)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo crear el proveedor');
  }

  return data;

}


/*----------------------------------------------------------------------------------------------------------------
NOMBRE: actualizarProveedor
DESCRIPCION: Envía los cambios de un proveedor existente.
ENTRADA: id (proveedor a modificar), proveedor (datos nuevos).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: El proveedor debe existir; las reglas de validación, las aplica el procedimiento almacenado.
OBJETIVO: Guardar los cambios del formulario Modificar.
-------------------------------------------------------------------------------------------------------------------*/

export async function actualizarProveedor(id, proveedor) {

  const res = await fetch(
    `${API_URL}/proveedores/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proveedor)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo actualizar el proveedor');
  }

  return data;

}


/*-----------------------------------------------------------------------------------------------------
NOMBRE: eliminarProveedor
DESCRIPCION: Solicita la eliminación de un proveedor.
ENTRADA: id (proveedor a eliminar).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: No se elimina si tiene órdenes de compra,transacciones o artículos en inventario.
OBJETIVO: Ejecutar el botón Eliminar del módulo de Proveedores.
-------------------------------------------------------------------------------------------------------*/

export async function eliminarProveedor(id) {

  const res = await fetch(
    `${API_URL}/proveedores/${id}`,
    { method: 'DELETE' }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo eliminar el proveedor');
  }

  return data;

}


/*-----------------------------------------------------------------------------------
NOMBRE: obtenerOpcionesProveedores
DESCRIPCION: Consulta las listas desplegables del formulario.
ENTRADA: Ninguna.
SALIDA: Opciones (categorías, contactos, métodos de entrega,ciudades, etc.).
RESTRICCIONES: Requiere conexión con la API y la base de datos.
OBJETIVO: Llenar los campos de selección al agregar o modificar.
---------------------------------------------------------------------------------------*/

export async function obtenerOpcionesProveedores() {

  const res = await fetch(`${API_URL}/proveedores/opciones`);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || 'No se pudieron obtener las opciones de proveedores.'
    );
  }

  return data;

}


/*-------------------------------------
MODULO: INVENTARIO
-------------------------------------*/


/*--------------------------------------------------------------------------------------------------------------------------------
NOMBRE: listarInventarios
DESCRIPCION: Consulta los productos y sus existencias con filtros.
ENTRADA: filtros { nombre, grupo, cantidad } (todos opcionales).
SALIDA: Arreglo de productos (nombre, grupos, cantidad en stock).
RESTRICCIONES: Nombre y grupo: texto parcial, máx. 100 caracteres. Cantidad: entero; muestra productos con esa cantidad o más (>=).
OBJETIVO: Llenar la tabla general del módulo de Inventario.
---------------------------------------------------------------------------------------------------------------------------------*/

export async function listarInventarios(filtros = {}) {

  const params = new URLSearchParams();

  if (filtros.nombre) {
    params.append('nombre', filtros.nombre);
  }

  if (filtros.grupo) {
    params.append('grupo', filtros.grupo);
  }

  if (filtros.cantidad !== undefined && filtros.cantidad !== '') {
    params.append('cantidad', filtros.cantidad);
  }

  const query = params.toString();

  const res = await fetch(
    `${API_URL}/inventarios${query ? `?${query}` : ''}`
  );

  if (!res.ok) {
    throw new Error('Error al obtener inventarios');
  }

  return res.json();

}


/*---------------------------------------------------------------------------
NOMBRE: obtenerDetalleInventarios
DESCRIPCION: Obtiene la información completa de uno o varios productos.
ENTRADA: ids (un ID o un arreglo de IDs).
SALIDA: Datos detallados de los productos solicitados.
RESTRICCIONES: Los IDs deben existir en la base de datos.
OBJETIVO: Mostrar la ventana de detalle (botón Ver).
---------------------------------------------------------------------------------*/

export async function obtenerDetalleInventarios(ids) {

  const idsStr = Array.isArray(ids)
    ? ids.join(',')
    : String(ids);

  const res = await fetch(
    `${API_URL}/inventarios/${idsStr}`
  );

  if (!res.ok) {
    throw new Error('Error al obtener el detalle del inventario');
  }

  return res.json();

}


/*------------------------------------------------------------------------------------------------------------
NOMBRE: insertarInventario
DESCRIPCION: Envía los datos de un producto nuevo para guardarlo.
ENTRADA: inventario (objeto con los campos del formulario).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: Nombre único; cantidad por empaque > 0; precios, impuesto y peso no negativos (valida el SP).
OBJETIVO: Registrar un producto desde el formulario Agregar.
---------------------------------------------------------------------------------------------------------------*/

export async function insertarInventario(inventario) {

  const res = await fetch(
    `${API_URL}/inventarios`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inventario)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo crear el producto');
  }

  return data;

}


/*---------------------------------------------------------------------------------------------------------------
NOMBRE: actualizarInventario
DESCRIPCION: Envía los cambios de un producto existente.
ENTRADA: id (producto a modificar), inventario (datos nuevos).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: El producto debe existir y se debe indicar el usuario que edita; el SP aplica las demás reglas.
OBJETIVO: Guardar los cambios del formulario Modificar.
-----------------------------------------------------------------------------------------------------------------------*/

export async function actualizarInventario(id, inventario) {

  const res = await fetch(
    `${API_URL}/inventarios/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inventario)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo actualizar el producto');
  }

  return data;

}


/*----------------------------------------------------------------------------------------------------
NOMBRE: eliminarInventario
DESCRIPCION: Solicita la eliminación de un producto.
ENTRADA: id (producto a eliminar).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: No se elimina si tiene transacciones, registros de inventario, pedidos o facturas.
OBJETIVO: Ejecutar el botón Eliminar del módulo de Inventario.
---------------------------------------------------------------------------------------------------------*/

export async function eliminarInventario(id) {

  const res = await fetch(
    `${API_URL}/inventarios/${id}`,
    { method: 'DELETE' }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo eliminar el producto');
  }

  return data;

}


/*---------------------------------------------------------------------
NOMBRE: obtenerOpcionesInventario
DESCRIPCION: Consulta las listas desplegables del formulario.
ENTRADA: Ninguna.
SALIDA: Opciones (proveedores, tipos de paquete, colores, etc.).
RESTRICCIONES: Requiere conexión con la API y la base de datos.
OBJETIVO: Llenar los campos de selección al agregar o modificar.
---------------------------------------------------------------------------*/

export async function obtenerOpcionesInventario() {

  const res = await fetch(`${API_URL}/inventarios/opciones`);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || 'No se pudieron obtener las opciones del inventario.'
    );
  }

  return data;

}


/*-------------------------------------
MODULO: VENTAS
-------------------------------------*/


/*--------------------------------------------------------------------------------------------------------------------------
NOMBRE: listarVentas
DESCRIPCION: Consulta la lista de facturas aplicando filtros. Ejecuta SP_Ventas_Listar (GET /api/ventas).
ENTRADA: filtros { numeroFactura, fechaInicio, fechaFin, cliente,  metodoEntrega, montoInicio, montoFin } (todos opcionales).
SALIDA: Arreglo de ventas (factura, fecha, cliente, método, monto).
RESTRICCIONES: Factura: número exacto. Fechas y montos: rangos inclusivos. Cliente y método: texto parcial.
OBJETIVO: Llenar la tabla general del módulo de Ventas.
--------------------------------------------------------------------------------------------------------------------------*/

export async function listarVentas(filtros = {}) {

  const params = new URLSearchParams();

  if (filtros.numeroFactura !== undefined && filtros.numeroFactura !== '') {
    params.append('numeroFactura', filtros.numeroFactura);
  }

  if (filtros.fechaInicio) {
    params.append('fechaInicio', filtros.fechaInicio);
  }

  if (filtros.fechaFin) {
    params.append('fechaFin', filtros.fechaFin);
  }

  if (filtros.cliente) {
    params.append('cliente', filtros.cliente);
  }

  if (filtros.metodoEntrega) {
    params.append('metodoEntrega', filtros.metodoEntrega);
  }

  if (filtros.montoInicio !== undefined && filtros.montoInicio !== '') {
    params.append('montoInicio', filtros.montoInicio);
  }

  if (filtros.montoFin !== undefined && filtros.montoFin !== '') {
    params.append('montoFin', filtros.montoFin);
  }

  const query = params.toString();

  const res = await fetch(
    `${API_URL}/ventas${query ? `?${query}` : ''}`
  );

  if (!res.ok) {
    throw new Error('Error al obtener las ventas');
  }

  return res.json();

}


/*-----------------------------------------------------------------------------------------------
NOMBRE: obtenerDetalleVenta
DESCRIPCION: Obtiene el detalle de una factura Ejecuta SP_Ventas_Detalle (GET /api/ventas/:id).
ENTRADA: id (número de la factura).
SALIDA: Objeto { encabezado, lineas }.
RESTRICCIONES: Solo una venta a la vez (el SP recibe un únicoInvoiceID); la factura debe existir.
OBJETIVO: Mostrar la ventana de detalle (botón Ver).
-------------------------------------------------------------------------------------------------*/

export async function obtenerDetalleVenta(id) {

  const res = await fetch(
    `${API_URL}/ventas/${id}`
  );

  if (!res.ok) {
    throw new Error('Error al obtener el detalle de la venta');
  }

  return res.json();

}


/*----------------------------------------------------------------------------------------------------------------------------------
NOMBRE: insertarVenta
DESCRIPCION: Envía los datos de una factura nueva (encabezado y línea de producto).Ejecuta SP_Ventas_Insertar (POST /api/ventas).
ENTRADA: venta (objeto con encabezado y línea de producto).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: Cantidad > 0; impuesto entre 0 y 100; el productodebe tener costo registrado (valida el SP).
OBJETIVO: Registrar una venta desde el formulario Agregar.
-------------------------------------------------------------------------------------------------------------------------------------------*/

export async function insertarVenta(venta) {

  const res = await fetch(
    `${API_URL}/ventas`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venta)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo crear la venta');
  }

  return data;

}


/*-----------------------------------------------------------------------------------------------------------
NOMBRE: actualizarVenta
DESCRIPCION: Envía los cambios de una factura existente. Ejecuta SP_Ventas_Actualizar (PUT /api/ventas/:id).
ENTRADA: id (factura a modificar), venta (datos nuevos).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: La factura debe existir; el producto de la línea no se puede cambiar.
OBJETIVO: Guardar los cambios del formulario Modificar.
-----------------------------------------------------------------------------------------------------------*/

export async function actualizarVenta(id, venta) {

  const res = await fetch(
    `${API_URL}/ventas/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venta)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo actualizar la venta');
  }

  return data;

}


/*------------------------------------------------------------------------------------------------------
NOMBRE: eliminarVenta
DESCRIPCION: Solicita la eliminación de una factura., Ejecuta SP_Ventas_Eliminar (DELETE /api/ventas/:id).
ENTRADA: id (factura a eliminar).
SALIDA: Respuesta de la API con el resultado de la operación.
RESTRICCIONES: Operación no contemplada en el alcance del módulo de Ventas; no se usa desde la interfaz.
OBJETIVO: Dejar disponible el servicio de eliminación en la API.
--------------------------------------------------------------------------------------------------------*/

export async function eliminarVenta(id) {

  const res = await fetch(
    `${API_URL}/ventas/${id}`,
    { method: 'DELETE' }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo eliminar la venta');
  }

  return data;

}


/*---------------------------------------------------------------------------------------
NOMBRE: obtenerOpcionesVentas
DESCRIPCION: Consulta las listas desplegables del formulario., Ejecuta SP_Ventas_Opciones (GET /api/ventas/opciones).
ENTRADA: Ninguna.
SALIDA: Objeto con clientes, métodos de entrega, contactos, vendedores, pedidos, productos y tipos de paquete.
RESTRICCIONES: Requiere conexión con la API y la base de datos.
OBJETIVO: Llenar los campos de selección al agregar o modificar.
---------------------------------------------------------------------------------------------------------*/

export async function obtenerOpcionesVentas() {

  const res = await fetch(`${API_URL}/ventas/opciones`);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || 'No se pudieron obtener las opciones de ventas.'
    );
  }

  return data;

}


/*-------------------------------------
MODULO: REPORTES
-------------------------------------*/

/*-------------------------------------------------------------------------------------------------
CONSTANTE: rutasReportes
DESCRIPCION: Relaciona el identificador utilizado por la interfaz con la ruta correspondiente de la API.
ENTRADA: Identificadores internos de los reportes.
SALIDA: Objeto con el segmento de URL para cada consulta.
RESTRICCIONES: Cada ruta debe existir bajo /api/reportes en el backend.
OBJETIVO: Centralizar el mapeo entre reportes de React y endpoints de Express.
--------------------------------------------------------------------------------------------------*/

const rutasReportes = {
  comprasProveedores: 'compras-proveedores',
  ventasClientes: 'ventas-clientes',
  topProductos: 'top-productos',
  topClientes: 'top-clientes',
  topProveedores: 'top-proveedores',
  ventasCategorias: 'ventas-categorias',
  seguimientoClientes: 'seguimiento-clientes',
  seguimientoProveedores: 'seguimiento-proveedores',
  rotacionInventario: 'rotacion-inventario',
  metodoEnvioFavorito: 'metodo-envio-favorito'
};

/*-------------------------------------------------------------------------------------------------
NOMBRE: obtenerOpcionesReportes
DESCRIPCION: Consulta las listas de años, meses, categorías y proveedores que utilizan los filtros.
ENTRADA: Ninguna.
SALIDA: Objeto de opciones devuelto por GET /api/reportes/opciones.
RESTRICCIONES: Requiere conexión con la API y SQL Server.
OBJETIVO: Llenar los menús desplegables de la vista de reportes.
--------------------------------------------------------------------------------------------------*/

export async function obtenerOpcionesReportes() {
  const res = await fetch(`${API_URL}/reportes/opciones`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudieron obtener las opciones de reportes');
  }

  return data;
}

/*-------------------------------------------------------------------------------------------------
NOMBRE: ejecutarReporte
DESCRIPCION: Envía los filtros seleccionados y consulta el reporte indicado en la API.
ENTRADA: reporte (identificador incluido en rutasReportes), filtros (objeto opcional de parámetros).
SALIDA: Arreglo JSON con las filas devueltas por el procedimiento almacenado.
RESTRICCIONES: El identificador debe existir en rutasReportes; los filtros vacíos se omiten.
OBJETIVO: Obtener los resultados para mostrarlos en la tabla de reportes.
--------------------------------------------------------------------------------------------------*/

export async function ejecutarReporte(reporte, filtros = {}) {
  const ruta = rutasReportes[reporte];

  if (!ruta) {
    throw new Error('El reporte solicitado no es válido');
  }

  const params = new URLSearchParams();

  Object.entries(filtros).forEach(([nombre, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      params.append(nombre, valor);
    }
  });

  const query = params.toString();
  const res = await fetch(
    `${API_URL}/reportes/${ruta}${query ? `?${query}` : ''}`
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo ejecutar el reporte');
  }

  return data;
}