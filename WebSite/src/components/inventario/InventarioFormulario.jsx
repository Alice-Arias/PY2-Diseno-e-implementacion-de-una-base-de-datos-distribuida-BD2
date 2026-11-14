/*---------------------------------------------------------------------------------------*
* NOMBRE: InventarioFormulario.jsx
*
* DESCRIPCION: Campos del formulario de productos, en seis secciones: información
* principal, del producto, precios, peso, grupos e inventario, e información adicional.
* Resalta el campo que se está editando.
*
* ENTRADA:
*   formulario         valores actuales.
*   onCambiar(evento)  al cambiar un campo.
*   opciones           { proveedores, colores, tiposPaquete, grupos }.
*   cargandoOpciones   true mientras cargan las listas.
*   idInventario       ID del producto (solo al modificar).
*
* SALIDA: Los campos del formulario.
*
* OBJETIVO: Un solo formulario para crear y para modificar productos.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { Package, Truck, DollarSign, Scale, FileText, Layers } from 'lucide-react';
import { MarcaCampo, LeyendaObligatorios, CampoEntrada, CampoSelector, CampoArea } from '../common/CamposFormulario';

/* Sección del formulario con su título e ícono. */
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

function InventarioFormulario({ formulario, onCambiar, opciones, cargandoOpciones, idInventario }) {
    const [campoActivo, setCampoActivo] = useState(null);

    /* Propiedades comunes de cada campo: valor, cambio y resaltado. */
    const campo = (nombre) => ({
        nombre,
        valor: formulario[nombre],
        editando: campoActivo === nombre,
        onEnfocar: () => setCampoActivo(nombre),
        onCambiar: (evento) => {
            setCampoActivo(evento.target.name);
            onCambiar(evento);
        }
    });

    const selector = (nombre) => ({ ...campo(nombre), cargando: cargandoOpciones });

    const gruposMarcados = formulario.StockGroupIDs || [];

    const alternarGrupo = (idGrupo) => {
        const nuevos = gruposMarcados.includes(idGrupo)
            ? gruposMarcados.filter((marcado) => marcado !== idGrupo)
            : [...gruposMarcados, idGrupo];
        setCampoActivo('StockGroupIDs');
        onCambiar({ target: { name: 'StockGroupIDs', value: nuevos } });
    };

    return (
        <>
            <Seccion icono={Package} color="azul" titulo="Información principal">
                <LeyendaObligatorios />
                <div className="form-grid">
                    {idInventario != null && (
                        <div className="campo">
                            <label>ID del producto</label>
                            <input type="text" value={idInventario} disabled />
                        </div>
                    )}
                    <CampoEntrada {...campo('StockItemName')} etiqueta="Nombre del producto" max={100} requerido placeholder="Nombre del producto" />
                    <CampoSelector {...selector('SupplierID')} etiqueta="Proveedor" lista={opciones.proveedores} requerido textoVacio="Seleccione un proveedor" />
                    <CampoSelector {...selector('ColorID')} etiqueta="Color" lista={opciones.colores} textoVacio="Sin color" />
                    <CampoSelector {...selector('UnitPackageID')} etiqueta="Unidad de empaquetamiento" lista={opciones.tiposPaquete} requerido textoVacio="Seleccione una unidad" />
                    <CampoSelector {...selector('OuterPackageID')} etiqueta="Empaquetamiento exterior" lista={opciones.tiposPaquete} requerido textoVacio="Seleccione un empaquetamiento" />
                </div>
            </Seccion>

            <Seccion icono={Truck} color="verde" titulo="Información del producto">
                <div className="form-grid">
                    <CampoEntrada {...campo('Brand')} etiqueta="Marca" max={50} placeholder="Marca del producto" />
                    <CampoEntrada {...campo('Size')} etiqueta="Talla" max={20} placeholder="Talla o tamaño" />
                    <CampoEntrada {...campo('LeadTimeDays')} etiqueta="Días de entrega" tipo="number" requerido min={0} />
                    <CampoEntrada {...campo('QuantityPerOuter')} etiqueta="Cantidad por empaquetamiento" tipo="number" requerido min={1} />
                    <CampoEntrada {...campo('Barcode')} etiqueta="Código de barras" max={50} placeholder="Código de barras" />
                    <div className={campoActivo === 'IsChillerStock' ? 'campo campo-editando' : 'campo'}>
                        <label>Almacenamiento</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                name="IsChillerStock"
                                checked={Boolean(formulario.IsChillerStock)}
                                onChange={campo('IsChillerStock').onCambiar}
                                onFocus={() => setCampoActivo('IsChillerStock')}
                            />
                            Producto refrigerado
                        </label>
                    </div>
                </div>
            </Seccion>

            <Seccion icono={DollarSign} color="ambar" titulo="Precios e impuestos">
                <div className="form-grid">
                    <CampoEntrada {...campo('TaxRate')} etiqueta="Tasa de impuesto (%)" tipo="number" requerido min={0} step="0.001" placeholder="Ej: 13" />
                    <CampoEntrada {...campo('UnitPrice')} etiqueta="Precio unitario (USD)" tipo="number" requerido min={0} step="0.01" placeholder="0.00" />
                    <CampoEntrada {...campo('RecommendedRetailPrice')} etiqueta="Precio de venta recomendado (USD)" tipo="number" min={0} step="0.01" placeholder="0.00" />
                </div>
            </Seccion>

            <Seccion icono={Scale} color="azul" titulo="Peso">
                <div className="form-grid">
                    <CampoEntrada {...campo('Weight')} etiqueta="Peso por unidad (kg)" tipo="number" requerido min={0} step="0.001" placeholder="0.000" />
                </div>
            </Seccion>

            <Seccion icono={Layers} color="verde" titulo="Grupos e inventario">
                <div className="form-grid">
                    <div className={campoActivo === 'StockGroupIDs' ? 'campo campo-completo campo-editando' : 'campo campo-completo'}>
                        <label>Grupos<MarcaCampo requerido /> <span className="campo-ayuda">Marque uno o varios</span></label>
                        <div className="grupos-chips">
                            {(opciones.grupos || []).length === 0 && (
                                <span style={{ opacity: 0.6 }}>
                                    {cargandoOpciones ? 'Cargando...' : 'No hay grupos disponibles'}
                                </span>
                            )}
                            {(opciones.grupos || []).map((grupo) => {
                                const idGrupo = String(grupo.ID);
                                const marcado = gruposMarcados.includes(idGrupo);
                                return (
                                    <label key={idGrupo} className={`grupo-chip ${marcado ? 'marcado' : ''}`}>
                                        <input type="checkbox" checked={marcado} onChange={() => alternarGrupo(idGrupo)} />
                                        {grupo.Nombre}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <CampoEntrada {...campo('QuantityOnHand')} etiqueta="Cantidad en inventario (unidades)" tipo="number" min={0} />
                    <CampoEntrada {...campo('BinLocation')} etiqueta="Ubicación en bodega" max={20} placeholder="Ej: L-1" />
                    <CampoEntrada {...campo('LastCostPrice')} etiqueta="Último costo (USD)" tipo="number" min={0} step="0.01" placeholder="Vacío = precio unitario" />
                    <CampoEntrada {...campo('ReorderLevel')} etiqueta="Nivel de reorden (unidades)" tipo="number" min={0} />
                    <CampoEntrada {...campo('TargetStockLevel')} etiqueta="Nivel objetivo (unidades)" tipo="number" min={0} />
                </div>
            </Seccion>

            <Seccion icono={FileText} color="ambar" titulo="Información adicional">
                <div className="form-grid">
                    <CampoArea {...campo('MarketingComments')} etiqueta="Comentarios de marketing" marcarOpcional={false}
                               placeholder="Comentarios de marketing (opcional)" />
                    <CampoArea {...campo('InternalComments')} etiqueta="Comentarios internos" marcarOpcional={false}
                               placeholder="Notas internas sobre el producto (opcional)" />
                </div>
            </Seccion>
        </>
    );
}

export default InventarioFormulario;
