/*---------------------------------------------------------------------------------------*
* NOMBRE: NumeroAnimado (PY2)
* DESCRIPCION: Muestra un número que "cuenta" desde el valor anterior hasta el nuevo
* (unos 0,9 segundos). Si el usuario pidió reducir el movimiento, aparece directo.
* ENTRADA: valor (número), formato(n) -> texto.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';

const DURACION = 900;
const suavizar = (t) => 1 - Math.pow(1 - t, 3);

function NumeroAnimado({ valor, formato = (n) => String(n) }) {
  const destino = Number(valor) || 0;
  const [actual, setActual] = useState(0);
  const desde = useRef(0);

  useEffect(() => {
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducido) {
      setActual(destino);
      desde.current = destino;
      return undefined;
    }

    const inicioValor = desde.current;
    let inicio = null;
    let cuadro;

    const paso = (momento) => {
      if (inicio === null) inicio = momento;
      const t = Math.min(1, (momento - inicio) / DURACION);
      setActual(inicioValor + (destino - inicioValor) * suavizar(t));
      if (t < 1) {
        cuadro = requestAnimationFrame(paso);
      } else {
        desde.current = destino;
      }
    };

    cuadro = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(cuadro);
      desde.current = destino;
    };
  }, [destino]);

  return <span className="numero-animado">{formato(actual)}</span>;
}

export default NumeroAnimado;
