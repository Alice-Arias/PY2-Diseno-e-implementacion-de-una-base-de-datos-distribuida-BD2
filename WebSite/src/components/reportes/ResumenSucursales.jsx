/*---------------------------------------------------------------------------------------*
*
* NOMBRE: ResumenSucursales (PY2)
*
* DESCRIPCION: Panel del rol Corporativo con las estadísticas de cada negocio.
*   - Selector San José / Limón / Consolidado (filtra también los 11 reportes).
*   - Totales y comparativo entre sucursales: salen de las vistas materializadas
*     del Corporativo (Estadisticas.vw_VentasSucursalMes).
*   - Estado de los datos de cada sucursal (última sincronización). Si una sucursal
*     no respondió, se avisa y se muestran sus últimos datos.
*   - Botón para sincronizar en el momento (el job lo hace solo cada 5 minutos).
*
* ENTRADA: sucursal ('' = consolidado, '1' = San José, '2' = Limón) y onCambiarSucursal.
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { RefreshCw, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { obtenerResumenSucursales, sincronizarEstadisticas } from '../../services/api';
import NumeroAnimado from '../NumeroAnimado';

const OPCIONES = [
  { valor: '', texto: 'Consolidado' },
  { valor: '1', texto: 'San José' },
  { valor: '2', texto: 'Limón' }
];

const dinero = (v) =>
  `USD ${Number(v ?? 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const unidades = (v) => Math.round(Number(v ?? 0)).toLocaleString('es-CR');

const porcentaje = (v) =>
  `${Number(v).toLocaleString('es-CR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

const fecha = (v) =>
  v ? new Date(v).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca';

function ResumenSucursales({ sucursal, onCambiarSucursal }) {
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState('');
  const [sincronizando, setSincronizando] = useState(false);

  const cargar = () => {
    setError('');
    obtenerResumenSucursales(sucursal)
      .then(setResumen)
      .catch((err) => setError(err.message));
  };

  useEffect(cargar, [sucursal]);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      await sincronizarEstadisticas();
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setSincronizando(false);
    }
  };

  const totales = resumen?.totales;
  const maximo = Math.max(1, ...(resumen?.comparativo || []).map((c) => Number(c.Monto)));
  const sumaSucursales = (resumen?.comparativo || []).reduce((s, c) => s + Number(c.Monto), 0) || 1;

  return (
    <div className="table-card resumen-sucursales">
      <div className="resumen-encabezado">
        <div className="selector-sucursal" role="radiogroup" aria-label="Sucursal">
          {OPCIONES.map((o) => (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={sucursal === o.valor}
              className={sucursal === o.valor ? 'activo' : ''}
              onClick={() => onCambiarSucursal(o.valor)}
            >
              {o.texto}
            </button>
          ))}
        </div>

        <button type="button" className="btn-restaurar" onClick={sincronizar} disabled={sincronizando}>
          <RefreshCw size={15} className={sincronizando ? 'girando' : ''} />
          {sincronizando ? 'Sincronizando...' : 'Actualizar datos de sucursales'}
        </button>
      </div>

      {error && <p className="resumen-error">{error}</p>}

      {totales && (
        <div className="resumen-cuerpo">
          <div className="resumen-totales">
            <div>
              <span>Ventas ({totales.Vista})</span>
              <strong><NumeroAnimado valor={totales.Monto_Total} formato={dinero} /></strong>
            </div>
            <div>
              <span>Ganancia</span>
              <strong><NumeroAnimado valor={totales.Ganancia_Total} formato={dinero} /></strong>
            </div>
            <div>
              <span>Unidades vendidas</span>
              <strong><NumeroAnimado valor={totales.Unidades_Vendidas} formato={unidades} /></strong>
            </div>
          </div>

          <div className="resumen-comparativo">
            <h3><Building2 size={16} /> Comparativo entre sucursales</h3>
            {resumen.comparativo.map((c) => {
              const participacion = (Number(c.Monto) / sumaSucursales) * 100;
              const elegida = !sucursal || String(c.SucursalID) === sucursal;
              return (
                <div
                  key={c.SucursalID}
                  className={`resumen-barra ${elegida ? '' : 'atenuada'}`}
                  title={`${c.Sucursal}: ${porcentaje(participacion)} de las ventas`}
                >
                  <span className="resumen-barra-nombre">{c.Sucursal}</span>
                  <div className="resumen-barra-fondo">
                    {/* key: al cambiar los datos, la barra vuelve a crecer desde cero */}
                    <div
                      key={`${sucursal}-${c.Monto}`}
                      className="resumen-barra-relleno"
                      style={{ width: `${(Number(c.Monto) / maximo) * 100}%` }}
                    />
                  </div>
                  <span className="resumen-barra-valor">
                    <NumeroAnimado valor={c.Monto} formato={dinero} />
                    <small className="resumen-barra-porcentaje">{porcentaje(participacion)}</small>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="resumen-estado">
            <h3>Datos de cada sucursal</h3>
            {resumen.sincronizacion.map((s) => {
              const ok = s.Estado === 'OK';
              return (
                <div key={s.Sucursal} className={`resumen-estado-fila ${ok ? 'ok' : 'falla'}`}>
                  {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>
                    <strong>{s.Sucursal}:</strong>{' '}
                    {ok
                      ? `actualizado al ${fecha(s.UltimaSincronizacion)}`
                      : `sin conexión desde ${fecha(s.UltimoIntento)}. Se muestran sus datos al ${fecha(s.UltimaSincronizacion)}.`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumenSucursales;
