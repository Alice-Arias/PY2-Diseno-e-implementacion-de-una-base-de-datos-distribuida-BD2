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

const SIN_SELECCION = { id: '', nombre: '' };

function BuscadorCiudad({
    name,
    value,
    etiqueta = 'Ciudad',
    onCambiar,
    requerido = false,
    className = 'campo',
    onFocus
}) {
    const id = value ? String(value) : '';

    const [texto, setTexto] = useState('');
    const [seleccion, setSeleccion] = useState(SIN_SELECCION);
    const [resultados, setResultados] = useState([]);
    const [abierto, setAbierto] = useState(false);
    const [buscando, setBuscando] = useState(false);
    const temporizador = useRef(null);

    /*
     * Si el formulario borra la ciudad desde afuera (por ejemplo al limpiar el
     * formulario), se limpia el campo. Se ajusta durante el render, como recomienda
     * React, en vez de usar un useEffect.
     */
    const [idPrevio, setIdPrevio] = useState(id);
    if (id !== idPrevio) {
        setIdPrevio(id);
        if (!id && seleccion.id) {
            setSeleccion(SIN_SELECCION);
            setTexto('');
        }
    }

    /* Modificar: busca el nombre de la ciudad que ya tiene el registro. */
    useEffect(() => {
        if (!id || id === seleccion.id) return;

        let cancelado = false;
        obtenerCiudad(id)
            .then((ciudad) => {
                if (cancelado || !ciudad) return;
                setSeleccion({ id, nombre: ciudad.Nombre });
                setTexto(ciudad.Nombre);
            })
            .catch((err) => console.error(err));

        return () => {
            cancelado = true;
        };
    }, [id, seleccion.id]);

    /* Limpia el temporizador si el formulario se cierra mientras se escribe. */
    useEffect(() => () => clearTimeout(temporizador.current), []);

    const escribir = (e) => {
        const nuevo = e.target.value;
        setTexto(nuevo);
        setAbierto(true);

        // Si cambia el texto, la ciudad que estaba elegida deja de valer.
        if (seleccion.id) {
            setSeleccion(SIN_SELECCION);
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
        const nueva = { id: String(ciudad.ID), nombre: ciudad.Nombre };
        setSeleccion(nueva);
        setTexto(nueva.nombre);
        setAbierto(false);
        setResultados([]);
        onCambiar({ target: { name, value: nueva.id } });
    };

    // Al salir del campo sin elegir, se vuelve a mostrar la ciudad elegida (si hay).
    const salir = () => {
        setAbierto(false);
        if (seleccion.id) setTexto(seleccion.nombre);
    };

    const mostrarLista = abierto && texto.trim().length >= 2 && !seleccion.id;

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
                required={requerido && !id}
            />

            {mostrarLista && (
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
                            aria-selected={false}
                            onMouseDown={(e) => {
                                e.preventDefault(); // evita que el blur cierre la lista antes del clic
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
