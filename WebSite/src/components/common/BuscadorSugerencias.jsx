/*---------------------------------------------------------------------------------------*
* NOMBRE: BuscadorSugerencias.jsx
*
* DESCRIPCION: Cuadro de búsqueda con sugerencias mientras se escribe (desde 2 letras)
* y botón "Buscar". Al elegir una sugerencia busca de una vez; Enter también busca.
*
* ENTRADA:
*   valor, onCambiar(texto)     texto escrito.
*   onBuscar(texto)             buscar con ese texto.
*   cargarSugerencias(texto)    función de la API que devuelve una lista de nombres.
*   placeholder, etiqueta       textos del campo.
*   sinBoton                    true si la página ya tiene su propio botón Buscar.
*
* SALIDA: El buscador.
*
* OBJETIVO: Encontrar un registro sin escribir el nombre completo.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';

const MINIMO_LETRAS = 2;
const ESPERA_MS = 300;   // Se espera a que el usuario deje de escribir.
const MAXIMO_SUGERENCIAS = 8;

function BuscadorSugerencias({
    valor, onCambiar, onBuscar, cargarSugerencias,
    placeholder = 'Buscar...', etiqueta = 'Buscar', sinBoton = false
}) {
    const idLista = useId();
    const [sugerencias, setSugerencias] = useState([]);
    const ultimoTextoPedido = useRef('');

    const texto = (valor || '').trim();
    const buscaSugerencias = Boolean(cargarSugerencias) && texto.length >= MINIMO_LETRAS;
    /* Con menos de 2 letras no se muestran sugerencias. */
    const sugerenciasVisibles = buscaSugerencias ? sugerencias : [];

    useEffect(() => {
        if (!buscaSugerencias) return undefined;

        const temporizador = setTimeout(() => {
            ultimoTextoPedido.current = texto;
            cargarSugerencias(texto)
                .then((nombres) => {
                    // Si ya se escribió otra cosa, esta respuesta llegó tarde y se ignora.
                    if (ultimoTextoPedido.current === texto) {
                        setSugerencias([...new Set(nombres)].slice(0, MAXIMO_SUGERENCIAS));
                    }
                })
                .catch(() => setSugerencias([]));
        }, ESPERA_MS);

        return () => clearTimeout(temporizador);
    }, [texto, buscaSugerencias, cargarSugerencias]);

    const cambiar = (textoNuevo) => {
        onCambiar(textoNuevo);
        const eligioSugerencia = sugerenciasVisibles.includes(textoNuevo);
        if (onBuscar && !sinBoton && eligioSugerencia) onBuscar(textoNuevo.trim());
    };

    const buscarConEnter = (evento) => {
        if (evento.key === 'Enter' && onBuscar) {
            evento.preventDefault();
            onBuscar(valor.trim());
        }
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
                    onChange={(evento) => cambiar(evento.target.value)}
                    onKeyDown={buscarConEnter}
                />
                <datalist id={idLista}>
                    {sugerenciasVisibles.map((sugerencia) => <option key={sugerencia} value={sugerencia} />)}
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
