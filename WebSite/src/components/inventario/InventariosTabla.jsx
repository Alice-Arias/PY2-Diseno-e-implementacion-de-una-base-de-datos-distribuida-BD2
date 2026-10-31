// ============================================================
// ICONOS (lucide-react)
// ============================================================
//
// Eye      → ver los detalles.
// Pencil   → editar.
// Trash2   → eliminar.

import { Eye, Pencil, Trash2 } from 'lucide-react';


function InventariosTabla({
  inventarios,
  seleccionados,
  onToggleSeleccion,
  onVerUno,
  onEditar,
  onEliminar
}) {

  // ============================================================
  // SIN PRODUCTOS
  // ============================================================

  if (inventarios.length === 0) {

    return (
      <p className="inv-vacio">
        No se encontraron productos de inventario.
      </p>
    );

  }


  // ============================================================
  // TABLA
  // ============================================================

  return (

    <div className="inv-tabla-contenedor">

      <table className="inv-tabla">

        {/* Anchos fijos: el nombre toma todo el espacio sobrante
            y por eso se ve completo (baja de línea si es largo) */}
        <colgroup>
          <col style={{ width: '56px' }} />
          <col style={{ width: '38%' }} />
          <col style={{ width: '27%' }} />
          <col style={{ width: '160px' }} />
          <col style={{ width: '140px' }} />
        </colgroup>


        <thead>

          <tr>

            <th className="inv-centro"></th>

            <th>Nombre del producto</th>

            <th>Grupo</th>

            <th className="inv-centro">Cantidad en inventario</th>

            <th className="inv-centro">Acciones</th>

          </tr>

        </thead>


        <tbody>

          {inventarios.map((inventario) => (

            <tr key={inventario.StockItemID}>

              {/* CHECKBOX */}
              <td className="inv-centro">

                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${inventario.Producto}`}
                  checked={
                    seleccionados.includes(
                      inventario.StockItemID
                    )
                  }
                  onChange={() =>
                    onToggleSeleccion(
                      inventario.StockItemID
                    )
                  }
                />

              </td>


              {/* NOMBRE DEL PRODUCTO (completo) */}
              <td>

                <span className="inv-nombre-producto">
                  {inventario.Producto}
                </span>

              </td>


              {/* GRUPO */}
              <td>

                <span className="inv-grupo">
                  {inventario.Grupo || '-'}
                </span>

              </td>


              {/* CANTIDAD EN INVENTARIO */}
              <td className="inv-centro">

                <span className="inv-cantidad">
                  {inventario.Cantidad_Inventario ?? '-'}
                </span>

              </td>


              {/* ACCIONES */}
              <td className="inv-centro">

                <div className="inv-acciones-tabla">

                  <button
                    type="button"
                    className="inv-accion inv-accion-ver"
                    title="Ver detalles"
                    aria-label="Ver detalles"
                    onClick={() =>
                      onVerUno(inventario.StockItemID)
                    }
                  >
                    <Eye size={18} />
                  </button>

                  <button
                    type="button"
                    className="inv-accion inv-accion-editar"
                    title="Modificar producto"
                    aria-label="Modificar producto"
                    onClick={() =>
                      onEditar(inventario)
                    }
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    type="button"
                    className="inv-accion inv-accion-eliminar"
                    title="Eliminar producto"
                    aria-label="Eliminar producto"
                    onClick={() =>
                      onEliminar(inventario)
                    }
                  >
                    <Trash2 size={18} />
                  </button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}

export default InventariosTabla;