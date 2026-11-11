/*---------------------------------------------------------------------------------------*
*
* NOMBRE: BuscadorSugerencias (PY2)
*
* DESCRIPCION: Campo de búsqueda que sugiere resultados mientras se escribe (a partir
* de 2 letras) y tiene su propio botón "Buscar", para usarlo sin teclado.
* Al elegir una sugerencia de la lista, la búsqueda se ejecuta sola.
*
* ENTRADA:
*   valor, onCambiar(texto)   -> texto controlado por la página
*   onBuscar(texto)           -> ejecuta la búsqueda
*   cargarSugerencias(texto)  -> promesa con un arreglo de textos
*   placeholder, etiqueta     -> textos de ayuda
*   sinBoton                  -> true si la página ya tiene su propio botón Buscar
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';

function BuscadorSugerencias({
  valor, onCambiar, onBuscar, cargarSugerencias,
  placeholder = 'Buscar...', etiqueta = 'Buscar', sinBoton = false
}) {
  const idLista = useId();
  const [sugerencias, setSugerencias] = useState([]);
  const ultimo = useRef('');

  /* Sugerencias con una pequeña espera, para no consultar en cada tecla. */
  useEffect(() => {
    const texto = (valor || '').trim();
    if (!cargarSugerencias || texto.length < 2) {
      setSugerencias([]);
      return undefined;
    }
    const temporizador = setTimeout(() => {
      ultimo.current = texto;
      cargarSugerencias(texto)
        .then((lista) => {
          if (ultimo.current === texto) setSugerencias([...new Set(lista)].slice(0, 8));
        })
        .catch(() => setSugerencias([]));
    }, 300);
    return () => clearTimeout(temporizador);
  }, [valor, cargarSugerencias]);

  const cambiar = (texto) => {
    onCambiar(texto);
    /* Si eligió una sugerencia de la lista, se busca de inmediato. */
    if (onBuscar && !sinBoton && sugerencias.includes(texto)) onBuscar(texto.trim());
  };

  return (
    <div className="buscador">
      <div className="buscador-campo">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          list={idLista}
          aria-label={etiqueta}
          placeholder={placeholder}
          value={valor}
          maxLength={100}
          autoComplete="off"
          onChange={(e) => cambiar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onBuscar) {
              e.preventDefault();
              onBuscar(valor.trim());
            }
          }}
        />
        <datalist id={idLista}>
          {sugerencias.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
      {!sinBoton && (
        <button type="button" className="btn-buscar" onClick={() => onBuscar(valor.trim())}>
          <Search size={15} />
          Buscar
        </button>
      )}
    </div>
  );
}

export default BuscadorSugerencias;
