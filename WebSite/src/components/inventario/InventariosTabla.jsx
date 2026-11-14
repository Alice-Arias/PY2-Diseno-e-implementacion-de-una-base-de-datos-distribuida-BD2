/*---------------------------------------------------------------------------------------*
* NOMBRE: InventariosTabla.jsx
*
* DESCRIPCION: Tabla de productos: casilla, nombre, grupo, cantidad y los botones
* ver, modificar y eliminar.
*
* ENTRADA: productos, seleccionados, onAlternar(id), onVer(id), onEditar(producto)
*          y onEliminar(producto).
*
* SALIDA: La tabla, o un mensaje si no hay productos.
*
* OBJETIVO: Mostrar y administrar los productos de la página actual.
*-----------------------------------------------------------------------------------------*/

import { Eye, Pencil, Trash2 } from 'lucide-react';

/* Botón de acción de una fila. */
function BotonAccion({ clase, texto, icono: Icono, onClick }) {
    return (
        <button type="button" className={`inv-accion ${clase}`} title={texto} aria-label={texto} onClick={onClick}>
            <Icono size={18} />
        </button>
    );
}

function InventariosTabla({ productos, seleccionados, onAlternar, onVer, onEditar, onEliminar }) {
    if (productos.length === 0) {
        return <p className="inv-vacio">No se encontraron productos de inventario.</p>;
    }

    return (
        <div className="inv-tabla-contenedor">
            <table className="inv-tabla tabla-coherente">
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
                    {productos.map((producto) => (
                        <tr key={producto.StockItemID}>
                            <td className="inv-centro">
                                <input
                                    type="checkbox"
                                    aria-label={`Seleccionar ${producto.Producto}`}
                                    checked={seleccionados.includes(producto.StockItemID)}
                                    onChange={() => onAlternar(producto.StockItemID)}
                                />
                            </td>
                            <td><span className="inv-nombre-producto">{producto.Producto}</span></td>
                            <td><span className="inv-grupo">{producto.Grupo || '-'}</span></td>
                            <td className="inv-centro"><span className="inv-cantidad">{producto.Cantidad_Inventario ?? '-'}</span></td>
                            <td className="inv-centro">
                                <div className="inv-acciones-tabla">
                                    <BotonAccion clase="inv-accion-ver" texto="Ver detalles" icono={Eye} onClick={() => onVer(producto.StockItemID)} />
                                    <BotonAccion clase="inv-accion-editar" texto="Modificar producto" icono={Pencil} onClick={() => onEditar(producto)} />
                                    <BotonAccion clase="inv-accion-eliminar" texto="Eliminar producto" icono={Trash2} onClick={() => onEliminar(producto)} />
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
