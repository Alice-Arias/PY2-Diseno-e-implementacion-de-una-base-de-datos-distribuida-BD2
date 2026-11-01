/*---------------------------------------------------------------------------------------*
*
* REEMPLAZAR en WebSite/src/services/api.js la función listarInventarios por esta,
* y AGREGAR obtenerResumenInventario. El resto de funciones (detalle, insertar,
* actualizar, eliminar, opciones) se quedan igual.
*
*-----------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------*
* NOMBRE: listarInventarios
* ENTRADA: filtros { nombre, grupo, cantidad, pagina, tamano }
* SALIDA: { datos: [...filas de la página], paginacion: { Total_Registros, Pagina,
*           Tamano_Pagina, Total_Paginas } }
*-----------------------------------------------------------------------------------------*/
export async function listarInventarios(filtros = {}) {
  const params = new URLSearchParams();

  if (filtros.nombre) params.append('nombre', filtros.nombre);
  if (filtros.grupo) params.append('grupo', filtros.grupo);
  if (filtros.cantidad !== undefined && filtros.cantidad !== '') {
    params.append('cantidad', filtros.cantidad);
  }
  params.append('pagina', filtros.pagina ?? 1);
  params.append('tamano', filtros.tamano ?? 10);

  const res = await fetch(`${API_URL}/inventarios?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Error al obtener inventarios');
  }

  return res.json();
}

/*---------------------------------------------------------------------------------------*
* NOMBRE: obtenerResumenInventario
* SALIDA: { totales: { Total_Productos, Total_Grupos, Productos_Sin_Stock }, grupos: [...] }
*-----------------------------------------------------------------------------------------*/
export async function obtenerResumenInventario() {
  const res = await fetch(`${API_URL}/inventarios/resumen`);

  if (!res.ok) {
    throw new Error('Error al obtener el resumen de inventario');
  }

  return res.json();
}
