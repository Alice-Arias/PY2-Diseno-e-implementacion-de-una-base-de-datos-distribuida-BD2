/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Paginacion (NUEVO PY2)
*
* DESCRIPCION: Controles de paginación compartidos por todos los módulos. Solo
* dibuja botones: el total de registros y de páginas lo calcula SQL Server.
* Nunca se desmonta mientras carga (antes la paginación "desaparecía").
*
* ENTRADA: pagina, totalPaginas, totalRegistros, porPagina, cargando,
*          onCambiar(n), clases opcionales para reutilizar el CSS existente.
*
*-----------------------------------------------------------------------------------------*/

function Paginacion({
    pagina,
    totalPaginas = 1,
    totalRegistros = 0,
    porPagina = 10,
    cargando = false,
    onCambiar,
    claseContenedor = 'paginacion',
    claseBotones = 'paginas'
}) {
    const maxBotones = 5;
    let inicio = Math.max(1, pagina - 2);
    const fin = Math.min(totalPaginas, inicio + maxBotones - 1);
    inicio = Math.max(1, fin - maxBotones + 1);

    const numeros = [];
    for (let n = inicio; n <= fin; n++) numeros.push(n);

    const desde = totalRegistros === 0 ? 0 : (pagina - 1) * porPagina + 1;
    const hasta = Math.min(pagina * porPagina, totalRegistros);

    return (
        <div className={claseContenedor}>
            <span>
                {cargando
                    ? 'Cargando...'
                    : `Mostrando ${desde} - ${hasta} de ${totalRegistros.toLocaleString('es-CR')} resultados`}
            </span>

            <div className={claseBotones}>
                <button
                    type="button"
                    aria-label="Primera página"
                    disabled={pagina <= 1 || cargando}
                    onClick={() => onCambiar(1)}
                >
                    «
                </button>
                <button
                    type="button"
                    aria-label="Página anterior"
                    disabled={pagina <= 1 || cargando}
                    onClick={() => onCambiar(pagina - 1)}
                >
                    ‹
                </button>

                {numeros.map((n) => (
                    <button
                        type="button"
                        key={n}
                        className={pagina === n ? 'activo' : ''}
                        disabled={cargando}
                        onClick={() => onCambiar(n)}
                    >
                        {n}
                    </button>
                ))}

                <button
                    type="button"
                    aria-label="Página siguiente"
                    disabled={pagina >= totalPaginas || cargando}
                    onClick={() => onCambiar(pagina + 1)}
                >
                    ›
                </button>
                <button
                    type="button"
                    aria-label="Última página"
                    disabled={pagina >= totalPaginas || cargando}
                    onClick={() => onCambiar(totalPaginas)}
                >
                    »
                </button>
            </div>
        </div>
    );
}

export default Paginacion;
