/*---------------------------------------------------------------------------------------*
* NOMBRE: BotonVerSeleccionados.jsx
*
* DESCRIPCION: Botón "Ver seleccionados (n)". Abre el detalle de todos los registros
* marcados; si no hay ninguno, queda deshabilitado.
*
* ENTRADA: cantidad de seleccionados y onClick.
*
* SALIDA: El botón.
*
* OBJETIVO: Mismo botón en Clientes, Proveedores e Inventario.
*-----------------------------------------------------------------------------------------*/

import { Eye } from 'lucide-react';

function BotonVerSeleccionados({ cantidad, onClick }) {
    const ninguno = cantidad === 0;
    return (
        <button
            className="btn-filtros"
            disabled={ninguno}
            onClick={onClick}
            style={{ opacity: ninguno ? 0.5 : 1, cursor: ninguno ? 'not-allowed' : 'pointer' }}
        >
            <Eye size={16} />
            Ver seleccionados ({cantidad})
        </button>
    );
}

export default BotonVerSeleccionados;
