/*---------------------------------------------------------------------------------------*
* NOMBRE: InventarioDetalleModal.jsx
*
* DESCRIPCION: Ventana con el detalle de uno o varios productos (se pasa de uno a otro
* con las flechas). Se cierra con la tecla Escape.
*
* ENTRADA: registros (lista de productos de SP_Inventarios_Detalle) y onCerrar.
*
* SALIDA: La ventana, o nada si no hay registros.
*
* OBJETIVO: Consultar toda la información de un producto.
*-----------------------------------------------------------------------------------------*/

import { useEffect } from 'react';
import { FaBoxOpen, FaClipboardList, FaMapPin, FaBalanceScale, FaBox, FaCoins } from 'react-icons/fa';
import ControlesCarrusel from '../common/ControlesCarrusel';
import useCarrusel from '../../hooks/useCarrusel';
import { valorOGuion } from '../../utils/detalle';

function InventarioDetalleModal({ registros, onCerrar }) {
    const carrusel = useCarrusel(registros);

    /* Escape cierra la ventana. */
    useEffect(() => {
        const alPresionarTecla = (evento) => {
            if (evento.key === 'Escape') onCerrar();
        };
        window.addEventListener('keydown', alPresionarTecla);
        return () => window.removeEventListener('keydown', alPresionarTecla);
    }, [onCerrar]);

    if (!registros || registros.length === 0) return null;

    return (
        <div className="inv-overlay" onClick={onCerrar}>
            <div className="inv-modal" role="dialog" aria-modal="true" onClick={(evento) => evento.stopPropagation()}>
                <button type="button" className="inv-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
                <TarjetaProducto key={carrusel.actual.StockItemID ?? carrusel.indice} producto={carrusel.actual} />
                <ControlesCarrusel carrusel={carrusel} nombre="Producto" prefijo="inv" />
            </div>
        </div>
    );
}

/* Fila "etiqueta: valor" de precios. */
function Fila({ etiqueta, valor }) {
    return (
        <div className="inv-fila">
            <span className="inv-etiqueta">{etiqueta}</span>
            <span className="inv-valor">{valorOGuion(valor)}</span>
        </div>
    );
}

/* Par "etiqueta / valor" de la información general. */
function Par({ etiqueta, valor }) {
    return (
        <div className="inv-par">
            <span>{etiqueta}</span>
            <strong>{valorOGuion(valor)}</strong>
        </div>
    );
}

/* Dato destacado (cantidad, ubicación, peso). */
function Dato({ color, icono, etiqueta, valor }) {
    return (
        <div className={`inv-stat inv-stat-${color}`}>
            <span className="inv-stat-icono">{icono}</span>
            <div className="inv-stat-texto">
                <span className="inv-stat-etiqueta">{etiqueta}</span>
                <strong className="inv-stat-valor">{valorOGuion(valor)}</strong>
            </div>
        </div>
    );
}

function TarjetaProducto({ producto }) {
    return (
        <section className="inv-tarjeta">
            <header className="inv-encabezado">
                <div className="inv-avatar"><FaBox /></div>
                <div className="inv-titulo">
                    <h2>{producto.Producto || '-'}</h2>
                    <p>Código: {producto.StockItemID || '-'}</p>
                </div>
            </header>

            <div className="inv-stats">
                <Dato color="verde" icono={<FaBoxOpen />} etiqueta="Cantidad disponible" valor={producto.Cantidad_Disponible} />
                <Dato color="azul" icono={<FaMapPin />} etiqueta="Ubicación" valor={producto.Ubicacion} />
                <Dato color="morado" icono={<FaBalanceScale />} etiqueta="Peso por unidad" valor={producto.Peso} />
            </div>

            <div className="inv-paneles">
                <div className="inv-panel">
                    <h3 className="inv-panel-titulo">
                        <span className="inv-ico"><FaClipboardList /></span>
                        Información general
                    </h3>
                    <div className="inv-pares">
                        <Par etiqueta="Proveedor" valor={producto.Proveedor} />
                        <Par etiqueta="Marca" valor={producto.Marca} />
                        <Par etiqueta="Color" valor={producto.Color || producto.ColorName} />
                        <Par etiqueta="Talla / tamaño" valor={producto.Talla} />
                        <Par etiqueta="Unidad de empaquetamiento" valor={producto.Unidad_Empaquetamiento} />
                        <Par etiqueta="Empaquetamiento exterior" valor={producto.Empaquetamiento} />
                        <Par etiqueta="Cantidad por empaquetamiento" valor={producto.Cantidad_Empaquetamiento} />
                        <Par etiqueta="Palabras clave" valor={producto.Palabras_Clave} />
                    </div>
                </div>
                <div className="inv-panel">
                    <h3 className="inv-panel-titulo">
                        <span className="inv-ico ambar"><FaCoins /></span>
                        Precios e impuestos
                    </h3>
                    <Fila etiqueta="Impuesto" valor={producto.Impuesto} />
                    <Fila etiqueta="Precio unitario" valor={producto.Precio_Unitario} />
                    <Fila etiqueta="Precio de venta recomendado" valor={producto.Precio_Venta} />
                </div>
            </div>
        </section>
    );
}

export default InventarioDetalleModal;
