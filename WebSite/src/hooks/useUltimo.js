/*---------------------------------------------------------------------------------------*
* NOMBRE: useUltimo
*
* DESCRIPCION: Guarda en una referencia el valor más reciente de una prop (casi siempre
* una función como onMostrarMensaje u onCerrar).
* Los efectos que cargan datos al abrir una ventana usan esas funciones; si se ponen
* como dependencia, el efecto se repite cada vez que el padre crea una función nueva
* (y vuelve a pedir los datos). Con la referencia el efecto corre una sola vez y
* siempre llama a la versión actual.
*
* ENTRADA: valor (cualquier cosa).
*
* SALIDA: Referencia: referencia.current tiene siempre el valor actual.
*
* OBJETIVO: Evitar peticiones repetidas sin perder la versión actual de las funciones.
*
* USO:  const avisarRef = useUltimo(onMostrarMensaje);
*       ... dentro del efecto: avisarRef.current?.({ ... });
*-----------------------------------------------------------------------------------------*/

import { useLayoutEffect, useRef } from 'react';

export default function useUltimo(valor) {
    const referencia = useRef(valor);
    useLayoutEffect(() => {
        referencia.current = valor;
    });
    return referencia;
}
