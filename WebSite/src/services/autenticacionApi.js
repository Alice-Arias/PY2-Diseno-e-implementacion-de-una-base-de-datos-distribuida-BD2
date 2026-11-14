/*---------------------------------------------------------------------------------------*
* NOMBRE: autenticacionApi.js
*
* DESCRIPCION: Inicio de sesión (POST /api/auth/login). No usa pedirApi porque todavía
* no hay token y porque, si la API está apagada, el mensaje debe decirlo claramente.
*
* ENTRADA: usuario, contraseña y rol elegido.
*
* SALIDA: { token, usuario } o un Error con el motivo.
*
* OBJETIVO: Validar al usuario contra la tabla de usuarios del Corporativo.
*-----------------------------------------------------------------------------------------*/

import { API_URL } from './http';

export async function iniciarSesion(username, password, rol) {
    let respuesta;
    try {
        respuesta = await window.fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, rol })
        });
    } catch {
        throw new Error('No se pudo conectar con la API. Revise que esté en ejecución.');
    }

    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo iniciar sesión');
    return datos;
}
