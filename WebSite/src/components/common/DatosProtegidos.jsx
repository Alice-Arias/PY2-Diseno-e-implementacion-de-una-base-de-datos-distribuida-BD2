/*---------------------------------------------------------------------------------------*
* NOMBRE: DatosProtegidos.jsx
*
* DESCRIPCION: Aviso dentro del detalle de un cliente o proveedor. Los datos de
* contacto y bancarios solo están en el Corporativo; aquí el Administrador puede:
*   - pedir acceso (con un motivo opcional);
*   - ver que su solicitud está pendiente (se revisa sola cada 10 segundos);
*   - ver los datos cuando el Corporativo la aprueba (se envían con onDatos).
*
* ENTRADA: tipo ('cliente' | 'proveedor'), id del registro y onDatos(datos).
*
* SALIDA: El aviso según el estado de la solicitud.
*
* OBJETIVO: Control de acceso a los datos sensibles.
*-----------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useState } from 'react';
import { Lock, Unlock, Clock, Send, XCircle } from 'lucide-react';
import { solicitudesApi } from '../../services/solicitudesApi';
import { formatoFechaHora } from '../../utils/formato';

const REVISAR_CADA_MS = 10000;

function DatosProtegidos({ tipo, id, onDatos }) {
    const [solicitud, setSolicitud] = useState(null);
    const [motivo, setMotivo] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    /* Consulta el estado; si está aprobada, trae los datos sensibles. */
    const revisar = useCallback(() =>
        solicitudesApi.estado(tipo, id)
            .then(async (estadoActual) => {
                setSolicitud(estadoActual);
                if (estadoActual.EstadoActual === 'Aprobada') {
                    onDatos(await solicitudesApi.datosSensibles(tipo, id));
                }
            })
            .catch((errorRecibido) => setError(errorRecibido.message)),
    [tipo, id, onDatos]);

    useEffect(() => {
        revisar();
    }, [revisar]);

    /* Mientras esté pendiente, se vuelve a revisar sola. */
    useEffect(() => {
        if (solicitud?.EstadoActual !== 'Pendiente') return undefined;
        const intervalo = setInterval(revisar, REVISAR_CADA_MS);
        return () => clearInterval(intervalo);
    }, [solicitud, revisar]);

    const enviarSolicitud = async () => {
        setEnviando(true);
        setError('');
        try {
            setSolicitud(await solicitudesApi.solicitar(tipo, id, motivo));
        } catch (errorRecibido) {
            setError(errorRecibido.message);
        } finally {
            setEnviando(false);
        }
    };

    if (!solicitud) return null;

    const estado = solicitud.EstadoActual;

    if (estado === 'Aprobada') {
        return (
            <div className="datos-protegidos aprobado">
                <Unlock size={18} />
                <span>Acceso autorizado por el Corporativo hasta el {formatoFechaHora(solicitud.VigenteHasta)}.</span>
            </div>
        );
    }

    if (estado === 'Pendiente') {
        return (
            <div className="datos-protegidos pendiente">
                <Clock size={18} />
                <span>
                    Solicitud enviada al Corporativo el {formatoFechaHora(solicitud.FechaSolicitud)}. Los datos se
                    mostrarán aquí cuando la autorice.
                </span>
            </div>
        );
    }

    return (
        <div className="datos-protegidos bloqueado">
            <div className="datos-protegidos-texto">
                {estado === 'Rechazada' ? <XCircle size={18} /> : <Lock size={18} />}
                <span>
                    {estado === 'Rechazada' && 'El Corporativo rechazó la última solicitud. '}
                    {estado === 'Vencida' && 'La autorización anterior venció. '}
                    Los datos de contacto y bancarios están protegidos en el Corporativo.
                </span>
            </div>
            <div className="datos-protegidos-accion">
                <input
                    type="text"
                    placeholder="Motivo (opcional)"
                    value={motivo}
                    maxLength={300}
                    onChange={(evento) => setMotivo(evento.target.value)}
                />
                <button type="button" onClick={enviarSolicitud} disabled={enviando}>
                    <Send size={15} />
                    {enviando ? 'Enviando...' : 'Solicitar acceso al Corporativo'}
                </button>
            </div>
            {error && <p className="datos-protegidos-error">{error}</p>}
        </div>
    );
}

export default DatosProtegidos;
