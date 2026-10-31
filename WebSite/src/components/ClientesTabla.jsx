/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Tabla de clientes (ClientesTabla)
*
* DESCRIPCION: Componente que muestra la lista de clientes en una tabla con las columnas
* de seleccion (checkbox), Nombre Cliente, Categoria, Metodo de entrega y Acciones. Cada
* fila incluye un checkbox para seleccionar el cliente y tres iconos de accion: ver
* detalles (ojo), modificar (lapiz) y eliminar (basurero). Si la lista de clientes esta
* vacia, muestra en su lugar el mensaje "No se encontraron clientes.". Si un cliente no
* tiene metodo de entrega se muestra un guion.
*
* ENTRADA: clientes - arreglo de clientes que se muestran en la tabla.
* seleccionados - arreglo con los CustomerID de los clientes marcados con checkbox.
* onToggleSeleccion - funcion que se ejecuta al marcar o desmarcar un checkbox y recibe
* el CustomerID del cliente.
* onVerUno - funcion que se ejecuta al presionar el ojo y recibe el CustomerID.
* onEditar - funcion que se ejecuta al presionar el lapiz y recibe el cliente completo.
* onEliminar - funcion que se ejecuta al presionar el basurero y recibe el cliente
* completo.
*
* SALIDA: Elemento JSX con la tabla de clientes, o un parrafo con un mensaje cuando no
* hay clientes.
*
* RESTRICCIONES: Requiere que existan los estilos de las clases tabla-clientes,
* acciones-cel, ver, editar y eliminar. Cada cliente debe incluir los campos CustomerID,
* Nombre_Cliente, Categoria_Cliente y Metodo_Entrega. Las propiedades clientes y
* seleccionados deben ser arreglos y las funciones de accion deben estar definidas, de
* lo contrario ocurre un error al renderizar o al hacer clic.
*
* OBJETIVO: Presentar los clientes y permitir seleccionarlos, consultarlos, modificarlos
* y eliminarlos desde la pagina de clientes.
*
*---------------------------------------------------------------------------------------*/

import { Eye, Pencil, Trash2 } from 'lucide-react';

function ClientesTabla({
  clientes,
  seleccionados,
  onToggleSeleccion,
  onVerUno,
  onEditar,
  onEliminar
}) {

  // ============================================================
  // SIN CLIENTES
  // ============================================================

  // Si no existen clientes, mostramos este mensaje.

  if (clientes.length === 0) {
    return (
      <p style={{ padding: '1rem' }}>
        No se encontraron clientes.
      </p>
    );
  }

  // ============================================================
  // TABLA
  // ============================================================

  return (
    <table className="tabla-clientes">

      {/* =====================================================
          ENCABEZADO DE LA TABLA
          ===================================================== */}

      <thead>
        <tr>

          {/* Checkbox */}
          <th></th>

          {/* Nombre del cliente */}
          <th>Nombre Cliente</th>

          {/* Categoria del cliente */}
          <th>Categoría</th>

          {/* Metodo de entrega */}
          <th>Método de entrega</th>

          {/* Botones de acciones */}
          <th>Acciones</th>

        </tr>
      </thead>

      {/* =====================================================
          CUERPO DE LA TABLA
          ===================================================== */}

      <tbody>

        {clientes.map((c) => (

          <tr key={c.CustomerID}>

            {/* =================================================
                CHECKBOX
                ================================================= */}

            <td>
              <input
                type="checkbox"


                checked={seleccionados.includes(c.CustomerID)}

                // Cuando el usuario marca o desmarca
                // el checkbox, enviamos el CustomerID
                // al componente padre.

                onChange={() =>
                  onToggleSeleccion(c.CustomerID)
                }
              />
            </td>

            {/* =================================================
                NOMBRE
                ================================================= */}

            <td>
              {c.Nombre_Cliente}
            </td>

            {/* =================================================
                CATEGORIA
                ================================================= */}

            <td>
              {c.Categoria_Cliente}
            </td>

            {/* =================================================
                METODO DE ENTREGA
                ================================================= */}

            <td>
              {c.Metodo_Entrega || '-'}
            </td>

            {/* =================================================
                ACCIONES DE CRUD
                ================================================= */}

            <td>

              <div className="acciones-cel">

                {/* =============================================
                    VER
                    ============================================= */}

                <Eye
                  size={17}
                  className="ver"
                  title="Ver detalles"

                  // El CustomerID sigue utilizandose
                  // internamente para buscar el cliente.

                  onClick={() =>
                    onVerUno(c.CustomerID)
                  }
                />

                {/* =============================================
                    EDITAR
                    ============================================= */}

                <Pencil
                  size={17}
                  className="editar"
                  title="Modificar cliente"

                  // Enviamos el cliente completo
                  // al componente padre.

                  onClick={() =>
                    onEditar(c)
                  }
                />

                {/* =============================================
                    ELIMINAR
                    ============================================= */}

                <Trash2
                  size={17}
                  className="eliminar"
                  title="Eliminar cliente"

                  // Enviamos el cliente completo
                  // al componente padre.

                  onClick={() =>
                    onEliminar(c)
                  }
                />

              </div>

            </td>

          </tr>

        ))}

      </tbody>

    </table>
  );
}

export default ClientesTabla;