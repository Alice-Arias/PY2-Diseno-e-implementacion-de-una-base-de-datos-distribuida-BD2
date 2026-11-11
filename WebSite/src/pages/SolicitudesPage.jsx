/*---------------------------------------------------------------------------------------*
*
* NOMBRE: SolicitudesPage (PY2, rol Corporativo)
*
* DESCRIPCION: Solicitudes de los Administradores para ver datos sensibles de un
* cliente o proveedor. El Corporativo las aprueba (acceso por unas horas) o las
* rechaza. Se actualiza sola cada 15 segundos.
*
*-----------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Check, X, RefreshCw } from 'lucide-react';
import StatCard from '../components/StatCard';
import RelojTema from '../components/RelojTema';
import { listarSolicitudes, responderSolicitud } from '../services/api';
import './pagesStyles/Solicitudes.css';

const FILTROS = [
  { valor: 'Pendiente', texto: 'Pendientes' },
  { valor: '', texto: 'Todas' }
];

const fecha = (v) =>
  v ? new Date(v).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

function SolicitudesPage() {
  const [filtro, setFiltro] = useState('Pendiente');
  const [solicitudes, setSolicitudes] = useState([]);
  const [horas, setHoras] = useState(8);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(null);

  const cargar = useCallback(() => {
    listarSolicitudes(filtro)
      .then((datos) => { setSolicitudes(datos); setError(''); })
      .catch((err) => setError(err.message));
  }, [filtro]);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 15000);
    return () => clearInterval(intervalo);
  }, [cargar]);

  const responder = async (id, aprobar) => {
    setProcesando(id);
    try {
      await responderSolicitud(id, aprobar, horas);
      cargar();
      window.dispatchEvent(new Event('wwi-solicitudes'));   // actualiza el contador del menú
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(null);
    }
  };

  const pendientes = solicitudes.filter((s) => s.Estado === 'Pendiente').length;

  return (
    <div>
      <div className="page-header">
        <div className="title-block">
          <div className="icon-box"><ShieldCheck size={22} /></div>
          <div>
            <h1>Solicitudes de acceso</h1>
            <p>Autorice o rechace el acceso de las sucursales a datos sensibles de clientes y proveedores.</p>
          </div>
        </div>
        <div className="header-right">
          <RelojTema />
        </div>
      </div>

      <div className="stats-row">
        <StatCard icon={ShieldCheck} color="yellow" label="Pendientes" value={pendientes} sub="Esperando respuesta" />
      </div>

      <div className="table-card">
        <div className="toolbar">
          <div className="selector-sucursal" role="radiogroup">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                type="button"
                className={filtro === f.valor ? 'activo' : ''}
                onClick={() => setFiltro(f.valor)}
              >
                {f.texto}
              </button>
            ))}
          </div>

          <label className="solicitudes-horas">
            Acceso por
            <select value={horas} onChange={(e) => setHoras(Number(e.target.value))}>
              {[1, 4, 8, 24].map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
          </label>

          <button type="button" className="btn-restaurar" onClick={cargar}>
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        {error && <p className="resumen-error" style={{ padding: '0 1rem' }}>{error}</p>}

        <div className="table-responsive">
          <table className="tabla-clientes solicitudes-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Sucursal</th>
                <th>Quiere ver</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>No hay solicitudes.</td></tr>
              )}
              {solicitudes.map((s) => (
                <tr key={s.IdSolicitud}>
                  <td>{fecha(s.FechaSolicitud)}</td>
                  <td>{s.NombreUsuario}<br /><small>{s.Usuario}</small></td>
                  <td>{s.Sucursal}</td>
                  <td>{s.TipoEntidad}: <strong>{s.NombreEntidad}</strong></td>
                  <td>{s.Motivo || '-'}</td>
                  <td>
                    <span className={`estado-solicitud ${s.Estado.toLowerCase()}`}>{s.Estado}</span>
                    {s.Estado === 'Aprobada' && <><br /><small>hasta {fecha(s.VigenteHasta)}</small></>}
                  </td>
                  <td>
                    {s.Estado === 'Pendiente' ? (
                      <div className="solicitudes-acciones">
                        <button type="button" className="aprobar" disabled={procesando === s.IdSolicitud}
                                onClick={() => responder(s.IdSolicitud, true)}>
                          <Check size={15} /> Aprobar
                        </button>
                        <button type="button" className="rechazar" disabled={procesando === s.IdSolicitud}
                                onClick={() => responder(s.IdSolicitud, false)}>
                          <X size={15} /> Rechazar
                        </button>
                      </div>
                    ) : (
                      <small>{s.RespondidoPor ? `por ${s.RespondidoPor}` : '-'}</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SolicitudesPage;
