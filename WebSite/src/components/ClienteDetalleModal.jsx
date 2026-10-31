
import { useEffect, useState } from 'react';

// ============================================================
// MODAL PRINCIPAL
// ============================================================

function ClienteDetalleModal({
    clientes,
    onCerrar,
    onEditar,
    onVolver
}) {

    // Si no hay clientes, no mostramos el modal.
    if (!clientes || clientes.length === 0) {
        return null;
    }

    // ========================================================
    // CLIENTE ACTUAL
    // ========================================================

    const [indiceActual, setIndiceActual] = useState(0);

    // ========================================================
    // REINICIAR EL CARRUSEL
    // ========================================================

    useEffect(() => {

        setIndiceActual(0);

    }, [clientes]);

    // ========================================================
    // IR AL CLIENTE ANTERIOR
    // ========================================================

    const clienteAnterior = () => {

        setIndiceActual((indice) => {

            if (indice === 0) {

                return clientes.length - 1;

            }

            return indice - 1;

        });

    };

    // ========================================================
    // IR AL CLIENTE SIGUIENTE
    // ========================================================

    const clienteSiguiente = () => {

        setIndiceActual((indice) => {

            if (indice === clientes.length - 1) {

                return 0;

            }

            return indice + 1;

        });

    };

    // ========================================================
    // CLIENTE QUE SE ESTÁ MOSTRANDO
    // ========================================================

    const clienteActual = clientes[indiceActual];

    return (

        <div
            className="modal-fondo"
            onClick={onCerrar}
        >

            <div
                className="modal-contenido"
                onClick={(e) => e.stopPropagation()}
            >

                {/* ==================================================
                    BOTÓN CERRAR
                ================================================== */}

                <button
                    className="cerrar"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                >
                    ✕
                </button>

                {/* ==================================================
                    CONTENEDOR DEL CARRUSEL
                ================================================== */}

                <div className="cd-carrusel">

                    {/* ==================================================
                        FLECHA IZQUIERDA
                    ================================================== */}

                    {clientes.length > 1 && (

                        <button
                            type="button"
                            className="cd-flecha cd-flecha-izquierda"
                            onClick={clienteAnterior}
                            aria-label="Cliente anterior"
                            title="Cliente anterior"
                        >
                            ‹
                        </button>

                    )}

                    {/* ==================================================
                        CLIENTE ACTUAL
                    ================================================== */}

                    <TarjetaCliente
                        key={
                            clienteActual.CustomerID ??
                            indiceActual
                        }
                        cliente={clienteActual}
                        indice={indiceActual}
                        ultimo={true}
                        onEditar={onEditar}
                        onVolver={onVolver}
                    />

                    {/* ==================================================
                        FLECHA DERECHA
                    ================================================== */}

                    {clientes.length > 1 && (

                        <button
                            type="button"
                            className="cd-flecha cd-flecha-derecha"
                            onClick={clienteSiguiente}
                            aria-label="Cliente siguiente"
                            title="Cliente siguiente"
                        >
                            ›
                        </button>

                    )}

                </div>

                {/* ==================================================
                    INDICADOR DEL CARRUSEL
                ================================================== */}

                {clientes.length > 1 && (

                    <div className="cd-carrusel-controles">

                        <button
                            type="button"
                            className="cd-control"
                            onClick={clienteAnterior}
                            aria-label="Cliente anterior"
                        >
                            ←
                        </button>

                        <span className="cd-contador">

                            Cliente {indiceActual + 1} de {clientes.length}

                        </span>

                        <button
                            type="button"
                            className="cd-control"
                            onClick={clienteSiguiente}
                            aria-label="Cliente siguiente"
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
// TARJETA DE CLIENTE
// ============================================================

function TarjetaCliente({
    cliente: c,
    indice,
    ultimo,
    onEditar,
    onVolver
}) {

    // ========================================================
    // MAPA
    // ========================================================

    const lat = Number(c.Latitud);
    const lng = Number(c.Longitud);

    const mapaUrl =
        c.Latitud &&
        c.Longitud &&
        !isNaN(lat) &&
        !isNaN(lng)
            ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&marker=${lat}%2C${lng}`
            : null;

    // ========================================================
    // MÉTODOS DE ENTREGA
    // ========================================================

    const metodos = String(
        c.Metodo_Entrega || ''
    )
        .split(/[,/;]/)
        .map((m) => m.trim())
        .filter(Boolean);

    // ========================================================
    // ESTADO DEL CLIENTE
    // ========================================================

    const activo = c.Estado
        ? String(c.Estado).toLowerCase() === 'activo'
        : null;

    // ========================================================
    // DIRECCIONES
    // ========================================================

    const dirEntrega = [
        c.Direccion_Entrega1,
        c.Direccion_Entrega2
    ]
        .filter(Boolean)
        .join(' ');

    const dirPostal = [
        c.Direccion_Postal1,
        c.Direccion_Postal2
    ]
        .filter(Boolean)
        .join(' ');

    return (

        <section
            className={`cd-cliente ${
                ultimo ? '' : 'cd-separador'
            }`}
        >

            {/* ==================================================
                ENCABEZADO
            ================================================== */}

            <header className="cd-encabezado">

                <div className="cd-avatar">
                    👤
                </div>

                <div className="cd-titulo">

                    <h2>
                        {c.Nombre_Cliente}
                    </h2>

                    {c.Estado && (

                        <span
                            className={`cd-estado ${
                                activo
                                    ? ''
                                    : 'inactivo'
                            }`}
                        >
                            {c.Estado}
                        </span>

                    )}

                    <p className="cd-subtitulo">

                        {[
                            c.Categoria,
                            c.Grupo_Compra
                        ]
                            .filter(Boolean)
                            .join(' · ')}

                    </p>

                </div>

                <div className="cd-acciones">

                    {onVolver && (

                        <button
                            className="btn btn-claro"
                            onClick={onVolver}
                        >
                            ← Volver a la lista
                        </button>

                    )}

                    {onEditar && (

                        <button
                            className="btn btn-azul"
                            onClick={() => onEditar(c)}
                        >
                            ✎ Editar
                        </button>

                    )}

                </div>

            </header>

            {/* ==================================================
                CONTACTOS
            ================================================== */}

            <div className="cd-contactos">

                {/* CONTACTO PRINCIPAL */}

                <div className="cd-caja">

                    <div className="cd-caja-titulo">

                        <span className="cd-ico verde">
                            👤
                        </span>

                        Contacto principal

                    </div>

                    <p className="cd-nombre">
                        {c.Contacto_Primario || '-'}
                    </p>

                    {c.Telefono_Primario && (

                        <p className="cd-linea">
                            📞 {c.Telefono_Primario}
                        </p>

                    )}

                    {c.Email_Primario && (

                        <p className="cd-linea">
                            ✉️ {c.Email_Primario}
                        </p>

                    )}

                </div>

                {/* CONTACTO ALTERNATIVO */}

                <div className="cd-caja">

                    <div className="cd-caja-titulo">

                        <span className="cd-ico verde">
                            👤
                        </span>

                        Contacto alternativo

                    </div>

                    <p className="cd-nombre">
                        {c.Contacto_Alternativo || '-'}
                    </p>

                    {c.Telefono_Alternativo && (

                        <p className="cd-linea">
                            📞 {c.Telefono_Alternativo}
                        </p>

                    )}

                    {c.Email_Alternativo && (

                        <p className="cd-linea">
                            ✉️ {c.Email_Alternativo}
                        </p>

                    )}

                </div>

                {/* CLIENTE POR FACTURAR */}

                <div className="cd-caja cd-caja-ambar">

                    <div className="cd-caja-titulo ambar">

                        <span className="cd-ico ambar">
                            📄
                        </span>

                        Cliente por facturar

                    </div>

                    <p className="cd-nombre">
                        {c.Cliente_Por_Facturar || '-'}
                    </p>

                    {c.Razon_Social_Facturar && (

                        <p className="cd-linea chica">
                            {c.Razon_Social_Facturar}
                        </p>

                    )}

                </div>

            </div>

            {/* ==================================================
                INFORMACIÓN GENERAL + DIRECCIONES
            ================================================== */}

            <div className="cd-columnas">

                {/* INFORMACIÓN GENERAL */}

                <div className="cd-panel">

                    <h3 className="cd-panel-titulo">

                        <span className="cd-ico azul">
                            📋
                        </span>

                        Información general

                    </h3>

                    <dl className="cd-datos">

                        <dt>
                            Categoría
                        </dt>

                        <dd>
                            {c.Categoria || '-'}
                        </dd>

                        <dt>
                            Grupo de compra
                        </dt>

                        <dd>
                            {c.Grupo_Compra || '-'}
                        </dd>

                        <dt>
                            Métodos de entrega
                        </dt>

                        <dd>

                            {metodos.length ? (

                                metodos.map((m, i) => (

                                    <span
                                        key={`${m}-${i}`}
                                        className={`chip ${
                                            i % 2 === 0
                                                ? 'chip-verde'
                                                : 'chip-azul'
                                        }`}
                                    >
                                        {m}
                                    </span>

                                ))

                            ) : (

                                '-'

                            )}

                        </dd>

                        <dt>
                            Ciudad de entrega
                        </dt>

                        <dd>
                            {c.Ciudad_Entrega || '-'}
                        </dd>

                        <dt>
                            Código postal
                        </dt>

                        <dd>
                            {c.Codigo_Postal || '-'}
                        </dd>

                        <dt>
                            Teléfono
                        </dt>

                        <dd>
                            {c.Telefono || '-'}
                        </dd>

                        <dt>
                            Fax
                        </dt>

                        <dd>
                            {c.Fax || '-'}
                        </dd>

                        <dt>
                            Días de gracia para pagar
                        </dt>

                        <dd>
                            {c.Dias_De_Gracia != null
                                ? `${c.Dias_De_Gracia} días`
                                : '-'}
                        </dd>

                        <dt>
                            Sitio web
                        </dt>

                        <dd>

                            {c.Sitio_Web ? (

                                <a
                                    href={c.Sitio_Web}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {c.Sitio_Web}
                                </a>

                            ) : (

                                '-'

                            )}

                        </dd>

                    </dl>

                </div>

                {/* COLUMNA DERECHA */}

                <div className="cd-derecha">

                    {/* DIRECCIONES */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico azul">
                                📍
                            </span>

                            Direcciones

                        </h3>

                        <div className="cd-direccion">

                            <span className="cd-ico azul">
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

                        <div className="cd-direccion">

                            <span className="cd-ico azul">
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

                    {/* MAPA */}

                    {mapaUrl && (

                        <div className="cd-panel">

                            <h3 className="cd-panel-titulo">

                                <span className="cd-ico azul">
                                    📌
                                </span>

                                Ubicación en el mapa

                            </h3>

                            <iframe
                                className="cd-mapa"
                                title={`mapa-cliente-${indice}`}
                                src={mapaUrl}
                                loading="lazy"
                            />

                        </div>

                    )}

                </div>

            </div>

            {/* ==================================================
                NOTAS
            ================================================== */}

            {c.Notas && (

                <div className="cd-panel cd-notas">

                    <h3 className="cd-panel-titulo">

                        <span className="cd-ico ambar">
                            📝
                        </span>

                        Notas

                    </h3>

                    <p>
                        {c.Notas}
                    </p>

                </div>

            )}

        </section>

    );
}

export default ClienteDetalleModal;
