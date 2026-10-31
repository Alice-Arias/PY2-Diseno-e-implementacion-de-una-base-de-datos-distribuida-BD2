// ============================================================
// MODAL CON EL DETALLE DE UNO O VARIOS PRODUCTOS
// ============================================================

import { useEffect, useState } from 'react';
import './inventario.css';


const valorOGuion = (valor) =>
    valor != null && valor !== '' ? valor : '-';


function Fila({ etiqueta, children }) {
    return (
        <div className="inv-fila">
            <span className="inv-etiqueta">{etiqueta}</span>
            <span className="inv-valor">{children}</span>
        </div>
    );
}

function Par({ etiqueta, children }) {
    return (
        <div className="inv-par">
            <span>{etiqueta}</span>
            <strong>{children}</strong>
        </div>
    );
}


function Dato({ color, icono, etiqueta, children }) {
    return (
        <div className={`inv-stat inv-stat-${color}`}>
            <span className="inv-stat-icono">{icono}</span>

            <div className="inv-stat-texto">
                <span className="inv-stat-etiqueta">{etiqueta}</span>
                <strong className="inv-stat-valor">{children}</strong>
            </div>
        </div>
    );
}


function InventarioDetalleModal({
    inventarios,
    onCerrar,
    onEditar,
    onVolver
}) {

    const [indiceActual, setIndiceActual] = useState(0);

    useEffect(() => {
        setIndiceActual(0);
    }, [inventarios]);

    useEffect(() => {
        const alPresionar = (e) => {
            if (e.key === 'Escape') onCerrar();
        };

        window.addEventListener('keydown', alPresionar);

        return () =>
            window.removeEventListener('keydown', alPresionar);
    }, [onCerrar]);

    if (!inventarios || inventarios.length === 0) {
        return null;
    }

    const anterior = () => {
        setIndiceActual((i) =>
            i === 0 ? inventarios.length - 1 : i - 1
        );
    };

    const siguiente = () => {
        setIndiceActual((i) =>
            i === inventarios.length - 1 ? 0 : i + 1
        );
    };

    const inventarioActual = inventarios[indiceActual];

    const varios = inventarios.length > 1;

    return (
        <div
            className="inv-overlay"
            onClick={onCerrar}
        >

            <div
                className="inv-modal"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >

                <button
                    type="button"
                    className="inv-cerrar"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                >
                    ✕
                </button>

                <TarjetaInventario
                    key={inventarioActual.StockItemID ?? indiceActual}
                    inventario={inventarioActual}
                    onEditar={onEditar}
                    onVolver={onVolver}
                />

                {varios && (

                    <div className="inv-controles">

                        <button
                            type="button"
                            className="inv-control"
                            onClick={anterior}
                            aria-label="Producto anterior"
                        >
                            ←
                        </button>

                        <span className="inv-contador">
                            Producto {indiceActual + 1} de {inventarios.length}
                        </span>

                        <button
                            type="button"
                            className="inv-control"
                            onClick={siguiente}
                            aria-label="Producto siguiente"
                        >
                            →
                        </button>

                    </div>

                )}

            </div>

        </div>
    );
}



function TarjetaInventario({
    inventario: p,
    onEditar,
    onVolver
}) {

    return (

        <section className="inv-tarjeta">


            <header className="inv-encabezado">

                <div className="inv-avatar">📦</div>

                <div className="inv-titulo">
                    <h2>{p.Producto || '-'}</h2>
                    <p>Código: {p.StockItemID || '-'}</p>
                </div>

                {(onVolver || onEditar) && (

                    <div className="inv-acciones">

                        {onVolver && (
                            <button
                                type="button"
                                className="inv-btn"
                                onClick={onVolver}
                            >
                                ← Volver a la lista
                            </button>
                        )}

                        {onEditar && (
                            <button
                                type="button"
                                className="inv-btn inv-btn-azul"
                                onClick={() => onEditar(p)}
                            >
                                ✎ Editar
                            </button>
                        )}

                    </div>

                )}

            </header>


            <div className="inv-stats">

                <Dato color="verde" icono="📦" etiqueta="Cantidad disponible">
                    {valorOGuion(p.Cantidad_Disponible)}
                </Dato>

                <Dato color="azul" icono="📍" etiqueta="Ubicación">
                    {valorOGuion(p.Ubicacion)}
                </Dato>

                <Dato color="morado" icono="⚖️" etiqueta="Peso por unidad">
                    {valorOGuion(p.Peso)}
                </Dato>

            </div>


            <div className="inv-paneles">

                <div className="inv-panel">

                    <h3 className="inv-panel-titulo">
                        <span className="inv-ico">📋</span>
                        Información general
                    </h3>

                    <div className="inv-pares">

                        <Par etiqueta="Proveedor">
                            {valorOGuion(p.Proveedor)}
                        </Par>

                        <Par etiqueta="Marca">
                            {valorOGuion(p.Marca)}
                        </Par>

                        <Par etiqueta="Color">
                            {valorOGuion(p.Color || p.ColorName)}
                        </Par>

                        <Par etiqueta="Talla / tamaño">
                            {valorOGuion(p.Talla)}
                        </Par>

                        <Par etiqueta="Unidad de empaquetamiento">
                            {valorOGuion(p.Unidad_Empaquetamiento)}
                        </Par>

                        <Par etiqueta="Empaquetamiento exterior">
                            {valorOGuion(p.Empaquetamiento)}
                        </Par>

                        <Par etiqueta="Cantidad por empaquetamiento">
                            {valorOGuion(p.Cantidad_Empaquetamiento)}
                        </Par>

                        <Par etiqueta="Palabras clave">
                            {valorOGuion(p.Palabras_Clave)}
                        </Par>

                    </div>

                </div>


                <div className="inv-panel">

                    <h3 className="inv-panel-titulo">
                        <span className="inv-ico ambar">💰</span>
                        Precios e impuestos
                    </h3>

                    <Fila etiqueta="Impuesto">
                        {valorOGuion(p.Impuesto)}
                    </Fila>

                    <Fila etiqueta="Precio unitario">
                        {valorOGuion(p.Precio_Unitario)}
                    </Fila>

                    <Fila etiqueta="Precio de venta recomendado">
                        {valorOGuion(p.Precio_Venta)}
                    </Fila>

                </div>

            </div>

        </section>
    );
}


export default InventarioDetalleModal;