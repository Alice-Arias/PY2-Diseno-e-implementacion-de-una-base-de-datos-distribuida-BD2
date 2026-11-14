/*---------------------------------------------------------------------------------------*
* NOMBRE: ProveedorDetalleModal.jsx
*
* DESCRIPCION: Ventana con el detalle de uno o varios proveedores (se pasa de uno a
* otro con las flechas). Los datos bancarios y de contacto llegan como "xxxx" hasta
* que el Corporativo autorice verlos (DatosProtegidos).
*
* ENTRADA: registros (lista de proveedores de SP_Proveedores_Detalle) y onCerrar.
*
* SALIDA: La ventana, o nada si no hay registros.
*
* OBJETIVO: Consultar toda la información de un proveedor.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { PiBankBold } from 'react-icons/pi';
import { FiUser } from 'react-icons/fi';
import { FaClipboardList, FaMapPin, FaTruck, FaRegAddressCard } from 'react-icons/fa';
import DatosProtegidos from '../common/DatosProtegidos';
import ControlesCarrusel from '../common/ControlesCarrusel';
import useCarrusel from '../../hooks/useCarrusel';
import { separarLista, unirPartes, urlMapa } from '../../utils/detalle';

function ProveedorDetalleModal({ registros, onCerrar }) {
    const carrusel = useCarrusel(registros);

    if (!registros || registros.length === 0) return null;

    return (
        <div className="prov-overlay" onClick={onCerrar}>
            <div className="prov-modal" onClick={(evento) => evento.stopPropagation()}>
                <button className="prov-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
                <div className="prov-carrusel">
                    <TarjetaProveedor
                        key={carrusel.actual.SupplierID ?? carrusel.indice}
                        proveedor={carrusel.actual}
                        indice={carrusel.indice}
                    />
                </div>
                <ControlesCarrusel carrusel={carrusel} nombre="Proveedor" prefijo="prov" />
            </div>
        </div>
    );
}

/* Fila "etiqueta: valor" de la información general. */
function Fila({ etiqueta, children }) {
    return (
        <div className="prov-fila">
            <span className="prov-etiqueta">{etiqueta}</span>
            <span className="prov-valor">{children}</span>
        </div>
    );
}

/* Par "etiqueta / valor" de los datos bancarios. */
function Par({ etiqueta, valor }) {
    return (
        <div className="prov-par">
            <span>{etiqueta}</span>
            <strong>{valor || '-'}</strong>
        </div>
    );
}

function CajaContacto({ titulo, nombre }) {
    return (
        <div className="prov-caja">
            <div className="prov-caja-titulo">
                <span className="prov-ico verde"><FiUser /></span>
                {titulo}
            </div>
            <p className="prov-caja-nombre">{nombre || '-'}</p>
        </div>
    );
}

function Direccion({ icono, titulo, texto }) {
    return (
        <div className="prov-direccion">
            <span className="prov-ico">{icono}</span>
            <div>
                <strong>{titulo}</strong>
                <p>{texto || '-'}</p>
            </div>
        </div>
    );
}

/*---------------------------------------------------------------------------------------*
* NOMBRE: TarjetaProveedor
* ENTRADA: proveedor (fila del detalle) e indice (para el título del mapa).
* DESCRIPCION: Si el Corporativo autoriza, los datos sensibles reemplazan los "xxxx".
*-----------------------------------------------------------------------------------------*/
function TarjetaProveedor({ proveedor: proveedorBase, indice }) {
    const [datosSensibles, setDatosSensibles] = useState(null);
    const proveedor = datosSensibles ? { ...proveedorBase, ...datosSensibles } : proveedorBase;

    const mapa = urlMapa(proveedor.Latitud, proveedor.Longitud);
    const metodos = separarLista(proveedor.Metodo_Entrega);

    return (
        <section className="prov-tarjeta">
            <header className="prov-encabezado">
                <div className="prov-avatar"><FaTruck /></div>
                <div className="prov-titulo">
                    <h2>{proveedor.Nombre_Proveedor}</h2>
                    <p>Código: {proveedor.Referencia_Proveedor || '-'}</p>
                </div>
                <div></div>
            </header>

            <DatosProtegidos tipo="proveedor" id={proveedorBase.SupplierID} onDatos={setDatosSensibles} />

            <div className="prov-caja prov-caja-ambar">
                <div className="prov-caja-titulo ambar">
                    <span className="prov-ico ambar"><PiBankBold /></span>
                    Datos bancarios
                </div>
                <div className="prov-pares">
                    <Par etiqueta="Banco y sucursal" valor={proveedor.Sucursal_Cuenta_Bancaria} />
                    <Par etiqueta="Titular de la cuenta" valor={proveedor.Nombre_Cuenta_Bancaria} />
                    <Par etiqueta="Cuenta corriente" valor={proveedor.Numero_Cuenta_Bancaria} />
                </div>
            </div>

            <div className="prov-cajas">
                <CajaContacto titulo="Contacto principal" nombre={proveedor.Contacto_Primario} />
                <CajaContacto titulo="Contacto alternativo" nombre={proveedor.Contacto_Alternativo} />
            </div>

            <div className="prov-columnas">
                <div className="prov-panel">
                    <h3 className="prov-panel-titulo">
                        <span className="prov-ico"><FaClipboardList /></span>
                        Información general
                    </h3>
                    <Fila etiqueta="Código del proveedor">{proveedor.Referencia_Proveedor || '-'}</Fila>
                    <Fila etiqueta="Categoría">{proveedor.Categoria || '-'}</Fila>
                    <Fila etiqueta="Métodos de entrega">
                        <div className="prov-metodos">
                            {metodos.length
                                ? metodos.map((metodo, posicion) => (
                                    <span key={`${metodo}-${posicion}`}
                                          className={posicion % 2 === 0 ? 'prov-chip prov-chip-azul' : 'prov-chip prov-chip-verde'}>
                                        {metodo}
                                    </span>
                                ))
                                : <span>-</span>}
                        </div>
                    </Fila>
                    <Fila etiqueta="Ciudad de entrega">{proveedor.Ciudad_Entrega || '-'}</Fila>
                    <Fila etiqueta="Código postal de entrega">{proveedor.Codigo_Postal_Entrega || '-'}</Fila>
                    <Fila etiqueta="Teléfono">{proveedor.Telefono || '-'}</Fila>
                    <Fila etiqueta="Fax">{proveedor.Fax || '-'}</Fila>
                    <Fila etiqueta="Días de gracia para pagar">
                        {proveedor.Dias_De_Gracia != null ? `${proveedor.Dias_De_Gracia} días` : '-'}
                    </Fila>
                    <Fila etiqueta="Sitio web">
                        {proveedor.Sitio_Web
                            ? <a href={proveedor.Sitio_Web} target="_blank" rel="noreferrer">{proveedor.Sitio_Web}</a>
                            : '-'}
                    </Fila>
                </div>

                <div className="prov-derecha">
                    <div className="prov-panel">
                        <h3 className="prov-panel-titulo">
                            <span className="prov-ico"><FaMapPin className="icono-rojo" /></span>
                            Direcciones
                        </h3>
                        <Direccion icono={<FaTruck />} titulo="Dirección de entrega"
                                   texto={unirPartes([proveedor.Direccion_Entrega1, proveedor.Direccion_Entrega2])} />
                        <Direccion icono={<FaRegAddressCard />} titulo="Dirección postal"
                                   texto={unirPartes([proveedor.Direccion_Postal1, proveedor.Direccion_Postal2])} />
                    </div>

                    {mapa && (
                        <div className="prov-panel">
                            <h3 className="prov-panel-titulo">
                                <span className="prov-ico">📌</span>
                                Ubicación en el mapa
                            </h3>
                            <iframe className="prov-mapa" title={`mapa-proveedor-${indice}`} src={mapa} loading="lazy" />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default ProveedorDetalleModal;
