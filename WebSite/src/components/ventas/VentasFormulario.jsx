/*---------------------------------------------------------------------------------------*
* NOMBRE: VentasFormulario.jsx
*
* DESCRIPCION: Campos del formulario de ventas, en secciones: cliente y facturación,
* entrega y contacto, fecha y nota de crédito, totales y comentarios, y producto(s).
*   Al CREAR hay un solo producto (sus campos están en el mismo formulario).
*   Al MODIFICAR se muestra un bloque por cada línea de la factura (prop "lineas").
*
* ENTRADA:
*   formulario, onCambiar(evento)     encabezado (y el producto al crear).
*   opciones, cargandoOpciones        listas de los selectores.
*   idVenta                           número de factura (solo al modificar).
*   lineas, onCambiarLinea(posicion, evento)  líneas de la factura (solo al modificar).
*
* SALIDA: Los campos del formulario.
*
* OBJETIVO: Un solo formulario para crear y para modificar ventas.
*-----------------------------------------------------------------------------------------*/

import { FileText, Truck, Calendar, Package, AlertTriangle } from 'lucide-react';
import { LeyendaObligatorios, CampoEntrada, CampoSelector, CampoArea } from '../common/CamposFormulario';

function Seccion({ icono: Icono, color, titulo, children }) {
    return (
        <div className="cd-panel">
            <h3 className="cd-panel-titulo">
                <span className={`cd-ico ${color}`}><Icono size={18} /></span>
                {titulo}
            </h3>
            {children}
        </div>
    );
}

/*---------------------------------------------------------------------------------------*
* NOMBRE: CamposProducto
* ENTRADA: valores de la línea, onCambiar(evento), opciones, cargando y bloquearProducto
*          (al modificar no se puede cambiar el producto de una línea).
* SALIDA: Campos de una línea: producto, descripción, empaque, cantidad, precio e impuesto.
*-----------------------------------------------------------------------------------------*/
function CamposProducto({ valores, onCambiar, opciones, cargando, bloquearProducto = false }) {
    const campo = (nombre) => ({ nombre, valor: valores[nombre], onCambiar });

    return (
        <div className="form-grid">
            <CampoSelector {...campo('StockItemID')} etiqueta="Producto" lista={opciones.productos} requerido
                           cargando={cargando} bloqueado={bloquearProducto} textoVacio="Seleccione un producto" />
            <CampoEntrada {...campo('Description')} etiqueta="Descripción de la línea" max={100} requerido completo
                          placeholder="Descripción que aparece en la factura" />
            <CampoSelector {...campo('PackageTypeID')} etiqueta="Tipo de empaque" lista={opciones.tiposPaquete} requerido
                           cargando={cargando} textoVacio="Seleccione un tipo de empaque" />
            <CampoEntrada {...campo('Quantity')} etiqueta="Cantidad" tipo="number" requerido min={1} />
            <CampoEntrada {...campo('UnitPrice')} etiqueta="Precio unitario (USD)" tipo="number" min={0} placeholder="0.00" step="0.01" />
            <CampoEntrada {...campo('TaxRate')} etiqueta="Impuesto (%)" tipo="number" requerido min={0} max={100} />
        </div>
    );
}

/* Bloques de producto al modificar: uno por línea de la factura. */
function LineasFactura({ lineas, onCambiarLinea, opciones, cargando }) {
    if (lineas.length === 0) {
        return (
            <Seccion icono={Package} color="verde" titulo="Productos">
                <p>Esta factura no contiene líneas de productos.</p>
            </Seccion>
        );
    }

    return lineas.map((linea, posicion) => (
        <Seccion key={linea.StockItemID || posicion} icono={Package} color="verde" titulo={`Producto ${posicion + 1}`}>
            <CamposProducto
                valores={linea}
                onCambiar={(evento) => onCambiarLinea(posicion, evento)}
                opciones={opciones}
                cargando={cargando}
                bloquearProducto
            />
        </Seccion>
    ));
}

function VentasFormulario({ formulario, onCambiar, opciones, cargandoOpciones, idVenta, lineas = null, onCambiarLinea }) {
    const campo = (nombre) => ({ nombre, valor: formulario[nombre], onCambiar });
    const selector = (nombre) => ({ ...campo(nombre), cargando: cargandoOpciones });

    return (
        <>
            <Seccion icono={FileText} color="azul" titulo="Cliente y facturación">
                <LeyendaObligatorios />
                <div className="form-grid">
                    {idVenta != null && (
                        <div className="campo">
                            <label>N.° de factura</label>
                            <input type="text" value={idVenta} disabled />
                        </div>
                    )}
                    <CampoSelector {...selector('CustomerID')} etiqueta="Cliente" lista={opciones.clientes} requerido textoVacio="Seleccione un cliente" />
                    <CampoSelector {...selector('BillToCustomerID')} etiqueta="Facturar a" lista={opciones.clientes} requerido textoVacio="Seleccione a quién facturar" />
                    <CampoEntrada {...campo('OrderID')} etiqueta="Pedido relacionado (número)" tipo="number" min={1} placeholder="Ej: 1520" />
                    <CampoEntrada {...campo('CustomerPurchaseOrderNumber')} etiqueta="N.° de orden del cliente" max={20} placeholder="Ej: PO-20394" />
                </div>
            </Seccion>

            <Seccion icono={Truck} color="verde" titulo="Entrega y contacto">
                <div className="form-grid">
                    <CampoSelector {...selector('DeliveryMethod')} etiqueta="Método de entrega" lista={opciones.metodosEntrega} requerido textoVacio="Seleccione un método" />
                    <CampoSelector {...selector('ContactPersonID')} etiqueta="Persona de contacto" lista={opciones.contactos} requerido textoVacio="Seleccione un contacto" />
                    <CampoSelector {...selector('AccountsPersonID')} etiqueta="Persona de cuentas" lista={opciones.contactos} requerido textoVacio="Seleccione un contacto" />
                    <CampoSelector {...selector('SalespersonPersonID')} etiqueta="Vendedor" lista={opciones.vendedores} requerido textoVacio="Seleccione un vendedor" />
                    <CampoSelector {...selector('PackedByPersonID')} etiqueta="Empacado por" lista={opciones.contactos} requerido textoVacio="Seleccione un contacto" />
                    <CampoEntrada {...campo('DeliveryRun')} etiqueta="Ruta de entrega" max={5} />
                    <CampoEntrada {...campo('RunPosition')} etiqueta="Posición en la ruta" max={5} />
                    <CampoArea {...campo('DeliveryInstructions')} etiqueta="Instrucciones de entrega"
                               placeholder="Instrucciones para el repartidor (opcional)" />
                </div>
            </Seccion>

            <Seccion icono={Calendar} color="ambar" titulo="Fecha y nota de crédito">
                <div className="form-grid">
                    <CampoEntrada {...campo('InvoiceDate')} etiqueta="Fecha de la factura" tipo="date" requerido />
                    <div className="campo">
                        <label>
                            <input
                                type="checkbox"
                                name="IsCreditNote"
                                checked={formulario.IsCreditNote}
                                onChange={onCambiar}
                                style={{ width: 'auto', marginRight: '0.5rem' }}
                            />
                            ¿Es nota de crédito?
                        </label>
                    </div>
                    {formulario.IsCreditNote && (
                        <CampoArea {...campo('CreditNoteReason')} etiqueta="Motivo de la nota de crédito" placeholder="Explique el motivo" />
                    )}
                </div>
            </Seccion>

            <Seccion icono={AlertTriangle} color="ambar" titulo="Totales y comentarios">
                <div className="form-grid">
                    <CampoEntrada {...campo('TotalDryItems')} etiqueta="Total de artículos secos" tipo="number" requerido min={0} />
                    <CampoEntrada {...campo('TotalChillerItems')} etiqueta="Total de artículos refrigerados" tipo="number" requerido min={0} />
                    <CampoArea {...campo('Comments')} etiqueta="Comentarios" placeholder="Comentarios visibles en la factura (opcional)" />
                    <CampoArea {...campo('InternalComments')} etiqueta="Comentarios internos" placeholder="Comentarios solo para uso interno (opcional)" />
                </div>
            </Seccion>

            {Array.isArray(lineas) ? (
                <LineasFactura lineas={lineas} onCambiarLinea={onCambiarLinea} opciones={opciones} cargando={cargandoOpciones} />
            ) : (
                <Seccion icono={Package} color="verde" titulo="Producto">
                    <CamposProducto valores={formulario} onCambiar={onCambiar} opciones={opciones} cargando={cargandoOpciones} />
                </Seccion>
            )}
        </>
    );
}

export default VentasFormulario;
