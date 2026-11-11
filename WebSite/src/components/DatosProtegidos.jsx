/*---------------------------------------------------------------------------------------*
*
* NOMBRE: DatosProtegidos (PY2)
*
* DESCRIPCION: Bloque que aparece en el detalle de un cliente o proveedor. Los datos
* sensibles (contactos, teléfonos, direcciones y datos bancarios) viven solo en el
* Corporativo y se muestran como "xxxx" hasta que el Corporativo autoriza el acceso.
*
*   Sin solicitud / rechazada / vencida -> botón "Solicitar acceso al Corporativo".
*   Pendiente -> aviso de espera (se revisa sola cada 10 segundos).
*   Aprobada  -> pide los datos al Corporativo y se los pasa a la tarjeta (onDatos).
*
* ENTRADA: tipo ('cliente' | 'proveedor'), id, onDatos(datos).
*
*-----------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useState } from 'react';
import { Lock, Unlock, Clock, Send, XCircle } from 'lucide-react';
import { estadoSolicitud, solicitarAcceso, obtenerDatosSensibles } from '../services/api';
import './DatosProtegidos.css';

const fecha = (v) =>
  v ? new Date(v).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : '';

function DatosProtegidos({ tipo, id, onDatos }) {
  const [estado, setEstado] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const revisar = useCallback(async () => {
    try {
      const e = await estadoSolicitud(tipo, id);
      setEstado(e);
      if (e.EstadoActual === 'Aprobada') {
        onDatos(await obtenerDatosSensibles(tipo, id));
      }
    } catch (err) {
      setError(err.message);
    }
  }, [tipo, id, onDatos]);

  useEffect(() => { revisar(); }, [revisar]);

  /* Mientras esté pendiente, se revisa cada 10 segundos. */
  useEffect(() => {
    if (estado?.EstadoActual !== 'Pendiente') return undefined;
    const intervalo = setInterval(revisar, 10000);
    return () => clearInterval(intervalo);
  }, [estado, revisar]);

  const enviar = async () => {
    setEnviando(true);
    setError('');
    try {
      setEstado(await solicitarAcceso(tipo, id, motivo));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (!estado) return null;

  const actual = estado.EstadoActual;

  if (actual === 'Aprobada') {
    return (
      <div className="datos-protegidos aprobado">
        <Unlock size={18} />
        <span>Acceso autorizado por el Corporativo hasta el {fecha(estado.VigenteHasta)}.</span>
      </div>
    );
  }

  if (actual === 'Pendiente') {
    return (
      <div className="datos-protegidos pendiente">
        <Clock size={18} />
        <span>
          Solicitud enviada al Corporativo el {fecha(estado.FechaSolicitud)}. Los datos se
          mostrarán aquí cuando la autorice.
        </span>
      </div>
    );
  }

  return (
    <div className="datos-protegidos bloqueado">
      <div className="datos-protegidos-texto">
        {actual === 'Rechazada' ? <XCircle size={18} /> : <Lock size={18} />}
        <span>
          {actual === 'Rechazada' && 'El Corporativo rechazó la última solicitud. '}
          {actual === 'Vencida' && 'La autorización anterior venció. '}
          Los datos de contacto y bancarios están protegidos en el Corporativo.
        </span>
      </div>
      <div className="datos-protegidos-accion">
        <input
          type="text"
          placeholder="Motivo (opcional)"
          value={motivo}
          maxLength={300}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <button type="button" onClick={enviar} disabled={enviando}>
          <Send size={15} />
          {enviando ? 'Enviando...' : 'Solicitar acceso al Corporativo'}
        </button>
      </div>
      {error && <p className="datos-protegidos-error">{error}</p>}
    </div>
  );
}

export default DatosProtegidos;
