/*---------------------------------------------------------------------------------------*
* NOMBRE: useSeleccion
*
* DESCRIPCION: Lista de IDs marcados con la casilla de cada fila de una tabla.
*
* ENTRADA: Ninguna.
*
* SALIDA: { seleccionados, alternar(id), limpiar() }
*
* OBJETIVO: Botón "Ver seleccionados" en Clientes, Proveedores e Inventario.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';

export default function useSeleccion() {
    const [seleccionados, setSeleccionados] = useState([]);

    const alternar = (id) =>
        setSeleccionados((actuales) =>
            actuales.includes(id) ? actuales.filter((marcado) => marcado !== id) : [...actuales, id]);

    const limpiar = () => setSeleccionados([]);

    return { seleccionados, alternar, limpiar };
}
