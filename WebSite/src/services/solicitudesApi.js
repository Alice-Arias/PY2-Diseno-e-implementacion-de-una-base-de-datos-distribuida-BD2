/*---------------------------------------------------------------------------------------*
* NOMBRE: solicitudesApi.js
*
* DESCRIPCION: Solicitudes de acceso a los datos sensibles (/api/solicitudes).
*   Administrador: estado, solicitar y datosSensibles.
*   Corporativo:   listar, contarPendientes y responder.
* "tipo" es 'cliente' o 'proveedor'.
*
* ENTRADA: Tipo e ID del registro, motivo o respuesta del Corporativo.
*
* SALIDA: solicitudesApi.
*
* OBJETIVO: Reunir en un archivo las llamadas del control de acceso.
*-----------------------------------------------------------------------------------------*/

import { pedirApi, construirConsulta } from './http';

export const solicitudesApi = {
    estado: (tipo, id) => pedirApi(`/solicitudes/estado/${tipo}/${id}`, {
        mensajeError: 'No se pudo consultar la solicitud'
    }),

    solicitar: (tipo, id, motivo) => pedirApi('/solicitudes', {
        metodo: 'POST', cuerpo: { tipo, id, motivo }, mensajeError: 'No se pudo enviar la solicitud'
    }),

    datosSensibles: (tipo, id) => pedirApi(`/solicitudes/datos/${tipo}/${id}`, {
        mensajeError: 'No se pudieron obtener los datos'
    }),

    listar: (estado = '') => pedirApi(`/solicitudes${construirConsulta({ estado })}`, {
        mensajeError: 'No se pudieron obtener las solicitudes'
    }),

    contarPendientes: () => pedirApi('/solicitudes/pendientes', {
        mensajeError: 'No se pudo consultar las solicitudes'
    }),

    responder: (id, aprobar, horas = 8) => pedirApi(`/solicitudes/${id}/responder`, {
        metodo: 'POST', cuerpo: { aprobar, horas }, mensajeError: 'No se pudo responder la solicitud'
    })
};
