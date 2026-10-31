// ============================================================
// ICONOS
// ============================================================

// Eye     → ver los detalles.
// Pencil  → editar.
// Trash2  → eliminar.

import { Eye, Pencil, Trash2 } from 'lucide-react';


function ProveedoresTabla({
  proveedores,
  seleccionados,
  onToggleSeleccion,
  onVerUno,
  onEditar,
  onEliminar
}) {

  // Si no hay proveedores, mostramos un mensaje.

  if (proveedores.length === 0) {
    return (
      <p style={{ padding: '1rem' }}>
        No se encontraron proveedores.
      </p>
    );
  }

  return (

    // Reutilizamos la clase "tabla-clientes" para que
    // la tabla se vea igual que la de clientes.

    <table className="tabla-clientes">

      <thead>
        <tr>
          <th></th>
          <th>Nombre Proveedor</th>
          <th>Categoría</th>
          <th>Método de entrega</th>
          <th>Acciones</th>
        </tr>
      </thead>

      <tbody>

        {proveedores.map((p) => (

          <tr key={p.SupplierID}>

            {/* CHECKBOX */}

            <td>
              <input
                type="checkbox"
                checked={seleccionados.includes(p.SupplierID)}
                onChange={() => onToggleSeleccion(p.SupplierID)}
              />
            </td>

            {/* NOMBRE */}

            <td>{p.Nombre_Proveedor}</td>

            {/* CATEGORÍA */}

            <td>{p.Categoria_Proveedor}</td>

            {/* MÉTODO DE ENTREGA */}

            <td>{p.Metodo_Entrega || '-'}</td>

            {/* ACCIONES */}

            <td>

              <div className="acciones-cel">

                <Eye
                  size={17}
                  className="ver"
                  title="Ver detalles"
                  onClick={() => onVerUno(p.SupplierID)}
                />

                <Pencil
                  size={17}
                  className="editar"
                  title="Modificar proveedor"
                  onClick={() => onEditar(p)}
                />

                <Trash2
                  size={17}
                  className="eliminar"
                  title="Eliminar proveedor"
                  onClick={() => onEliminar(p)}
                />

              </div>

            </td>

          </tr>

        ))}

      </tbody>

    </table>
  );
}

export default ProveedoresTabla;