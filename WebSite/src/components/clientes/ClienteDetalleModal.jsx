/*---------------------------------------------------------------------------------------*
* NOMBRE: ClienteDetalleModal.jsx
*
* DESCRIPCION: Ventana con el detalle de uno o varios clientes (se pasa de uno a otro
* con las flechas). Los datos de contacto llegan como "xxxx" hasta que el Corporativo
* autorice verlos (DatosProtegidos).
*
* ENTRADA: registros (lista de clientes de SP_Clientes_Detalle) y onCerrar.
*
* SALIDA: La ventana, o nada si no hay registros.
*
* OBJETIVO: Consultar toda la información de un cliente.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { FiUser } from 'react-icons/fi';
import { BsEnvelopePaperFill } from 'react-icons/bs';
import { FaClipboardList, FaMapPin, FaTruck, FaRegAddressCard } from 'react-icons/fa';
import DatosProtegidos from '../common/DatosProtegidos';
import ControlesCarrusel from '../common/ControlesCarrusel';
import useCarrusel from '../../hooks/useCarrusel';
import { separarLista, unirPartes, urlMapa } from '../../utils/detalle';

function ClienteDetalleModal({ registros, onCerrar }) {
    const carrusel = useCarrusel(registros);

    if (!registros || registros.length === 0) return null;

    const hayVarios = carrusel.total > 1;

    return (
        <div className="modal-fondo" onClick={onCerrar}>
            <div className="modal-contenido" onClick={(evento) => evento.stopPropagation()}>
                <button className="cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>

                <div className="cd-carrusel">
                    {hayVarios && (
                        <button type="button" className="cd-flecha cd-flecha-izquierda" onClick={carrusel.anterior}
                                aria-label="Cliente anterior" title="Cliente anterior">‹</button>
                    )}

                    <TarjetaCliente
                        key={carrusel.actual.CustomerID ?? carrusel.indice}
                        cliente={carrusel.actual}
                        indice={carrusel.indice}
                    />

                    {hayVarios && (
                        <button type="button" className="cd-flecha cd-flecha-derecha" onClick={carrusel.siguiente}
                                aria-label="Cliente siguiente" title="Cliente siguiente">›</button>
                    )}
                </div>

                <ControlesCarrusel carrusel={carrusel} nombre="Cliente" prefijo="cd" claseContenedor="cd-carrusel-controles" />
            </div>
        </div>
    );
}

/* Caja de un contacto: nombre, teléfono y correo. */
function CajaContacto({ titulo, nombre, telefono, correo }) {
    return (
        <div className="cd-caja">
            <div className="cd-caja-titulo">
                <span className="cd-ico verde"><FiUser /></span>
                {titulo}
            </div>
            <p className="cd-nombre">{nombre || '-'}</p>
            {telefono && <p className="cd-linea">📞 {telefono}</p>}
            {correo && <p className="cd-linea">✉️ {correo}</p>}
        </div>
    );
}

/* Dirección con su ícono. */
function Direccion({ icono, titulo, texto }) {
    return (
        <div className="cd-direccion">
            <span className="cd-ico azul">{icono}</span>
            <div>
                <strong>{titulo}</strong>
                <p>{texto || '-'}</p>
            </div>
        </div>
    );
}

/*---------------------------------------------------------------------------------------*
* NOMBRE: TarjetaCliente
* ENTRADA: cliente (fila del detalle) e indice (para el título del mapa).
* DESCRIPCION: Si el Corporativo autoriza, los datos sensibles reemplazan los "xxxx".
*-----------------------------------------------------------------------------------------*/
function TarjetaCliente({ cliente: clienteBase, indice }) {
    const [datosSensibles, setDatosSensibles] = useState(null);
    const cliente = datosSensibles ? { ...clienteBase, ...datosSensibles } : clienteBase;

    const mapa = urlMapa(cliente.Latitud, cliente.Longitud);
    const metodos = separarLista(cliente.Metodo_Entrega, /[,/;]/);
    const activo = cliente.Estado ? String(cliente.Estado).toLowerCase() === 'activo' : null;

    return (
        <section className="cd-cliente">
            <header className="cd-encabezado">
                <div className="cd-avatar"><FiUser /></div>
                <div className="cd-titulo">
                    <h2>{cliente.Nombre_Cliente}</h2>
                    {cliente.Estado && (
                        <span className={`cd-estado ${activo ? '' : 'inactivo'}`}>{cliente.Estado}</span>
                    )}
                    <p className="cd-subtitulo">{unirPartes([cliente.Categoria, cliente.Grupo_Compra], ' · ')}</p>
                </div>
                <div className="cd-acciones"></div>
            </header>

            <DatosProtegidos tipo="cliente" id={clienteBase.CustomerID} onDatos={setDatosSensibles} />

            <div className="cd-contactos">
                <CajaContacto titulo="Contacto principal" nombre={cliente.Contacto_Primario}
                              telefono={cliente.Telefono_Primario} correo={cliente.Email_Primario} />
                <CajaContacto titulo="Contacto alternativo" nombre={cliente.Contacto_Alternativo}
                              telefono={cliente.Telefono_Alternativo} correo={cliente.Email_Alternativo} />

                <div className="cd-caja cd-caja-ambar">
                    <div className="cd-caja-titulo ambar">
                        <span className="cd-ico ambar"><BsEnvelopePaperFill /></span>
                        Cliente por facturar
                    </div>
                    <p className="cd-nombre">{cliente.Cliente_Por_Facturar || '-'}</p>
                    {cliente.Razon_Social_Facturar && <p className="cd-linea chica">{cliente.Razon_Social_Facturar}</p>}
                </div>
            </div>

            <div className="cd-columnas">
                <div className="cd-panel">
                    <h3 className="cd-panel-titulo">
                        <span className="cd-ico azul"><FaClipboardList /></span>
                        Información general
                    </h3>
                    <dl className="cd-datos">
                        <dt>Categoría</dt>
                        <dd>{cliente.Categoria || '-'}</dd>
                        <dt>Grupo de compra</dt>
                        <dd>{cliente.Grupo_Compra || '-'}</dd>
                        <dt>Métodos de entrega</dt>
                        <dd>
                            {metodos.length
                                ? metodos.map((metodo, posicion) => (
                                    <span key={`${metodo}-${posicion}`} className={`chip ${posicion % 2 === 0 ? 'chip-verde' : 'chip-azul'}`}>
                                        {metodo}
                                    </span>
                                ))
                                : '-'}
                        </dd>
                        <dt>Ciudad de entrega</dt>
                        <dd>{cliente.Ciudad_Entrega || '-'}</dd>
                        <dt>Código postal</dt>
                        <dd>{cliente.Codigo_Postal || '-'}</dd>
                        <dt>Teléfono</dt>
                        <dd>{cliente.Telefono || '-'}</dd>
                        <dt>Fax</dt>
                        <dd>{cliente.Fax || '-'}</dd>
                        <dt>Días de gracia para pagar</dt>
                        <dd>{cliente.Dias_De_Gracia != null ? `${cliente.Dias_De_Gracia} días` : '-'}</dd>
                        <dt>Sitio web</dt>
                        <dd>
                            {cliente.Sitio_Web
                                ? <a href={cliente.Sitio_Web} target="_blank" rel="noreferrer">{cliente.Sitio_Web}</a>
                                : '-'}
                        </dd>
                    </dl>
                </div>

                <div className="cd-derecha">
                    <div className="cd-panel">
                        <h3 className="cd-panel-titulo">
                            <span className="cd-ico azul"><FaMapPin className="icono-rojo" /></span>
                            Direcciones
                        </h3>
                        <Direccion icono={<FaTruck />} titulo="Dirección de entrega"
                                   texto={unirPartes([cliente.Direccion_Entrega1, cliente.Direccion_Entrega2])} />
                        <Direccion icono={<FaRegAddressCard />} titulo="Dirección postal"
                                   texto={unirPartes([cliente.Direccion_Postal1, cliente.Direccion_Postal2])} />
                    </div>

                    {mapa && (
                        <div className="cd-panel">
                            <h3 className="cd-panel-titulo">
                                <span className="cd-ico azul">📌</span>
                                Ubicación en el mapa
                            </h3>
                            <iframe className="cd-mapa" title={`mapa-cliente-${indice}`} src={mapa} loading="lazy" />
                        </div>
                    )}
                </div>
            </div>

            {cliente.Notas && (
                <div className="cd-panel cd-notas">
                    <h3 className="cd-panel-titulo">
                        <span className="cd-ico ambar">📝</span>
                        Notas
                    </h3>
                    <p>{cliente.Notas}</p>
                </div>
            )}
        </section>
    );
}

export default ClienteDetalleModal;
