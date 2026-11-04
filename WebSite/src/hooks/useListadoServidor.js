/*---------------------------------------------------------------------------------------*
*
* NOMBRE: useListadoServidor (PY2)
*
* DESCRIPCION: Hook que usan todas las páginas con tabla. Pide a la API SOLO la
* página actual; SQL Server filtra, ordena, cuenta y pagina.
*
* ENTRADA:
*   listar   -> función de api.js que recibe { ...filtros, pagina, tamano } y
*               devuelve { datos, paginacion }.
*   opciones -> { porPagina = 10, filtrosIniciales = {}, alFallar }
*               alFallar(mensaje) se llama si la consulta falla (para mostrar un aviso).
*
* SALIDA: { filas, paginacion, filtros, pagina, cargando, error,
*           cambiarPagina, aplicarFiltros, reemplazarFiltros, recargar }
*
* DISEÑO:
*   - Un solo useEffect que depende de [pagina, filtros, recarga].
*   - "cargando" se activa en la misma acción que pide datos (filtrar, cambiar de
*     página, recargar), no dentro del efecto: evita un render extra.
*   - Si llega una respuesta vieja (el usuario cambió de página rápido) se ignora.
*   - Después de crear / editar / eliminar se llama recargar(): misma página, mismos
*     filtros.
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import useUltimo from './useUltimo';

const PAGINACION_VACIA = {
    Total_Registros: 0,
    Pagina: 1,
    Total_Paginas: 1
};

export default function useListadoServidor(listar, { porPagina = 10, filtrosIniciales = {}, alFallar } = {}) {
    const [filas, setFilas] = useState([]);
    const [paginacion, setPaginacion] = useState(PAGINACION_VACIA);
    const [filtros, setFiltros] = useState(filtrosIniciales);
    const [pagina, setPagina] = useState(1);
    const [recarga, setRecarga] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const ultimaPeticion = useRef(0);

    // Versiones actuales de los parámetros (así el efecto no se repite por ellos).
    const listarRef = useUltimo(listar);
    const porPaginaRef = useUltimo(porPagina);
    const alFallarRef = useUltimo(alFallar);

    useEffect(() => {
        const id = ++ultimaPeticion.current;

        listarRef.current({ ...filtros, pagina, tamano: porPaginaRef.current })
            .then((respuesta) => {
                if (id !== ultimaPeticion.current) return;

                const info = respuesta.paginacion || PAGINACION_VACIA;
                setError(null);
                setFilas(respuesta.datos || []);
                setPaginacion(info);

                // SQL ajusta la página si ya no existe (ej. se borró el único
                // registro de la última página).
                if (info.Pagina && info.Pagina !== pagina) {
                    setCargando(true);
                    setPagina(info.Pagina);
                }
            })
            .catch((err) => {
                if (id !== ultimaPeticion.current) return;
                console.error(err);
                const mensaje = err.message || 'No se pudieron cargar los datos.';
                setFilas([]);
                setPaginacion(PAGINACION_VACIA);
                setError(mensaje);
                alFallarRef.current?.(mensaje);
            })
            .finally(() => {
                if (id === ultimaPeticion.current) setCargando(false);
            });
    }, [pagina, filtros, recarga, listarRef, porPaginaRef, alFallarRef]);

    /* Combina los filtros nuevos con los actuales y vuelve a la página 1. */
    const aplicarFiltros = (cambios = {}) => {
        setCargando(true);
        setFiltros((anteriores) => ({ ...anteriores, ...cambios }));
        setPagina(1);
    };

    /* Reemplaza todos los filtros (para "Restaurar filtros"). */
    const reemplazarFiltros = (nuevos = {}) => {
        setCargando(true);
        setFiltros(nuevos);
        setPagina(1);
    };

    const cambiarPagina = (n) => {
        const total = paginacion.Total_Paginas || 1;
        const destino = Math.min(Math.max(1, n), total);
        if (destino === pagina) return;
        setCargando(true);
        setPagina(destino);
    };

    const recargar = () => {
        setCargando(true);
        setRecarga((r) => r + 1);
    };

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
