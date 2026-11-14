/*---------------------------------------------------------------------------------------*
* NOMBRE: tema.js
*
* DESCRIPCION: Guarda en el navegador el modo de color elegido ('claro' u 'oscuro').
*
* ENTRADA: El tema elegido.
*
* SALIDA: temaGuardado() y guardarTema(tema).
*
* OBJETIVO: Recordar el modo de color la próxima vez que se abra la aplicación.
*-----------------------------------------------------------------------------------------*/

const CLAVE_TEMA = 'wwi_tema';

/* Tema guardado ('claro' por defecto o si el navegador no permite guardar). */
export function temaGuardado() {
    try {
        return localStorage.getItem(CLAVE_TEMA) === 'oscuro' ? 'oscuro' : 'claro';
    } catch {
        return 'claro';
    }
}

export function guardarTema(tema) {
    try {
        localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
        /* Navegador sin almacenamiento: el tema dura solo mientras la página esté abierta. */
    }
}
