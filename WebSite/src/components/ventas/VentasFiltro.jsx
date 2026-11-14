/*---------------------------------------------------------------------------------------*
* NOMBRE: VentasFiltro.jsx
*
* DESCRIPCION: Filtros de la tabla de ventas: número de factura, cliente (con
* sugerencias), método de entrega, rango de fechas y rango de montos; y los botones
* Buscar, Restaurar filtros y Nueva venta. Enter en un campo también busca.
*
* ENTRADA: metodosEntrega, onBuscar(filtros), onRestaurar() y onNuevo().
*
* SALIDA: La barra de filtros.
*
* OBJETIVO: Encontrar ventas combinando varios criterios.
*-----------------------------------------------------------------------------------------*/

import { useRef, useState } from 'react';
import { Search, RotateCcw, Calendar, Plus } from 'lucide-react';
import BuscadorSugerencias from '../common/BuscadorSugerencias';
import { clientesApi } from '../../services/catalogoApi';

const FILTROS_VACIOS = {
    numeroFactura: '',
    cliente: '',
    metodoEntrega: '',
    fechaInicio: '',
    fechaFin: '',
    montoInicio: '',
    montoFin: ''
};

/*---------------------------------------------------------------------------------------*
* NOMBRE: SelectorFecha
* DESCRIPCION: Muestra la fecha elegida (o "Elegir fecha") y abre el calendario del
* navegador al hacer clic en cualquier parte del cuadro.
*-----------------------------------------------------------------------------------------*/
function SelectorFecha({ etiqueta, titulo, valor, onCambiar }) {
    const campoFecha = useRef(null);

    const abrirCalendario = () => {
        if (campoFecha.current?.showPicker) campoFecha.current.showPicker();
        else campoFecha.current?.focus();
    };

    return (
        <div className="vf-campo vf-fecha">
            <label className="vf-etiqueta">{etiqueta}</label>
            <div className="vf-fecha-wrap" onClick={abrirCalendario} title={titulo}>
                <Calendar size={15} className="vf-fecha-ico" />
                <span className={valor ? 'vf-fecha-valor' : 'vf-fecha-placeholder'}>
                    {valor ? new Date(`${valor}T00:00:00`).toLocaleDateString('es-CR') : 'Elegir fecha'}
                </span>
                <input
                    ref={campoFecha}
                    type="date"
                    value={valor}
                    onChange={(evento) => onCambiar(evento.target.value)}
                    className="vf-input-fecha"
                />
            </div>
        </div>
    );
}

function VentasFiltro({ metodosEntrega = [], onBuscar, onRestaurar, onNuevo }) {
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);

    const cambiar = (nombre) => (valor) => setFiltros((actuales) => ({ ...actuales, [nombre]: valor }));
    const cambiarDesdeEvento = (nombre) => (evento) => cambiar(nombre)(evento.target.value);

    const buscar = () => onBuscar(filtros);

    const restaurar = () => {
        setFiltros(FILTROS_VACIOS);
        onRestaurar();
    };

    const buscarConEnter = (evento) => {
        if (evento.key === 'Enter') buscar();
    };

    return (
        <div className="vf-filtro">
            <div className="vf-campo vf-factura">
                <label className="vf-etiqueta">N.° de factura</label>
                <input type="number" min="1" placeholder="Ej: 1296" value={filtros.numeroFactura}
                       onChange={cambiarDesdeEvento('numeroFactura')} onKeyDown={buscarConEnter} />
            </div>

            <div className="vf-campo vf-cliente">
                <label className="vf-etiqueta">Cliente</label>
                <BuscadorSugerencias
                    valor={filtros.cliente}
                    onCambiar={cambiar('cliente')}
                    onBuscar={buscar}
                    cargarSugerencias={clientesApi.sugerir}
                    placeholder="Nombre del cliente"
                    etiqueta="Buscar por cliente"
                    sinBoton
                />
            </div>

            <div className="vf-campo vf-metodo">
                <label className="vf-etiqueta">Método de entrega</label>
                <select value={filtros.metodoEntrega} onChange={cambiarDesdeEvento('metodoEntrega')}>
                    <option value="">Todos los métodos</option>
                    {metodosEntrega.map((metodo) => (
                        <option key={metodo.ID} value={metodo.Nombre}>{metodo.Nombre}</option>
                    ))}
                </select>
            </div>

            <SelectorFecha etiqueta="Fecha desde" titulo="Fecha inicio" valor={filtros.fechaInicio} onCambiar={cambiar('fechaInicio')} />
            <SelectorFecha etiqueta="Fecha hasta" titulo="Fecha fin" valor={filtros.fechaFin} onCambiar={cambiar('fechaFin')} />

            <div className="vf-campo vf-monto">
                <label className="vf-etiqueta">Monto desde (USD)</label>
                <input type="number" min="0" step="0.01" placeholder="Ej: 100" value={filtros.montoInicio}
                       onChange={cambiarDesdeEvento('montoInicio')} onKeyDown={buscarConEnter} />
            </div>

            <div className="vf-campo vf-monto">
                <label className="vf-etiqueta">Monto hasta (USD)</label>
                <input type="number" min="0" step="0.01" placeholder="Ej: 5000" value={filtros.montoFin}
                       onChange={cambiarDesdeEvento('montoFin')} onKeyDown={buscarConEnter} />
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
                <button className="vf-btn-nuevo" onClick={onNuevo}>
                    <Plus size={16} />
                    Nueva venta
                </button>
            </div>
        </div>
    );
}

export default VentasFiltro;
