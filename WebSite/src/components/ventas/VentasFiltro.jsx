import { useState, useRef } from 'react';
import { Search, RotateCcw, Calendar, Plus } from 'lucide-react';
import BuscadorSugerencias from '../BuscadorSugerencias';   // PY2
import { sugerirClientes } from '../../services/api';

import './ventas.css';


function VentasFiltro({ metodosEntrega = [], onBuscar, onRestaurar, onNuevo }) {

    const [numeroFactura, setNumeroFactura] = useState('');
    const [cliente, setCliente] = useState('');
    const [metodoEntrega, setMetodoEntrega] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [montoInicio, setMontoInicio] = useState('');
    const [montoFin, setMontoFin] = useState('');
    const refFechaInicio = useRef(null);
    const refFechaFin = useRef(null);

    const abrirCalendario = (ref) => {
        if (ref.current?.showPicker) {
            ref.current.showPicker();
        } else {
            ref.current?.focus();
        }
    };

    const buscar = () => {
        onBuscar({
            numeroFactura,
            cliente,
            metodoEntrega,
            fechaInicio,
            fechaFin,
            montoInicio,
            montoFin
        });
    };


    // restaurar
    // 1. Limpia todos los campos.
    // 2. Avisa al padre que debe restaurar los resultados.

    const restaurar = () => {
        setNumeroFactura('');
        setCliente('');
        setMetodoEntrega('');
        setFechaInicio('');
        setFechaFin('');
        setMontoInicio('');
        setMontoFin('');

        onRestaurar();
    };


    const porEnter = (e) => {
        if (e.key === 'Enter') {
            buscar();
        }
    };


    return (

        <div className="vf-filtro">

            <div className="vf-campo vf-factura">
                <label className="vf-etiqueta">N.° de factura</label>
                <input
                    type="number"
                    min="1"
                    placeholder="Ej: 1296"
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    onKeyDown={porEnter}
                />
            </div>

            <div className="vf-campo vf-cliente">
                <label className="vf-etiqueta">Cliente</label>
                <BuscadorSugerencias
                    valor={cliente}
                    onCambiar={setCliente}
                    onBuscar={() => buscar()}
                    cargarSugerencias={sugerirClientes}
                    placeholder="Nombre del cliente"
                    etiqueta="Buscar por cliente"
                    sinBoton
                />
            </div>

            <div className="vf-campo vf-metodo">
                <label className="vf-etiqueta">Método de entrega</label>
                <select
                    value={metodoEntrega}
                    onChange={(e) => setMetodoEntrega(e.target.value)}
                >
                    <option value="">Todos los métodos</option>
                    {metodosEntrega.map((m) => (
                        <option key={m.ID} value={m.Nombre}>
                            {m.Nombre}
                        </option>
                    ))}
                </select>
            </div>

<div className="vf-campo vf-fecha">
    <label className="vf-etiqueta">Fecha desde</label>
    <div
        className="vf-fecha-wrap"
        onClick={() => abrirCalendario(refFechaInicio)}
        title="Fecha inicio"
    >
        <Calendar size={15} className="vf-fecha-ico" />

        <span className={fechaInicio ? "vf-fecha-valor" : "vf-fecha-placeholder"}>
            {fechaInicio
                ? new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-CR')
                : "Elegir fecha"}
        </span>

        <input
            ref={refFechaInicio}
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="vf-input-fecha"
        />
    </div>
</div>

<div className="vf-campo vf-fecha">
    <label className="vf-etiqueta">Fecha hasta</label>
    <div
        className="vf-fecha-wrap"
        onClick={() => abrirCalendario(refFechaFin)}
        title="Fecha fin"
    >
        <Calendar size={15} className="vf-fecha-ico" />

        <span className={fechaFin ? "vf-fecha-valor" : "vf-fecha-placeholder"}>
            {fechaFin
                ? new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CR')
                : "Elegir fecha"}
        </span>

        <input
            ref={refFechaFin}
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="vf-input-fecha"
        />
    </div>
</div>

            <div className="vf-campo vf-monto">
                <label className="vf-etiqueta">Monto desde (USD)</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ej: 100"
                    value={montoInicio}
                    onChange={(e) => setMontoInicio(e.target.value)}
                    onKeyDown={porEnter}
                />
            </div>

            <div className="vf-campo vf-monto">
                <label className="vf-etiqueta">Monto hasta (USD)</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ej: 5000"
                    value={montoFin}
                    onChange={(e) => setMontoFin(e.target.value)}
                    onKeyDown={porEnter}
                />
            </div>

            <div className="vf-acciones">

                <button className="btn-buscar" onClick={buscar}>
                    <Search size={16} />
                    Buscar
                </button>

                <button className="btn-restaurar" onClick={restaurar}>
                    <RotateCcw size={16} />
                    Restaurar filtros
                </button>

                {onNuevo && (
                    <button className="vf-btn-nuevo" onClick={onNuevo}>
                        <Plus size={16} />
                        Nueva venta
                    </button>
                )}

            </div>

        </div>
    );
}

export default VentasFiltro;