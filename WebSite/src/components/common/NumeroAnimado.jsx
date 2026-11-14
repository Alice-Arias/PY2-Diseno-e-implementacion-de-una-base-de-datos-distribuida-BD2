/*---------------------------------------------------------------------------------------*
* NOMBRE: NumeroAnimado.jsx
*
* DESCRIPCION: Muestra un número que "cuenta" desde el valor anterior hasta el nuevo
* en casi un segundo. Si el sistema pide menos animaciones, cambia de una vez.
*
* ENTRADA: valor (número) y formato (función que lo convierte en texto).
*
* SALIDA: <span class="numero-animado"> con el número formateado.
*
* OBJETIVO: Que las tarjetas de Reportes se vean más vivas al cambiar de sucursal.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';

const DURACION_MS = 900;

/* Empieza rápido y frena al final. */
const suavizar = (avance) => 1 - Math.pow(1 - avance, 3);

function NumeroAnimado({ valor, formato = (numero) => String(numero) }) {
    const destino = Number(valor) || 0;
    const [mostrado, setMostrado] = useState(0);
    const valorAnterior = useRef(0);

    /* Si el sistema pide menos animaciones, se muestra el valor final de una vez. */
    const sinAnimaciones = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    useEffect(() => {
        if (sinAnimaciones) {
            valorAnterior.current = destino;
            return undefined;
        }

        const desde = valorAnterior.current;
        let inicio = null;
        let cuadro;

        const dibujar = (momento) => {
            if (inicio === null) inicio = momento;
            const avance = Math.min(1, (momento - inicio) / DURACION_MS);
            setMostrado(desde + (destino - desde) * suavizar(avance));
            if (avance < 1) {
                cuadro = requestAnimationFrame(dibujar);
            } else {
                valorAnterior.current = destino;
            }
        };

        cuadro = requestAnimationFrame(dibujar);
        return () => {
            cancelAnimationFrame(cuadro);
            valorAnterior.current = destino;
        };
    }, [destino, sinAnimaciones]);

    return <span className="numero-animado">{formato(sinAnimaciones ? destino : mostrado)}</span>;
}

export default NumeroAnimado;
