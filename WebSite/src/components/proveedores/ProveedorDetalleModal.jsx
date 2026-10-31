
import { useEffect, useState } from 'react';


import './proveedores.css';


function Fila({ etiqueta, children }) {
    return (
        <div className="prov-fila">
            <span className="prov-etiqueta">{etiqueta}</span>

            <span className="prov-valor">
                {children}
            </span>
        </div>
    );
}


// ============================================================
// MODAL PRINCIPAL
// ============================================================

function ProveedorDetalleModal({
    proveedores,
    onCerrar,
    onEditar,
    onVolver
}) {

    // Los hooks siempre van ANTES de cualquier "return" condicional.
    const [indiceActual, setIndiceActual] = useState(0);

    // Cuando llega una lista nueva, volvemos al primero.
    useEffect(() => {
        setIndiceActual(0);
    }, [proveedores]);

    // Si no hay proveedores, no mostramos el modal.
    if (!proveedores || proveedores.length === 0) {
        return null;
    }

    const anterior = () => {
        setIndiceActual((i) =>
            i === 0 ? proveedores.length - 1 : i - 1
        );
    };

    const siguiente = () => {
        setIndiceActual((i) =>
            i === proveedores.length - 1 ? 0 : i + 1
        );
    };

    const proveedorActual = proveedores[indiceActual];

    const varios = proveedores.length > 1;

    return (
        <div
            className="prov-overlay"
            onClick={onCerrar}
        >
            <div
                className="prov-modal"
                onClick={(e) => e.stopPropagation()}
            >

                <button
                    className="prov-cerrar"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                >
                    ✕
                </button>

                <div className="prov-carrusel">

                    
                    <TarjetaProveedor
                        key={
                            proveedorActual.SupplierID ??
                            indiceActual
                        }
                        proveedor={proveedorActual}
                        indice={indiceActual}
                        onEditar={onEditar}
                        onVolver={onVolver}
                    />

                    

                </div>

                {varios && (
                    <div className="prov-controles">

                        <button
                            type="button"
                            className="prov-control"
                            onClick={anterior}
                            aria-label="Proveedor anterior"
                        >
                            ←
                        </button>

                        <span className="prov-contador">
                            Proveedor {indiceActual + 1} de {proveedores.length}
                        </span>

                        <button
                            type="button"
                            className="prov-control"
                            onClick={siguiente}
                            aria-label="Proveedor siguiente"
                        >
                            →
                        </button>

                    </div>
                )}

            </div>
        </div>
    );
}


// ============================================================
// TARJETA DE PROVEEDOR
// ============================================================

function TarjetaProveedor({
    proveedor: p,
    indice,
    onEditar,
    onVolver
}) {

    // ---------- MAPA (OpenStreetMap) ----------

    const lat = Number(p.Latitud);
    const lng = Number(p.Longitud);

    const mapaUrl =
        p.Latitud &&
            p.Longitud &&
            !isNaN(lat) &&
            !isNaN(lng)
            ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&marker=${lat}%2C${lng}`
            : null;


    // ---------- MÉTODOS DE ENTREGA ----------

    const metodos = String(p.Metodo_Entrega || '')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
    // ---------- DIRECCIONES ----------

    const dirEntrega = [
        p.Direccion_Entrega1,
        p.Direccion_Entrega2
    ]
        .filter(Boolean)
        .join(' ');

    const dirPostal = [
        p.Direccion_Postal1,
        p.Direccion_Postal2
    ]
        .filter(Boolean)
        .join(' ');


    return (
        <section className="prov-tarjeta">

            {/* ================= ENCABEZADO ================= */}

            <header className="prov-encabezado">

                <div className="prov-avatar">
                    🚚
                </div>

                <div className="prov-titulo">

                    <h2>
                        {p.Nombre_Proveedor}
                    </h2>

                    <p>
                        Código: {p.Referencia_Proveedor || '-'}
                    </p>

                </div>

                {/* Espacio vacío para que el título quede centrado */}
                <div></div>

            </header>


            {/* ================= BOTONES ================= */}

            {(onVolver || onEditar) && (
                <div className="prov-acciones">

                    {onVolver && (
                        <button
                            className="prov-btn"
                            onClick={onVolver}
                        >
                            ← Volver a la lista
                        </button>
                    )}

                    {onEditar && (
                        <button
                            className="prov-btn prov-btn-azul"
                            onClick={() => onEditar(p)}
                        >
                            ✎ Editar
                        </button>
                    )}

                </div>
            )}


            {/* ============ DATOS BANCARIOS ============ */}

            <div className="prov-caja prov-caja-ambar">

                <div className="prov-caja-titulo ambar">

                    <span className="prov-ico ambar">
                        🏦
                    </span>

                    Datos bancarios

                </div>

                <div className="prov-pares">

                    <div className="prov-par">

                        <span>
                            Banco y sucursal
                        </span>

                        <strong>
                            {p.Sucursal_Cuenta_Bancaria || '-'}
                        </strong>

                    </div>

                    <div className="prov-par">

                        <span>
                            Titular de la cuenta
                        </span>

                        <strong>
                            {p.Nombre_Cuenta_Bancaria || '-'}
                        </strong>

                    </div>

                    <div className="prov-par">

                        <span>
                            Cuenta corriente
                        </span>

                        <strong>
                            {p.Numero_Cuenta_Bancaria || '-'}
                        </strong>

                    </div>

                </div>

            </div>


            {/* ============ CONTACTOS ============ */}

            <div className="prov-cajas">

                <div className="prov-caja">

                    <div className="prov-caja-titulo">

                        <span className="prov-ico verde">
                            👤
                        </span>

                        Contacto principal

                    </div>

                    <p className="prov-caja-nombre">
                        {p.Contacto_Primario || '-'}
                    </p>

                </div>


                <div className="prov-caja">

                    <div className="prov-caja-titulo">

                        <span className="prov-ico verde">
                            👤
                        </span>

                        Contacto alternativo

                    </div>

                    <p className="prov-caja-nombre">
                        {p.Contacto_Alternativo || '-'}
                    </p>

                </div>

            </div>


            {/* ============ INFORMACIÓN + DIRECCIONES + MAPA ============ */}

            <div className="prov-columnas">


                {/* ---------- INFORMACIÓN GENERAL ---------- */}

                <div className="prov-panel">

                    <h3 className="prov-panel-titulo">

                        <span className="prov-ico">
                            📋
                        </span>

                        Información general

                    </h3>


                    <Fila etiqueta="Código del proveedor">
                        {p.Referencia_Proveedor || '-'}
                    </Fila>


                    <Fila etiqueta="Categoría">
                        {p.Categoria || '-'}
                    </Fila>


                    <Fila etiqueta="Métodos de entrega">
                        <div className="prov-metodos">
                            {metodos.length ? (
                                metodos.map((metodo, indice) => (
                                    <span
                                        key={`${metodo}-${indice}`}
                                        className={
                                            indice % 2 === 0
                                                ? 'prov-chip prov-chip-azul'
                                                : 'prov-chip prov-chip-verde'
                                        }
                                    >
                                        {metodo}
                                    </span>
                                ))
                            ) : (
                                <span>-</span>
                            )}
                        </div>
                    </Fila>



                    <Fila etiqueta="Ciudad de entrega">
                        {p.Ciudad_Entrega || '-'}
                    </Fila>


                    <Fila etiqueta="Código postal de entrega">
                        {p.Codigo_Postal_Entrega || '-'}
                    </Fila>


                    <Fila etiqueta="Teléfono">
                        {p.Telefono || '-'}
                    </Fila>


                    <Fila etiqueta="Fax">
                        {p.Fax || '-'}
                    </Fila>


                    <Fila etiqueta="Días de gracia para pagar">

                        {p.Dias_De_Gracia != null
                            ? `${p.Dias_De_Gracia} días`
                            : '-'
                        }

                    </Fila>


                    <Fila etiqueta="Sitio web">

                        {p.Sitio_Web ? (

                            <a
                                href={p.Sitio_Web}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {p.Sitio_Web}
                            </a>

                        ) : (
                            '-'
                        )}

                    </Fila>

                </div>


                {/* ---------- COLUMNA DERECHA ---------- */}

                <div className="prov-derecha">

                    <div className="prov-panel">

                        <h3 className="prov-panel-titulo">

                            <span className="prov-ico">
                                📍
                            </span>

                            Direcciones

                        </h3>


                        <div className="prov-direccion">

                            <span className="prov-ico">
                                🚚
                            </span>

                            <div>

                                <strong>
                                    Dirección de entrega
                                </strong>

                                <p>
                                    {dirEntrega || '-'}
                                </p>

                            </div>

                        </div>


                        <div className="prov-direccion">

                            <span className="prov-ico">
                                ✉️
                            </span>

                            <div>

                                <strong>
                                    Dirección postal
                                </strong>

                                <p>
                                    {dirPostal || '-'}
                                </p>

                            </div>

                        </div>

                    </div>


                    {/* ---------- MAPA ---------- */}

                    {mapaUrl && (

                        <div className="prov-panel">

                            <h3 className="prov-panel-titulo">

                                <span className="prov-ico">
                                    📌
                                </span>

                                Ubicación en el mapa

                            </h3>

                            <iframe
                                className="prov-mapa"
                                title={`mapa-proveedor-${indice}`}
                                src={mapaUrl}
                                loading="lazy"
                            />

                        </div>

                    )}

                </div>

            </div>

        </section>
    );
}


export default ProveedorDetalleModal;
