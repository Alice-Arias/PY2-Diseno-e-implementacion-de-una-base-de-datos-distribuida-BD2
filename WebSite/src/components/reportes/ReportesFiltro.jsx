/*---------------------------------------------------------------------------------------*
* NOMBRE: ReportesFiltro.jsx
*
* DESCRIPCION: Barra de Reportes: selector del reporte, sus filtros (texto o lista),
* y los botones "Ver reporte", "Restaurar" y "Descargar Excel".
*
* ENTRADA:
*   reportes, reporteId, filtros, opciones   datos de la barra.
*   cargando, hayResultados                  para habilitar los botones.
*   onCambiarReporte(id), onCambiarFiltro(nombre, valor), onBuscar(), onRestaurar(), onExportar()
*
* SALIDA: La barra de filtros.
*
* OBJETIVO: Elegir un reporte y sus filtros.
*-----------------------------------------------------------------------------------------*/

import { Download, FileBarChart2, RotateCcw } from 'lucide-react';

const ID_LISTA_PROVEEDORES = 'reportes-lista-proveedores';

/* Convierte una lista de opciones en { valor, nombre } para el <select>. */
function opcionesDeFiltro(opciones, tipo) {
    if (tipo === 'aniosVentas' || tipo === 'aniosCompras') {
        return opciones[tipo].map(({ Anio }) => ({ valor: Anio, nombre: Anio }));
    }
    return (opciones[tipo] || []).map((opcion) => ({
        valor: tipo === 'meses' ? opcion.ID : opcion.Nombre,
        nombre: opcion.Nombre
    }));
}

/* Filtro de texto. El de proveedor sugiere los nombres de la lista. */
function FiltroTexto({ filtro, valor, opciones, onCambiar }) {
    const esProveedor = filtro.id === 'proveedor';
    return (
        <span className="reportes-filtro-texto-grupo">
            <input
                className="reportes-filtro-texto"
                aria-label={filtro.etiqueta}
                list={esProveedor ? ID_LISTA_PROVEEDORES : undefined}
                placeholder={esProveedor ? 'Proveedor (elija de la lista o escriba)' : `${filtro.etiqueta} (ej: Tailspin Toys)`}
                value={valor}
                onChange={(evento) => onCambiar(evento.target.value)}
            />
            {esProveedor && (
                <datalist id={ID_LISTA_PROVEEDORES}>
                    {opcionesDeFiltro(opciones, 'proveedores').map((opcion) => (
                        <option key={opcion.valor} value={opcion.nombre} />
                    ))}
                </datalist>
            )}
        </span>
    );
}

function ReportesFiltro({
    reportes, reporteId, filtros, opciones, cargando, hayResultados,
    onCambiarReporte, onCambiarFiltro, onBuscar, onRestaurar, onExportar
}) {
    const reporte = reportes.find((item) => item.id === reporteId);

    return (
        <form
            className="toolbar reportes-toolbar"
            onSubmit={(evento) => {
                evento.preventDefault();
                onBuscar();
            }}
        >
            <select aria-label="Tipo de reporte" value={reporteId} onChange={(evento) => onCambiarReporte(evento.target.value)}>
                {reportes.map((item) => (
                    <option key={item.id} value={item.id}>{item.grupo}: {item.titulo}</option>
                ))}
            </select>

            {reporte.filtros.map((filtro) => (
                filtro.tipo === 'texto' ? (
                    <FiltroTexto
                        key={filtro.id}
                        filtro={filtro}
                        valor={filtros[filtro.id] || ''}
                        opciones={opciones}
                        onCambiar={(valor) => onCambiarFiltro(filtro.id, valor)}
                    />
                ) : (
                    <select
                        key={filtro.id}
                        aria-label={filtro.etiqueta}
                        value={filtros[filtro.id] || ''}
                        onChange={(evento) => onCambiarFiltro(filtro.id, evento.target.value)}
                    >
                        <option value="">Todos: {filtro.etiqueta}</option>
                        {opcionesDeFiltro(opciones, filtro.tipo).map((opcion) => (
                            <option key={opcion.valor} value={opcion.valor}>{opcion.nombre}</option>
                        ))}
                    </select>
                )
            ))}

            <button className="btn-filtros" disabled={cargando} type="submit"
                    title="Muestra el reporte en esta pantalla con los filtros elegidos">
                <FileBarChart2 size={16} />
                Ver reporte
            </button>
            <button className="btn-restaurar" onClick={onRestaurar} type="button">
                <RotateCcw size={15} />
                Restaurar
            </button>
            <button className="btn-restaurar reportes-descargar" disabled={!hayResultados || cargando} onClick={onExportar} type="button">
                <Download size={15} />
                Descargar Excel
            </button>
        </form>
    );
}

export default ReportesFiltro;
