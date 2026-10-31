
import { useState } from 'react';

import {
    Package,
    Truck,
    DollarSign,
    Scale,
    FileText
} from 'lucide-react';


function InventarioFormulario({

    formulario,
    onCambiar,
    opciones,
    cargandoOpciones,
    idInventario,
    resaltar = false

}) {

    // Campo que el usuario está tocando en este momento.
    const [activo, setActivo] = useState(null);


    // Marca el campo como activo y avisa al padre.
    const cambiar = (e) => {

        setActivo(e.target.name);

        onCambiar(e);

    };


    // Clase del contenedor de cada campo.
    const clase = (nombre, extra = '') =>

        [
            'campo',
            extra,
            resaltar && activo === nombre
                ? 'campo-editando'
                : ''

        ]
            .filter(Boolean)
            .join(' ');


    // ========================================================
    // CAMPO DE TEXTO / NÚMERO
    // ========================================================

    const entrada = (

        nombre,
        etiqueta,

        {
            max,
            tipo = 'text',
            requerido = false,
            completo = false,
            placeholder = '',
            ...extra
        } = {}

    ) => (

        <div
            className={clase(
                nombre,
                completo ? 'campo-completo' : ''
            )}
        >

            <label>{etiqueta}</label>

            <input
                type={tipo}
                name={nombre}
                value={formulario[nombre] ?? ''}
                onChange={cambiar}
                onFocus={() => setActivo(nombre)}
                required={requerido}
                maxLength={max}
                placeholder={placeholder}
                {...extra}
            />

        </div>

    );


    // ========================================================
    // CAMPO SELECT
    // ========================================================
    // La información de estas listas viene de la base de datos.

    const selector = (

        nombre,
        etiqueta,
        lista,

        {
            requerido = false,
            vacio = 'Seleccione una opción'
        } = {}

    ) => (

        <div className={clase(nombre)}>

            <label>{etiqueta}</label>

            <select
                name={nombre}
                value={formulario[nombre] ?? ''}
                onChange={cambiar}
                onFocus={() => setActivo(nombre)}
                required={requerido}
                disabled={cargandoOpciones}
            >

                <option value="">

                    {cargandoOpciones
                        ? 'Cargando...'
                        : vacio}

                </option>

                {lista.map((opcion) => (

                    <option
                        key={opcion.ID}
                        value={String(opcion.ID)}
                    >
                        {opcion.Nombre}
                    </option>

                ))}

            </select>

        </div>

    );


    return (

        <>

            {/* ==================================================
                INFORMACIÓN PRINCIPAL
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">

                    <span className="cd-ico azul">
                        <Package size={18} />
                    </span>

                    Información principal

                </h3>


                <div className="form-grid">

                    {/* El ID solo aparece al editar */}

                    {idInventario != null && (

                        <div className="campo">

                            <label>ID del producto</label>

                            <input
                                type="text"
                                value={idInventario}
                                disabled
                            />

                        </div>

                    )}


                    {entrada(
                        'StockItemName',
                        'Nombre del producto',
                        {
                            max: 100,
                            requerido: true,
                            placeholder: 'Nombre del producto'
                        }
                    )}


                    {selector(
                        'SupplierID',
                        'Proveedor',
                        opciones.proveedores,
                        {
                            requerido: true,
                            vacio: 'Seleccione un proveedor'
                        }
                    )}


                    {selector(
                        'ColorID',
                        'Color',
                        opciones.colores,
                        {
                            vacio: 'Sin color'
                        }
                    )}


                    {selector(
                        'UnitPackageID',
                        'Unidad de empaquetamiento',
                        opciones.tiposPaquete,
                        {
                            requerido: true,
                            vacio: 'Seleccione una unidad'
                        }
                    )}


                    {selector(
                        'OuterPackageID',
                        'Empaquetamiento exterior',
                        opciones.tiposPaquete,
                        {
                            requerido: true,
                            vacio: 'Seleccione un empaquetamiento'
                        }
                    )}

                </div>

            </div>


            {/* ==================================================
                INFORMACIÓN DEL PRODUCTO
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">

                    <span className="cd-ico verde">
                        <Truck size={18} />
                    </span>

                    Información del producto

                </h3>


                <div className="form-grid">

                    {entrada(
                        'Brand',
                        'Marca',
                        {
                            max: 50,
                            placeholder: 'Marca del producto'
                        }
                    )}


                    {entrada(
                        'Size',
                        'Talla',
                        {
                            max: 20,
                            placeholder: 'Talla o tamaño'
                        }
                    )}


                    {entrada(
                        'LeadTimeDays',
                        'Días de entrega',
                        {
                            tipo: 'number',
                            requerido: true,
                            min: 0
                        }
                    )}


                    {entrada(
                        'QuantityPerOuter',
                        'Cantidad por empaquetamiento',
                        {
                            tipo: 'number',
                            requerido: true,
                            min: 1
                        }
                    )}


                    {entrada(
                        'Barcode',
                        'Código de barras',
                        {
                            max: 50,
                            placeholder: 'Código de barras'
                        }
                    )}


                    {/* Producto refrigerado */}

                    <div className={clase('IsChillerStock')}>

                        <label>Almacenamiento</label>

                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >

                            <input
                                type="checkbox"
                                name="IsChillerStock"
                                checked={
                                    Boolean(
                                        formulario.IsChillerStock
                                    )
                                }
                                onChange={cambiar}
                                onFocus={() =>
                                    setActivo('IsChillerStock')
                                }
                            />

                            Producto refrigerado

                        </label>

                    </div>

                </div>

            </div>


            {/* ==================================================
                PRECIOS E IMPUESTOS
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">

                    <span className="cd-ico ambar">
                        <DollarSign size={18} />
                    </span>

                    Precios e impuestos

                </h3>


                <div className="form-grid">

                    {entrada(
                        'TaxRate',
                        'Tasa de impuesto (%)',
                        {
                            tipo: 'number',
                            requerido: true,
                            min: 0,
                            step: '0.001',
                            placeholder: 'Ej: 13'
                        }
                    )}


                    {entrada(
                        'UnitPrice',
                        'Precio unitario',
                        {
                            tipo: 'number',
                            requerido: true,
                            min: 0,
                            step: '0.01',
                            placeholder: '0.00'
                        }
                    )}


                    {entrada(
                        'RecommendedRetailPrice',
                        'Precio de venta recomendado',
                        {
                            tipo: 'number',
                            min: 0,
                            step: '0.01',
                            placeholder: '0.00'
                        }
                    )}

                </div>

            </div>


            {/* ==================================================
                PESO
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">

                    <span className="cd-ico azul">
                        <Scale size={18} />
                    </span>

                    Peso

                </h3>


                <div className="form-grid">

                    {entrada(
                        'Weight',
                        'Peso por unidad',
                        {
                            tipo: 'number',
                            requerido: true,
                            min: 0,
                            step: '0.001',
                            placeholder: '0.000'
                        }
                    )}

                </div>

            </div>


            {/* ==================================================
                INFORMACIÓN ADICIONAL
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">

                    <span className="cd-ico ambar">
                        <FileText size={18} />
                    </span>

                    Información adicional

                </h3>


                <div className="form-grid">

                    {/* Comentarios de marketing */}

                    <div
                        className={clase(
                            'MarketingComments',
                            'campo-completo'
                        )}
                    >

                        <label>
                            Comentarios de marketing
                        </label>

                        <textarea
                            name="MarketingComments"
                            rows={3}
                            value={
                                formulario.MarketingComments ?? ''
                            }
                            onChange={cambiar}
                            onFocus={() =>
                                setActivo('MarketingComments')
                            }
                            placeholder="Comentarios de marketing (opcional)"
                        />

                    </div>


                    {/* Comentarios internos */}

                    <div
                        className={clase(
                            'InternalComments',
                            'campo-completo'
                        )}
                    >

                        <label>
                            Comentarios internos
                        </label>

                        <textarea
                            name="InternalComments"
                            rows={3}
                            value={
                                formulario.InternalComments ?? ''
                            }
                            onChange={cambiar}
                            onFocus={() =>
                                setActivo('InternalComments')
                            }
                            placeholder="Notas internas sobre el producto (opcional)"
                        />

                    </div>

                </div>

            </div>

        </>

    );

}

export default InventarioFormulario;