
import {
    FileText,
    Truck,
    Calendar,
    Package,
    AlertTriangle
} from 'lucide-react';


function VentasFormulario({
    formulario,
    onCambiar,
    opciones,
    cargandoOpciones,
    idVenta,
    lineas = null,
    onCambiarLinea
}) {


    // ========================================================
    // CAMBIO DE CAMPOS NORMALES
    // ========================================================

    const cambiar = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;

        onCambiar({
            target: {
                name,
                value:
                    type === 'checkbox'
                        ? checked
                        : value
            }
        });
    };


    // ========================================================
    // CAMPO DE TEXTO / NÚMERO / FECHA
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
            className={
                `campo${completo
                    ? ' campo-completo'
                    : ''
                }`
            }
        >

            <label>{etiqueta}</label>

            <input
                type={tipo}
                name={nombre}
                value={formulario[nombre] ?? ''}
                onChange={cambiar}
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

    const selector = (
        nombre,
        etiqueta,
        lista,
        {
            requerido = false,
            vacio = 'Seleccione una opción'
        } = {}
    ) => (

        <div className="campo">

            <label>{etiqueta}</label>

            <select
                name={nombre}
                value={formulario[nombre] ?? ''}
                onChange={cambiar}
                required={requerido}
                disabled={cargandoOpciones}
            >

                <option value="">
                    {
                        cargandoOpciones
                            ? 'Cargando...'
                            : vacio
                    }
                </option>

                {(lista || []).map((opcion) => (

                    <option
                        key={opcion.ID}
                        value={String(opcion.ID)}
                    >
                        {
                            opcion.Nombre ||
                            opcion.Numero_Orden
                        }
                    </option>

                ))}

            </select>

        </div>
    );


    // ========================================================
    // TEXTAREA
    // ========================================================

    const area = (
        nombre,
        etiqueta,
        {
            placeholder = '',
            rows = 3
        } = {}
    ) => (

        <div className="campo campo-completo">

            <label>{etiqueta}</label>

            <textarea
                name={nombre}
                rows={rows}
                value={formulario[nombre] ?? ''}
                onChange={cambiar}
                placeholder={placeholder}
            />

        </div>
    );


    // ========================================================
    // CAMPO SELECT PARA UNA LÍNEA
    // ========================================================

    const selectorLinea = (
        indice,
        nombre,
        etiqueta,
        lista,
        {
            requerido = false,
            vacio = 'Seleccione una opción'
        } = {}
    ) => {

        const linea =
            lineas[indice];

        return (

            <div className="campo">

                <label>{etiqueta}</label>

                <select
                    name={nombre}
                    value={linea[nombre] ?? ''}
                    onChange={(e) =>
                        onCambiarLinea(
                            indice,
                            e
                        )
                    }
                    required={requerido}

                    // El producto existente no se cambia.
                    // Así evitamos convertir una línea de la
                    // factura en otro producto.
                    disabled={
                        cargandoOpciones ||
                        nombre === 'StockItemID'
                    }
                >

                    <option value="">
                        {
                            cargandoOpciones
                                ? 'Cargando...'
                                : vacio
                        }
                    </option>

                    {(lista || []).map((opcion) => (

                        <option
                            key={opcion.ID}
                            value={String(opcion.ID)}
                        >
                            {
                                opcion.Nombre ||
                                opcion.Numero_Orden
                            }
                        </option>

                    ))}

                </select>

            </div>
        );
    };


    // ========================================================
    // CAMPO DE TEXTO / NÚMERO PARA UNA LÍNEA
    // ========================================================

    const entradaLinea = (
        indice,
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
    ) => {

        const linea =
            lineas[indice];

        return (

            <div
                className={
                    `campo${completo
                        ? ' campo-completo'
                        : ''
                    }`
                }
            >

                <label>{etiqueta}</label>

                <input
                    type={tipo}
                    name={nombre}
                    value={linea[nombre] ?? ''}
                    onChange={(e) =>
                        onCambiarLinea(
                            indice,
                            e
                        )
                    }
                    required={requerido}
                    maxLength={max}
                    placeholder={placeholder}
                    {...extra}
                />

            </div>
        );
    };


    return (

        <>


            {/* ==================================================
                CLIENTE Y FACTURACIÓN
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">

                    <span className="cd-ico azul">
                        <FileText size={18} />
                    </span>

                    Cliente y facturación

                </h3>

                <div className="form-grid">

                    {idVenta != null && (

                        <div className="campo">

                            <label>
                                N.° de factura
                            </label>

                            <input
                                type="text"
                                value={idVenta}
                                disabled
                            />

                        </div>

                    )}

                    {selector(
                        'CustomerID',
                        'Cliente',
                        opciones.clientes,
                        {
                            requerido: true,
                            vacio:
                                'Seleccione un cliente'
                        }
                    )}

                    {selector(
                        'BillToCustomerID',
                        'Facturar a',
                        opciones.clientes,
                        {
                            requerido: true,
                            vacio:
                                'Seleccione a quién facturar'
                        }
                    )}

                    {selector(
                        'OrderID',
                        'Pedido relacionado',
                        opciones.pedidos,
                        {
                            vacio:
                                'Sin pedido relacionado'
                        }
                    )}

                    {entrada(
                        'CustomerPurchaseOrderNumber',
                        'N.° de orden del cliente',
                        {
                            max: 20,
                            placeholder:
                                'Ej: PO-20394'
                        }
                    )}

                </div>

            </div>


            {/* ==================================================
                ENTREGA Y CONTACTO
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">

                    <span className="cd-ico verde">
                        <Truck size={18} />
                    </span>

                    Entrega y contacto

                </h3>

                <div className="form-grid">

                    {selector(
                        'DeliveryMethod',
                        'Método de entrega',
                        opciones.metodosEntrega,
                        {
                            requerido: true,
                            vacio:
                                'Seleccione un método'
                        }
                    )}

                    {selector(
                        'ContactPersonID',
                        'Persona de contacto',
                        opciones.contactos,
                        {
                            requerido: true,
                            vacio:
                                'Seleccione un contacto'
                        }
                    )}

                    {selector(
                        'AccountsPersonID',
                        'Persona de cuentas',
                        opciones.contactos,
                        {
                            requerido: true,
                            vacio:
                                'Seleccione un contacto'
                        }
                    )}

                    {selector(
                        'SalespersonPersonID',
                        'Vendedor',
                        opciones.vendedores,
                        {
                            requerido: true,
                            vacio:
                                'Seleccione un vendedor'
                        }
                    )}

                    {selector(
                        'PackedByPersonID',
                        'Empacado por',
                        opciones.contactos,
                        {
                            requerido: true,
                            vacio:
                                'Seleccione un contacto'
                        }
                    )}

                    {entrada(
                        'DeliveryRun',
                        'Ruta de entrega',
                        {
                            max: 5
                        }
                    )}

                    {entrada(
                        'RunPosition',
                        'Posición en la ruta',
                        {
                            max: 5
                        }
                    )}

                    {area(
                        'DeliveryInstructions',
                        'Instrucciones de entrega',
                        {
                            placeholder:
                                'Instrucciones para el repartidor (opcional)'
                        }
                    )}

                </div>

            </div>


            {/* ==================================================
                FECHA Y NOTA DE CRÉDITO
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">

                    <span className="cd-ico ambar">
                        <Calendar size={18} />
                    </span>

                    Fecha y nota de crédito

                </h3>

                <div className="form-grid">

                    {entrada(
                        'InvoiceDate',
                        'Fecha de la factura',
                        {
                            tipo: 'date',
                            requerido: true
                        }
                    )}

                    <div className="campo">

                        <label>

                            <input
                                type="checkbox"
                                name="IsCreditNote"
                                checked={
                                    formulario.IsCreditNote
                                }
                                onChange={cambiar}
                                style={{
                                    width: 'auto',
                                    marginRight: '0.5rem'
                                }}
                            />

                            ¿Es nota de crédito?

                        </label>

                    </div>

                    {formulario.IsCreditNote &&
                        area(
                            'CreditNoteReason',
                            'Motivo de la nota de crédito',
                            {
                                placeholder:
                                    'Explique el motivo'
                            }
                        )
                    }

                </div>

            </div>


            {/* ==================================================
                TOTALES Y COMENTARIOS
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">

                    <span className="cd-ico ambar">
                        <AlertTriangle size={18} />
                    </span>

                    Totales y comentarios

                </h3>

                <div className="form-grid">

                    {entrada(
                        'TotalDryItems',
                        'Total de artículos secos',
                        {
                            tipo: 'number',
                            requerido: true,
                            min: 0
                        }
                    )}

                    {entrada(
                        'TotalChillerItems',
                        'Total de artículos refrigerados',
                        {
                            tipo: 'number',
                            requerido: true,
                            min: 0
                        }
                    )}

                    {area(
                        'Comments',
                        'Comentarios',
                        {
                            placeholder:
                                'Comentarios visibles en la factura (opcional)'
                        }
                    )}

                    {area(
                        'InternalComments',
                        'Comentarios internos',
                        {
                            placeholder:
                                'Comentarios solo para uso interno (opcional)'
                        }
                    )}

                </div>

            </div>


            {/* ==================================================
                PRODUCTOS
            ================================================== */}

            {Array.isArray(lineas) ? (

                <>

                    {lineas.length === 0 ? (

                        <div className="cd-panel">

                            <h3 className="cd-panel-titulo">

                                <span className="cd-ico verde">
                                    <Package size={18} />
                                </span>

                                Productos

                            </h3>

                            <p>
                                Esta factura no contiene
                                líneas de productos.
                            </p>

                        </div>

                    ) : (

                        lineas.map(
                            (linea, indice) => (

                                <div
                                    className="cd-panel"
                                    key={
                                        linea.StockItemID ||
                                        indice
                                    }
                                >

                                    <h3 className="cd-panel-titulo">

                                        <span className="cd-ico verde">
                                            <Package size={18} />
                                        </span>

                                        Producto {indice + 1}

                                    </h3>

                                    <div className="form-grid">

                                        {selectorLinea(
                                            indice,
                                            'StockItemID',
                                            'Producto',
                                            opciones.productos,
                                            {
                                                requerido: true,
                                                vacio:
                                                    'Seleccione un producto'
                                            }
                                        )}

                                        {entradaLinea(
                                            indice,
                                            'Description',
                                            'Descripción de la línea',
                                            {
                                                max: 100,
                                                requerido: true,
                                                completo: true,
                                                placeholder:
                                                    'Descripción que aparece en la factura'
                                            }
                                        )}

                                        {selectorLinea(
                                            indice,
                                            'PackageTypeID',
                                            'Tipo de empaque',
                                            opciones.tiposPaquete,
                                            {
                                                requerido: true,
                                                vacio:
                                                    'Seleccione un tipo de empaque'
                                            }
                                        )}

                                        {entradaLinea(
                                            indice,
                                            'Quantity',
                                            'Cantidad',
                                            {
                                                tipo: 'number',
                                                requerido: true,
                                                min: 1
                                            }
                                        )}

                                        {entradaLinea(
                                            indice,
                                            'UnitPrice',
                                            'Precio unitario',
                                            {
                                                tipo: 'number',
                                                min: 0,
                                                placeholder: '0.00',
                                                step: '0.01'
                                            }
                                        )}

                                        {entradaLinea(
                                            indice,
                                            'TaxRate',
                                            'Impuesto (%)',
                                            {
                                                tipo: 'number',
                                                requerido: true,
                                                min: 0,
                                                max: 100
                                            }
                                        )}

                                    </div>

                                </div>

                            )
                        )

                    )}

                </>

            ) : (


                <div className="cd-panel">

                    <h3 className="cd-panel-titulo">

                        <span className="cd-ico verde">
                            <Package size={18} />
                        </span>

                        Producto

                    </h3>

                    <div className="form-grid">

                        {selector(
                            'StockItemID',
                            'Producto',
                            opciones.productos,
                            {
                                requerido: true,
                                vacio:
                                    'Seleccione un producto'
                            }
                        )}

                        {entrada(
                            'Description',
                            'Descripción de la línea',
                            {
                                max: 100,
                                requerido: true,
                                completo: true,
                                placeholder:
                                    'Descripción que aparece en la factura'
                            }
                        )}

                        {selector(
                            'PackageTypeID',
                            'Tipo de empaque',
                            opciones.tiposPaquete,
                            {
                                requerido: true,
                                vacio:
                                    'Seleccione un tipo de empaque'
                            }
                        )}

                        {entrada(
                            'Quantity',
                            'Cantidad',
                            {
                                tipo: 'number',
                                requerido: true,
                                min: 1
                            }
                        )}

                        {entrada(
                            'UnitPrice',
                            'Precio unitario',
                            {
                                tipo: 'number',
                                min: 0,
                                placeholder: '0.00',
                                step: '0.01'
                            }
                        )}

                        {entrada(
                            'TaxRate',
                            'Impuesto (%)',
                            {
                                tipo: 'number',
                                requerido: true,
                                min: 0,
                                max: 100
                            }
                        )}

                    </div>

                </div>

            )}

        </>

    );
}


export default VentasFormulario;