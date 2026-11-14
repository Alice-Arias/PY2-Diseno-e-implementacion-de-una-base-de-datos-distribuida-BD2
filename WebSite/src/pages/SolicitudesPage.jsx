/*---------------------------------------------------------------------------------------*
* NOMBRE: SolicitudesPage.jsx
*
* DESCRIPCION: Página de Solicitudes (rol Corporativo). Lista las solicitudes de los
* Administradores para ver datos sensibles de un cliente o proveedor. El Corporativo
* las aprueba (acceso por 1, 4, 8 o 24 horas) o las rechaza. Se actualiza sola cada
* 15 segundos.
*
* ENTRADA: Ninguna.
*
* SALIDA: La página de Solicitudes.
*
* OBJETIVO: Autorizar el acceso a los datos sensibles.
*-----------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Check, X, RefreshCw } from 'lucide-react';
import EncabezadoPagina from '../components/common/EncabezadoPagina';
import StatCard from '../components/common/StatCard';
import { solicitudesApi } from '../services/solicitudesApi';
import { formatoFechaHora } from '../utils/formato';

const FILTROS = [
    { valor: 'Pendiente', texto: 'Pendientes' },
    { valor: '', texto: 'Todas' }
];
const HORAS_ACCESO = [1, 4, 8, 24];
const ACTUALIZAR_CADA_MS = 15000;

const fecha = (valor) => formatoFechaHora(valor, '-');

/* Botones Aprobar / Rechazar, o quién respondió. */
function AccionSolicitud({ solicitud, procesando, onResponder }) {
    if (solicitud.Estado !== 'Pendiente') {
        return <small>{solicitud.RespondidoPor ? `por ${solicitud.RespondidoPor}` : '-'}</small>;
    }
    return (
        <div className="solicitudes-acciones">
            <button type="button" className="aprobar" disabled={procesando} onClick={() => onResponder(solicitud.IdSolicitud, true)}>
                <Check size={15} /> Aprobar
            </button>
            <button type="button" className="rechazar" disabled={procesando} onClick={() => onResponder(solicitud.IdSolicitud, false)}>
                <X size={15} /> Rechazar
            </button>
        </div>
    );
}

function SolicitudesPage() {
    const [filtro, setFiltro] = useState('Pendiente');
    const [solicitudes, setSolicitudes] = useState([]);
    const [horas, setHoras] = useState(8);
    const [error, setError] = useState('');
    const [procesando, setProcesando] = useState(null);

    const cargar = useCallback(() => {
        solicitudesApi.listar(filtro)
            .then((lista) => { setSolicitudes(lista); setError(''); })
            .catch((errorRecibido) => setError(errorRecibido.message));
    }, [filtro]);

    useEffect(() => {
        cargar();
        const intervalo = setInterval(cargar, ACTUALIZAR_CADA_MS);
        return () => clearInterval(intervalo);
    }, [cargar]);

    const responder = async (idSolicitud, aprobar) => {
        setProcesando(idSolicitud);
        try {
            await solicitudesApi.responder(idSolicitud, aprobar, horas);
            cargar();
            window.dispatchEvent(new Event('wwi-solicitudes'));   // Actualiza el contador del menú.
        } catch (errorRecibido) {
            setError(errorRecibido.message);
        } finally {
            setProcesando(null);
        }
    };

    const pendientes = solicitudes.filter((solicitud) => solicitud.Estado === 'Pendiente').length;

    return (
        <div>
            <EncabezadoPagina
                icono={ShieldCheck}
                titulo="Solicitudes de acceso"
                descripcion="Autorice o rechace el acceso de las sucursales a datos sensibles de clientes y proveedores."
            />

            <div className="stats-row">
                <StatCard icon={ShieldCheck} color="yellow" label="Pendientes" value={pendientes} sub="Esperando respuesta" />
            </div>

            <div className="table-card">
                <div className="toolbar">
                    <div className="selector-sucursal" role="radiogroup">
                        {FILTROS.map((opcion) => (
                            <button key={opcion.valor} type="button" className={filtro === opcion.valor ? 'activo' : ''}
                                    onClick={() => setFiltro(opcion.valor)}>
                                {opcion.texto}
                            </button>
                        ))}
                    </div>

                    <label className="solicitudes-horas">
                        Acceso por
                        <select value={horas} onChange={(evento) => setHoras(Number(evento.target.value))}>
                            {HORAS_ACCESO.map((cantidad) => <option key={cantidad} value={cantidad}>{cantidad} h</option>)}
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
                            {solicitudes.map((solicitud) => (
                                <tr key={solicitud.IdSolicitud}>
                                    <td>{fecha(solicitud.FechaSolicitud)}</td>
                                    <td>{solicitud.NombreUsuario}<br /><small>{solicitud.Usuario}</small></td>
                                    <td>{solicitud.Sucursal}</td>
                                    <td>{solicitud.TipoEntidad}: <strong>{solicitud.NombreEntidad}</strong></td>
                                    <td>{solicitud.Motivo || '-'}</td>
                                    <td>
                                        <span className={`estado-solicitud ${solicitud.Estado.toLowerCase()}`}>{solicitud.Estado}</span>
                                        {solicitud.Estado === 'Aprobada' && <><br /><small>hasta {fecha(solicitud.VigenteHasta)}</small></>}
                                    </td>
                                    <td>
                                        <AccionSolicitud
                                            solicitud={solicitud}
                                            procesando={procesando === solicitud.IdSolicitud}
                                            onResponder={responder}
                                        />
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
