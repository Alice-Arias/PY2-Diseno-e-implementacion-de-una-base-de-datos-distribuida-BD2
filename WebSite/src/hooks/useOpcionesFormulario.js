/*---------------------------------------------------------------------------------------*
* NOMBRE: useOpcionesFormulario
*
* DESCRIPCION: Carga una sola vez las listas de un formulario (proveedores, clientes,
* productos...). Si fallan, avisa con onMostrarMensaje.
*
* ENTRADA:
*   cargar            función de la API que devuelve las listas.
*   listasVacias      objeto con cada lista vacía (se usa mientras cargan).
*   onMostrarMensaje  función para mostrar un error.
*
* SALIDA: { opciones, cargandoOpciones }
*
* OBJETIVO: Una sola lógica para los formularios de Inventario y Ventas.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import useUltimo from './useUltimo';

export default function useOpcionesFormulario(cargar, listasVacias, onMostrarMensaje) {
    const [opciones, setOpciones] = useState(listasVacias);
    const [cargandoOpciones, setCargandoOpciones] = useState(true);

    const cargarRef = useUltimo(cargar);
    const vaciasRef = useUltimo(listasVacias);
    const avisarRef = useUltimo(onMostrarMensaje);

    useEffect(() => {
        cargarRef.current()
            /* Cada lista que no venga queda vacía. */
            .then((recibidas) => setOpciones(
                Object.fromEntries(Object.keys(vaciasRef.current).map((nombre) => [nombre, recibidas[nombre] || []]))
            ))
            .catch((error) => {
                console.error(error);
                avisarRef.current?.({ tipo: 'error', titulo: 'No se pudieron cargar las opciones', mensaje: error.message });
            })
            .finally(() => setCargandoOpciones(false));
    }, [cargarRef, vaciasRef, avisarRef]);

    return { opciones, cargandoOpciones };
}
