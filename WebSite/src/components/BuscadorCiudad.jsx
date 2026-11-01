/*---------------------------------------------------------------------------------------*
*
* NOMBRE: BuscadorCiudad (NUEVO PY2)
*
* DESCRIPCION: Campo para elegir una ciudad escribiendo su nombre. Reemplaza los
* <select> que cargaban ~38 000 ciudades (por eso los formularios tardaban).
*
*   - Al escribir 2 o más letras pide a SQL (SP_Ciudades_Buscar) hasta 20 ciudades.
*   - En Modificar muestra el nombre de la ciudad ORIGINAL y se puede cambiar.
*   - Devuelve el ID con onCambiar({ target: { name, value } }), igual que un input,
*     así funciona con el cambiarCampo que ya tiene cada formulario.
*
* ENTRADA: name, value (ID), etiqueta, onCambiar, requerido, className, onFocus.
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import { buscarCiudades, obtenerCiudad } from '../services/api';

function BuscadorCiudad({
    name,
    value,
    etiqueta = 'Ciudad',
    onCambiar,
    requerido = false,
    className = 'campo',
    onFocus
}) {
    const [texto, setTexto] = useState('');
    const [resultados, setResultados] = useState([]);
    const [abierto, setAbierto] = useState(false);
    const [buscando, setBuscando] = useState(false);
    const elegida = useRef({ id: '', nombre: '' });
    const temporizador = useRef(null);
    // true cuando el cambio de value lo provocó este mismo campo (no hay que redibujar).
    const cambioInterno = useRef(false);

    /* Muestra el nombre de la ciudad que ya tiene el registro (Modificar). */
    useEffect(() => {
        if (cambioInterno.current) {
            cambioInterno.current = false;
            return;
        }
        const id = value ? String(value) : '';
        if (!id) {
            elegida.current = { id: '', nombre: '' };
            setTexto('');
            return;
        }
        if (elegida.current.id === id) return;

        let cancelado = false;
        obtenerCiudad(id)
            .then((ciudad) => {
                if (cancelado || !ciudad) return;
                elegida.current = { id, nombre: ciudad.Nombre };
                setTexto(ciudad.Nombre);
            })
            .catch((err) => console.error(err));
        return () => {
            cancelado = true;
        };
    }, [value]);

    const escribir = (e) => {
        const nuevo = e.target.value;
        setTexto(nuevo);
        setAbierto(true);

        // Si borra o cambia el texto, la ciudad deja de estar elegida.
        if (elegida.current.id) {
            elegida.current = { id: '', nombre: '' };
            cambioInterno.current = true;
            onCambiar({ target: { name, value: '' } });
        }

        clearTimeout(temporizador.current);
        if (nuevo.trim().length < 2) {
            setResultados([]);
            return;
        }

        // Espera 250 ms después de la última tecla para no consultar en cada letra.
        temporizador.current = setTimeout(() => {
            setBuscando(true);
            buscarCiudades(nuevo.trim())
                .then(setResultados)
                .catch((err) => console.error(err))
                .finally(() => setBuscando(false));
        }, 250);
    };

    const elegir = (ciudad) => {
        elegida.current = { id: String(ciudad.ID), nombre: ciudad.Nombre };
        setTexto(ciudad.Nombre);
        setAbierto(false);
        setResultados([]);
        cambioInterno.current = String(ciudad.ID) !== String(value ?? '');
        onCambiar({ target: { name, value: String(ciudad.ID) } });
    };

    // Al salir del campo sin elegir, se vuelve a mostrar la ciudad elegida (si hay).
    const salir = () => {
        setTimeout(() => {
            setAbierto(false);
            if (elegida.current.id) setTexto(elegida.current.nombre);
        }, 150);
    };

    return (
        <div className={className} style={{ position: 'relative' }}>
            <label>{etiqueta}</label>
            <input
                type="text"
                value={texto}
                onChange={escribir}
                onFocus={() => {
                    setAbierto(true);
                    onFocus?.();
                }}
                onBlur={salir}
                placeholder="Escriba al menos 2 letras..."
                autoComplete="off"
                required={requerido && !value}
            />

            {abierto && texto.trim().length >= 2 && !elegida.current.id && (
                <ul
                    role="listbox"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        margin: '4px 0 0',
                        padding: 4,
                        listStyle: 'none',
                        maxHeight: 240,
                        overflowY: 'auto',
                        background: 'var(--card-bg, #fff)',
                        border: '1px solid var(--border, #d0d7e2)',
                        borderRadius: 9,
                        boxShadow: 'var(--shadow-md, 0 6px 18px rgba(0,0,0,.12))'
                    }}
                >
                    {buscando && <li style={{ padding: '8px 10px', opacity: 0.7 }}>Buscando...</li>}

                    {!buscando && resultados.length === 0 && (
                        <li style={{ padding: '8px 10px', opacity: 0.7 }}>Sin resultados</li>
                    )}

                    {!buscando && resultados.map((ciudad) => (
                        <li
                            key={ciudad.ID}
                            role="option"
                            onMouseDown={(e) => {
                                e.preventDefault(); // evita que el blur cierre antes del clic
                                elegir(ciudad);
                            }}
                            style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover, #eef3fb)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            {ciudad.Nombre}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default BuscadorCiudad;
