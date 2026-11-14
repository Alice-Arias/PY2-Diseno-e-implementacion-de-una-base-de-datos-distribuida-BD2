/*---------------------------------------------------------------------------------------*
* NOMBRE: TablaConsulta.jsx
*
* DESCRIPCION: Tabla de Clientes y Proveedores: casilla para seleccionar, nombre,
* categoría, método de entrega y el ojo para ver el detalle.
*
* ENTRADA:
*   filas           registros de la página actual.
*   campos          { id, nombre, categoria } nombres de las columnas que llegan de la API.
*   titulo          título de la columna del nombre ("Nombre Cliente").
*   textoVacio      mensaje si no hay resultados.
*   seleccionados   IDs marcados.
*   onAlternar(id)  marcar o desmarcar.
*   onVer(id)       abrir el detalle.
*
* SALIDA: La tabla, o el mensaje de "no se encontraron".
*
* OBJETIVO: Una sola tabla para los dos módulos de consulta.
*-----------------------------------------------------------------------------------------*/

import { Eye } from 'lucide-react';

function TablaConsulta({ filas, campos, titulo, textoVacio, seleccionados, onAlternar, onVer }) {
    if (filas.length === 0) {
        return <p style={{ padding: '1rem' }}>{textoVacio}</p>;
    }

    return (
        <table className="tabla-clientes">
            <thead>
                <tr>
                    <th></th>
                    <th>{titulo}</th>
                    <th>Categoría</th>
                    <th>Método de entrega</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {filas.map((fila) => {
                    const id = fila[campos.id];
                    return (
                        <tr key={id}>
                            <td>
                                <input type="checkbox" checked={seleccionados.includes(id)} onChange={() => onAlternar(id)} />
                            </td>
                            <td>{fila[campos.nombre]}</td>
                            <td>{fila[campos.categoria]}</td>
                            <td>{fila.Metodo_Entrega || '-'}</td>
                            <td>
                                <div className="acciones-cel">
                                    <Eye size={17} className="ver" title="Ver detalles" onClick={() => onVer(id)} />
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default TablaConsulta;
