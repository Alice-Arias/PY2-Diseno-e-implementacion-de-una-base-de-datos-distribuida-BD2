/*---------------------------------------------------------------------------------------*
* NOMBRE: ResumenSucursales.jsx
*
* DESCRIPCION: Panel superior de Reportes:
*   - selector Consolidado / San José / Limón (cambia también los reportes);
*   - totales de ventas, ganancia y unidades;
*   - barras que comparan las ventas de las dos sucursales;
*   - estado de los datos de cada sucursal (última sincronización o sin conexión);
*   - botón para traer en el momento los datos nuevos de las sucursales.
*
* ENTRADA: sucursal ('', '1' o '2') y onCambiarSucursal(valor).
*
* SALIDA: El panel.
*
* OBJETIVO: Comparar las sucursales y saber qué tan recientes son los datos.
*-----------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import NumeroAnimado from '../common/NumeroAnimado';
import { reportesApi } from '../../services/reportesApi';
import { formatoFechaHora } from '../../utils/formato';

const SUCURSALES = [
    { valor: '', texto: 'Consolidado' },
    { valor: '1', texto: 'San José' },
    { valor: '2', texto: 'Limón' }
];

const dolares = (valor) =>
    `USD ${Number(valor ?? 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const unidades = (valor) => Math.round(Number(valor ?? 0)).toLocaleString('es-CR');
const porcentaje = (valor) =>
    `${Number(valor).toLocaleString('es-CR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const fecha = (valor) => formatoFechaHora(valor, 'Nunca');

/* Barra del comparativo de una sucursal. */
function BarraSucursal({ sucursal, maximo, suma, atenuada, claveAnimacion }) {
    const monto = Number(sucursal.Monto);
    const participacion = (monto / suma) * 100;

    return (
        <div className={`resumen-barra ${atenuada ? 'atenuada' : ''}`}
             title={`${sucursal.Sucursal}: ${porcentaje(participacion)} de las ventas`}>
            <span className="resumen-barra-nombre">{sucursal.Sucursal}</span>
            <div className="resumen-barra-fondo">
                {/* La "key" cambia con la sucursal elegida para que la barra se vuelva a animar. */}
                <div key={claveAnimacion} className="resumen-barra-relleno" style={{ width: `${(monto / maximo) * 100}%` }} />
            </div>
            <span className="resumen-barra-valor">
                <NumeroAnimado valor={sucursal.Monto} formato={dolares} />
                <small className="resumen-barra-porcentaje">{porcentaje(participacion)}</small>
            </span>
        </div>
    );
}

/* Estado de los datos de una sucursal. */
function EstadoSucursal({ estado }) {
    const actualizado = estado.Estado === 'OK';
    return (
        <div className={`resumen-estado-fila ${actualizado ? 'ok' : 'falla'}`}>
            {actualizado ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>
                <strong>{estado.Sucursal}:</strong>{' '}
                {actualizado
                    ? `actualizado al ${fecha(estado.UltimaSincronizacion)}`
                    : `sin conexión desde ${fecha(estado.UltimoIntento)}. Se muestran sus datos al ${fecha(estado.UltimaSincronizacion)}.`}
            </span>
        </div>
    );
}

function ResumenSucursales({ sucursal, onCambiarSucursal }) {
    const [resumen, setResumen] = useState(null);
    const [error, setError] = useState('');
    const [sincronizando, setSincronizando] = useState(false);

    const cargar = useCallback(() =>
        reportesApi.resumenSucursales(sucursal)
            .then((datos) => {
                setResumen(datos);
                setError('');
            })
            .catch((errorRecibido) => setError(errorRecibido.message)),
    [sucursal]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const sincronizar = async () => {
        setSincronizando(true);
        try {
            await reportesApi.sincronizar();
            cargar();
        } catch (errorRecibido) {
            setError(errorRecibido.message);
        } finally {
            setSincronizando(false);
        }
    };

    const totales = resumen?.totales;
    const comparativo = resumen?.comparativo || [];
    const montoMaximo = Math.max(1, ...comparativo.map((fila) => Number(fila.Monto)));
    const sumaSucursales = comparativo.reduce((suma, fila) => suma + Number(fila.Monto), 0) || 1;

    return (
        <div className="table-card resumen-sucursales">
            <div className="resumen-encabezado">
                <div className="selector-sucursal" role="radiogroup" aria-label="Sucursal">
                    {SUCURSALES.map((opcion) => (
                        <button
                            key={opcion.valor}
                            type="button"
                            role="radio"
                            aria-checked={sucursal === opcion.valor}
                            className={sucursal === opcion.valor ? 'activo' : ''}
                            onClick={() => onCambiarSucursal(opcion.valor)}
                        >
                            {opcion.texto}
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
                            <strong><NumeroAnimado valor={totales.Monto_Total} formato={dolares} /></strong>
                        </div>
                        <div>
                            <span>Ganancia</span>
                            <strong><NumeroAnimado valor={totales.Ganancia_Total} formato={dolares} /></strong>
                        </div>
                        <div>
                            <span>Unidades vendidas</span>
                            <strong><NumeroAnimado valor={totales.Unidades_Vendidas} formato={unidades} /></strong>
                        </div>
                    </div>

                    <div className="resumen-comparativo">
                        <h3><Building2 size={16} /> Comparativo entre sucursales</h3>
                        {comparativo.map((fila) => (
                            <BarraSucursal
                                key={fila.SucursalID}
                                sucursal={fila}
                                maximo={montoMaximo}
                                suma={sumaSucursales}
                                atenuada={Boolean(sucursal) && String(fila.SucursalID) !== sucursal}
                                claveAnimacion={`${sucursal}-${fila.Monto}`}
                            />
                        ))}
                    </div>

                    <div className="resumen-estado">
                        <h3>Datos de cada sucursal</h3>
                        {resumen.sincronizacion.map((estado) => <EstadoSucursal key={estado.Sucursal} estado={estado} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ResumenSucursales;
