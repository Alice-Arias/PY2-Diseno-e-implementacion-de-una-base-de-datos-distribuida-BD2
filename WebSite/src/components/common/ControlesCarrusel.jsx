/*---------------------------------------------------------------------------------------*
* NOMBRE: ControlesCarrusel.jsx
*
* DESCRIPCION: Flechas ← → y el contador "Cliente 1 de 3" para pasar entre varios
* registros en una ventana de detalle. Solo se muestra si hay más de uno.
*
* ENTRADA:
*   carrusel   resultado de useCarrusel (indice, total, anterior, siguiente).
*   nombre     palabra del contador ("Cliente", "Proveedor", "Producto").
*   prefijo    prefijo de las clases CSS de cada módulo ('cd', 'prov', 'inv').
*   claseContenedor  clase del contenedor si no es "<prefijo>-controles".
*
* SALIDA: Los controles, o nada si hay un solo registro.
*
* OBJETIVO: Una sola lógica de navegación para todos los detalles.
*-----------------------------------------------------------------------------------------*/

function ControlesCarrusel({ carrusel, nombre, prefijo, claseContenedor = `${prefijo}-controles` }) {
    if (carrusel.total <= 1) return null;

    return (
        <div className={claseContenedor}>
            <button type="button" className={`${prefijo}-control`} onClick={carrusel.anterior} aria-label={`${nombre} anterior`}>
                ←
            </button>
            <span className={`${prefijo}-contador`}>
                {nombre} {carrusel.indice + 1} de {carrusel.total}
            </span>
            <button type="button" className={`${prefijo}-control`} onClick={carrusel.siguiente} aria-label={`${nombre} siguiente`}>
                →
            </button>
        </div>
    );
}

export default ControlesCarrusel;
