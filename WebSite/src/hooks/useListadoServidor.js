/*---------------------------------------------------------------------------------------*
*
* NOMBRE: useListadoServidor (NUEVO PY2)
*
* DESCRIPCION: Hook que usan todas las páginas con tabla. Pide a la API SOLO la
* página actual; SQL Server filtra, ordena, cuenta y pagina.
*
* ENTRADA:
*   listar   -> función de api.js que recibe { ...filtros, pagina, tamano } y
*               devuelve { datos, paginacion }.
*   opciones -> { porPagina = 10, filtrosIniciales = {} }
*
* SALIDA: { filas, paginacion, filtros, pagina, cargando, error,
*           cambiarPagina, aplicarFiltros, reemplazarFiltros, recargar }
*
* CORRIGE (observación "paginación / offsets / useEffect"):
*   - Un solo useEffect que depende de [pagina, filtros, recarga]. No hay llamadas
*     duplicadas ni estados que se desincronicen.
*   - Después de crear / editar / eliminar se llama recargar(): se vuelve a pedir la
*     misma página con los mismos filtros (antes se perdía la paginación).
*   - Si llega una respuesta vieja (el usuario cambió de página rápido) se ignora.
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';

const PAGINACION_VACIA = {
    Total_Registros: 0,
    Pagina: 1,
    Total_Paginas: 1
};

export default function useListadoServidor(listar, { porPagina = 10, filtrosIniciales = {} } = {}) {
    const [filas, setFilas] = useState([]);
    const [paginacion, setPaginacion] = useState(PAGINACION_VACIA);
    const [filtros, setFiltros] = useState(filtrosIniciales);
    const [pagina, setPagina] = useState(1);
    const [recarga, setRecarga] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const ultimaPeticion = useRef(0);

    useEffect(() => {
        const id = ++ultimaPeticion.current;
        setCargando(true);
        setError(null);

        listar({ ...filtros, pagina, tamano: porPagina })
            .then((respuesta) => {
                if (id !== ultimaPeticion.current) return;

                const info = respuesta.paginacion || PAGINACION_VACIA;
                setFilas(respuesta.datos || []);
                setPaginacion(info);

                // SQL ajusta la página si ya no existe (ej. se borró el único
                // registro de la última página).
                if (info.Pagina && info.Pagina !== pagina) {
                    setPagina(info.Pagina);
                }
            })
            .catch((err) => {
                if (id !== ultimaPeticion.current) return;
                console.error(err);
                setFilas([]);
                setPaginacion(PAGINACION_VACIA);
                setError(err.message || 'No se pudieron cargar los datos.');
            })
            .finally(() => {
                if (id === ultimaPeticion.current) setCargando(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagina, filtros, recarga]);

    /* Combina los filtros nuevos con los actuales y vuelve a la página 1. */
    const aplicarFiltros = (cambios = {}) => {
        setFiltros((anteriores) => ({ ...anteriores, ...cambios }));
        setPagina(1);
    };

    /* Reemplaza todos los filtros (para "Restaurar filtros"). */
    const reemplazarFiltros = (nuevos = {}) => {
        setFiltros(nuevos);
        setPagina(1);
    };

    const cambiarPagina = (n) => {
        const total = paginacion.Total_Paginas || 1;
        setPagina(Math.min(Math.max(1, n), total));
    };

    const recargar = () => setRecarga((r) => r + 1);

    return {
        filas,
        paginacion,
        filtros,
        pagina,
        cargando,
        error,
        cambiarPagina,
        aplicarFiltros,
        reemplazarFiltros,
        recargar
    };
}
