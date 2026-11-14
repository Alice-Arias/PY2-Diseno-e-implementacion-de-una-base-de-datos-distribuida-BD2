/*---------------------------------------------------------------------------------------*
* NOMBRE: http.js
*
* DESCRIPCION: Única puerta de salida hacia la API. Cada petición:
*   - lleva el token de la sesión (encabezado Authorization);
*   - avisa cuántas peticiones hay en curso (evento 'wwi-cargando', barra de carga);
*   - si la sesión venció (401), cierra la sesión y vuelve al inicio;
*   - si el nodo no responde (503), avisa con 'wwi-nodo-caido' para mostrar la franja;
*     cuando vuelve a responder, avisa con 'wwi-nodo-ok'.
*
* ENTRADA: Ruta de la API ('/clientes'), método, cuerpo y filtros.
*
* SALIDA: pedirApi() y construirConsulta().
*
* OBJETIVO: Que ningún otro archivo repita fetch, el token ni el manejo de errores.
*-----------------------------------------------------------------------------------------*/

import { obtenerToken, cerrarSesion } from './sesion';

export const API_URL = '/api';   // Pasa por el proxy de Vite (vite.config.js).

let peticionesEnCurso = 0;

const avisar = (evento, detalle) => window.dispatchEvent(new CustomEvent(evento, { detail: detalle }));

const avisarCarga = (cambio) => {
    peticionesEnCurso = Math.max(0, peticionesEnCurso + cambio);
    avisar('wwi-cargando', peticionesEnCurso);
};

/*---------------------------------------------------------------------------------------*
* NOMBRE: fetchConSesion
* ENTRADA: url completa y opciones de fetch.
* SALIDA: La respuesta de fetch, después de revisar sesión y estado del nodo.
*-----------------------------------------------------------------------------------------*/
async function fetchConSesion(url, opciones = {}) {
    const token = obtenerToken();
    const encabezados = { ...(opciones.headers || {}) };
    if (token) encabezados.Authorization = `Bearer ${token}`;

    let respuesta;
    avisarCarga(1);
    try {
        respuesta = await window.fetch(url, { ...opciones, headers: encabezados });
    } finally {
        avisarCarga(-1);
    }

    if (respuesta.status === 401 && token) {
        cerrarSesion();
        window.location.href = '/';
    }

    if (respuesta.status === 503) {
        respuesta.clone().json()
            .then((datos) => avisar('wwi-nodo-caido', datos.error))
            .catch(() => {});
    } else if (respuesta.ok) {
        avisar('wwi-nodo-ok');
    }

    return respuesta;
}

/*---------------------------------------------------------------------------------------*
* NOMBRE: pedirApi
* ENTRADA:
*   ruta          ruta dentro de /api, ej. '/clientes/resumen'.
*   opciones
*     metodo      'GET' (por defecto), 'POST', 'PUT' o 'DELETE'.
*     cuerpo      objeto que se envía como JSON.
*     mensajeError  texto si la API no explica el error.
* SALIDA: Los datos JSON de la respuesta. Si falla, lanza un Error con el mensaje.
*-----------------------------------------------------------------------------------------*/
export async function pedirApi(ruta, { metodo = 'GET', cuerpo, mensajeError = 'No se pudo completar la operación.' } = {}) {
    const opciones = { method: metodo };
    if (cuerpo !== undefined) {
        opciones.headers = { 'Content-Type': 'application/json' };
        opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetchConSesion(`${API_URL}${ruta}`, opciones);
    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        throw new Error(datos.error || mensajeError);
    }
    return datos;
}

/*---------------------------------------------------------------------------------------*
* NOMBRE: construirConsulta
* ENTRADA: objeto de filtros, ej. { nombre: 'Ana', categoria: '' }.
* SALIDA: Texto para la URL sin los filtros vacíos, ej. '?nombre=Ana'.
*-----------------------------------------------------------------------------------------*/
export function construirConsulta(filtros = {}) {
    const parametros = new URLSearchParams();
    Object.entries(filtros).forEach(([nombre, valor]) => {
        if (valor !== undefined && valor !== null && valor !== '') {
            parametros.append(nombre, valor);
        }
    });
    const texto = parametros.toString();
    return texto ? `?${texto}` : '';
}
