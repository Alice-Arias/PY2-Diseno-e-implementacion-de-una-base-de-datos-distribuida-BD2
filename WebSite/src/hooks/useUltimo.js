/*---------------------------------------------------------------------------------------*
*
* NOMBRE: useUltimo (NUEVO PY2 - limpieza)
*
* DESCRIPCION: Guarda en una ref el valor más reciente de una prop (normalmente una
* función como onMostrarMensaje u onCerrar).
*
* POR QUÉ: los useEffect que cargan datos al abrir un modal usan esas funciones,
* pero si se ponen en el arreglo de dependencias el efecto se vuelve a ejecutar
* cada vez que el padre crea una función nueva (vuelve a pedir datos al servidor).
* Si NO se ponen, el linter avisa (react-hooks/exhaustive-deps) y se podría usar una
* versión vieja de la función. Con la ref el efecto se ejecuta una sola vez y siempre
* llama a la versión actual.
*
* USO: const avisarRef = useUltimo(onMostrarMensaje);
*      ... dentro del efecto: avisarRef.current?.({ ... });
*
*-----------------------------------------------------------------------------------------*/

import { useLayoutEffect, useRef } from 'react';

export default function useUltimo(valor) {
    const ref = useRef(valor);

    useLayoutEffect(() => {
        ref.current = valor;
    });

    return ref;
}
