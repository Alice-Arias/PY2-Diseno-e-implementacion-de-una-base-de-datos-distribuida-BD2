/*---------------------------------------------------------------------------------------*
* NOMBRE: useListadoServidor
*
* DESCRIPCION: Lo usan todas las páginas con tabla. Pide a la API SOLO la página actual;
* SQL Server filtra, ordena, cuenta y pagina.
*   - Si llega una respuesta vieja (el usuario cambió de página rápido), se ignora.
*   - Después de crear / editar / eliminar se llama recargar(): misma página y filtros.
*
* ENTRADA:
*   listar    función de la API que recibe { ...filtros, pagina, tamano } y devuelve
*             { datos, paginacion }.
*   opciones  { porPagina = 10, filtrosIniciales = {}, alFallar(mensaje) }
*
* SALIDA: { filas, paginacion, filtros, pagina, cargando, error,
*           cambiarPagina, aplicarFiltros, reemplazarFiltros, recargar }
*
* OBJETIVO: Una sola lógica de paginación y filtros para todas las tablas.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import useUltimo from './useUltimo';

const PAGINACION_VACIA = { Total_Registros: 0, Pagina: 1, Total_Paginas: 1 };

export default function useListadoServidor(listar, { porPagina = 10, filtrosIniciales = {}, alFallar } = {}) {
    const [filas, setFilas] = useState([]);
    const [paginacion, setPaginacion] = useState(PAGINACION_VACIA);
    const [filtros, setFiltros] = useState(filtrosIniciales);
    const [pagina, setPagina] = useState(1);
    const [contadorRecargas, setContadorRecargas] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const ultimaPeticion = useRef(0);

    // Versiones actuales de los parámetros (así el efecto no se repite por ellos).
    const listarRef = useUltimo(listar);
    const porPaginaRef = useUltimo(porPagina);
    const alFallarRef = useUltimo(alFallar);

    useEffect(() => {
        const numeroPeticion = ++ultimaPeticion.current;
        const esLaUltima = () => numeroPeticion === ultimaPeticion.current;

        listarRef.current({ ...filtros, pagina, tamano: porPaginaRef.current })
            .then((respuesta) => {
                if (!esLaUltima()) return;
                const paginacionRecibida = respuesta.paginacion || PAGINACION_VACIA;
                setError(null);
                setFilas(respuesta.datos || []);
                setPaginacion(paginacionRecibida);

                // SQL ajusta la página si ya no existe (ej. se borró el único registro de la última).
                if (paginacionRecibida.Pagina && paginacionRecibida.Pagina !== pagina) {
                    setCargando(true);
                    setPagina(paginacionRecibida.Pagina);
                }
            })
            .catch((errorRecibido) => {
                if (!esLaUltima()) return;
                console.error(errorRecibido);
                const mensaje = errorRecibido.message || 'No se pudieron cargar los datos.';
                setFilas([]);
                setPaginacion(PAGINACION_VACIA);
                setError(mensaje);
                alFallarRef.current?.(mensaje);
            })
            .finally(() => {
                if (esLaUltima()) setCargando(false);
            });
    }, [pagina, filtros, contadorRecargas, listarRef, porPaginaRef, alFallarRef]);

    /* Combina los filtros nuevos con los actuales y vuelve a la página 1. */
    const aplicarFiltros = (cambios = {}) => {
        setCargando(true);
        setFiltros((anteriores) => ({ ...anteriores, ...cambios }));
        setPagina(1);
    };

    /* Reemplaza todos los filtros (botón "Restaurar filtros"). */
    const reemplazarFiltros = (nuevos = {}) => {
        setCargando(true);
        setFiltros(nuevos);
        setPagina(1);
    };

    const cambiarPagina = (paginaPedida) => {
        const destino = Math.min(Math.max(1, paginaPedida), paginacion.Total_Paginas || 1);
        if (destino === pagina) return;
        setCargando(true);
        setPagina(destino);
    };

    const recargar = () => {
        setCargando(true);
        setContadorRecargas((contador) => contador + 1);
    };

    return { filas, paginacion, filtros, pagina, cargando, error, cambiarPagina, aplicarFiltros, reemplazarFiltros, recargar };
}
