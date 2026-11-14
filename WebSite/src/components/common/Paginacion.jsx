/*---------------------------------------------------------------------------------------*
* NOMBRE: Paginacion.jsx
*
* DESCRIPCION: Pie de las tablas: "Mostrando 1 - 10 de 663 resultados" y los botones
* « ‹ 1 2 3 4 5 › ». Muestra hasta 5 números alrededor de la página actual.
*
* ENTRADA:
*   pagina, totalPaginas, totalRegistros, porPagina, cargando
*   onCambiar(numeroPagina)
*   claseContenedor, claseBotones   clases CSS (Reportes usa las suyas).
*
* SALIDA: El pie de la tabla.
*
* OBJETIVO: Una sola paginación para todas las tablas.
*-----------------------------------------------------------------------------------------*/

const MAXIMO_BOTONES = 5;

/* Números de página que se muestran, centrados en la página actual. */
function paginasVisibles(pagina, totalPaginas) {
    let primera = Math.max(1, pagina - 2);
    const ultima = Math.min(totalPaginas, primera + MAXIMO_BOTONES - 1);
    primera = Math.max(1, ultima - MAXIMO_BOTONES + 1);

    const numeros = [];
    for (let numero = primera; numero <= ultima; numero++) numeros.push(numero);
    return numeros;
}

function Paginacion({
    pagina, totalPaginas = 1, totalRegistros = 0, porPagina = 10, cargando = false, onCambiar,
    claseContenedor = 'paginacion', claseBotones = 'paginas'
}) {
    const desde = totalRegistros === 0 ? 0 : (pagina - 1) * porPagina + 1;
    const hasta = Math.min(pagina * porPagina, totalRegistros);
    const enPrimera = pagina <= 1 || cargando;
    const enUltima = pagina >= totalPaginas || cargando;

    return (
        <div className={claseContenedor}>
            <span>
                {cargando
                    ? 'Cargando...'
                    : `Mostrando ${desde} - ${hasta} de ${totalRegistros.toLocaleString('es-CR')} resultados`}
            </span>
            <div className={claseBotones}>
                <button type="button" aria-label="Primera página" disabled={enPrimera} onClick={() => onCambiar(1)}>«</button>
                <button type="button" aria-label="Página anterior" disabled={enPrimera} onClick={() => onCambiar(pagina - 1)}>‹</button>
                {paginasVisibles(pagina, totalPaginas).map((numero) => (
                    <button
                        type="button"
                        key={numero}
                        className={pagina === numero ? 'activo' : ''}
                        disabled={cargando}
                        onClick={() => onCambiar(numero)}
                    >
                        {numero}
                    </button>
                ))}
                <button type="button" aria-label="Página siguiente" disabled={enUltima} onClick={() => onCambiar(pagina + 1)}>›</button>
                <button type="button" aria-label="Última página" disabled={enUltima} onClick={() => onCambiar(totalPaginas)}>»</button>
            </div>
        </div>
    );
}

export default Paginacion;
