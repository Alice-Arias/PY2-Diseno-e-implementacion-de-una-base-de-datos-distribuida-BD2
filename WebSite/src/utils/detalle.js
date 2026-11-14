/*---------------------------------------------------------------------------------------*
* NOMBRE: detalle.js
*
* DESCRIPCION: Ayudas para las ventanas de detalle de clientes y proveedores.
*
* ENTRADA: Datos de la fila del detalle.
*
* SALIDA: Textos y la dirección del mapa listos para mostrar.
*
* OBJETIVO: No repetir los mismos cálculos en los dos detalles.
*-----------------------------------------------------------------------------------------*/

/* Une las partes que tienen texto: ['Calle 1', null, 'Casa 2'] -> 'Calle 1 Casa 2' */
export const unirPartes = (partes, separador = ' ') => partes.filter(Boolean).join(separador);

/* 'Van, Post' -> ['Van', 'Post'] (separadores permitidos en la expresión). */
export const separarLista = (texto, separadores = /,/) =>
    String(texto || '').split(separadores).map((parte) => parte.trim()).filter(Boolean);

/* Mapa de OpenStreetMap centrado en la ubicación, o null si no hay coordenadas válidas. */
export function urlMapa(latitudTexto, longitudTexto) {
    const latitud = Number(latitudTexto);
    const longitud = Number(longitudTexto);
    const valida = latitudTexto && longitudTexto && !isNaN(latitud) && !isNaN(longitud);
    if (!valida) return null;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitud - 0.01}%2C${latitud - 0.01}%2C${longitud + 0.01}%2C${latitud + 0.01}&marker=${latitud}%2C${longitud}`;
}

/* Valor o guion si viene vacío. */
export const valorOGuion = (valor) => (valor != null && valor !== '' ? valor : '-');
