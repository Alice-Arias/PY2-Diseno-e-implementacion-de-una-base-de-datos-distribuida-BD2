/*---------------------------------------------------------------------------------------*
* NOMBRE: useCarrusel
*
* DESCRIPCION: Recorre una lista de uno en uno (detalle de varios registros a la vez).
* Al llegar al final vuelve al primero, y al revés. Si cambia la lista, vuelve al primero.
*
* ENTRADA: lista (arreglo o null).
*
* SALIDA: { indice, actual, total, anterior(), siguiente() }
*
* OBJETIVO: Una sola lógica para los detalles de clientes, proveedores y productos.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';

export default function useCarrusel(lista) {
    const [indice, setIndice] = useState(0);
    const [listaAnterior, setListaAnterior] = useState(lista);

    /* Lista nueva -> volver al primer elemento (patrón de React para ajustar estado al cambiar una prop). */
    if (lista !== listaAnterior) {
        setListaAnterior(lista);
        setIndice(0);
    }

    const total = lista?.length ?? 0;

    return {
        indice,
        total,
        actual: lista?.[indice],
        anterior: () => setIndice((posicion) => (posicion === 0 ? total - 1 : posicion - 1)),
        siguiente: () => setIndice((posicion) => (posicion === total - 1 ? 0 : posicion + 1))
    };
}
