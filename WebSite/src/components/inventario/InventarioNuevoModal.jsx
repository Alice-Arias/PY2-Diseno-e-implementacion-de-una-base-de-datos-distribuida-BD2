
import {
    X,
    PackagePlus,
    Package,
    Truck,
    Save,
    Loader2
} from 'lucide-react';



import {
    useEffect,
    useState
} from 'react';



import {
    insertarInventario,
    obtenerOpcionesInventario
} from '../../services/api';


function InventarioNuevoModal({
    onCerrar,
    onInventarioCreado,
    onMostrarMensaje
}) {

    // ========================================================
    // DATOS DEL FORMULARIO
    // ========================================================

    const [formulario, setFormulario] = useState({

        // ----------------------------------------------------
        // INFORMACIÓN PRINCIPAL
        // ----------------------------------------------------

        StockItemName: '',
        SupplierID: '',
        ColorID: '',
        UnitPackageID: '',
        OuterPackageID: '',

        // ----------------------------------------------------
        // INFORMACIÓN DEL PRODUCTO
        // ----------------------------------------------------

        Brand: '',
        Size: '',
        LeadTimeDays: '',
        QuantityPerOuter: '',
        IsChillerStock: false,
        Barcode: '',

        // ----------------------------------------------------
        // INFORMACIÓN DE PRECIOS
        // ----------------------------------------------------

        TaxRate: '',
        UnitPrice: '',
        RecommendedRetailPrice: '',

        // ----------------------------------------------------
        // PESO
        // ----------------------------------------------------

        Weight: '',

        // ----------------------------------------------------
        // INFORMACIÓN ADICIONAL
        // ----------------------------------------------------

        MarketingComments: '',
        InternalComments: '',

        // ----------------------------------------------------
        // USUARIO QUE REALIZA LA OPERACIÓN
        // ----------------------------------------------------

        LastEditedBy: 1
    });


    // ========================================================
    // OPCIONES QUE VIENEN DE LA BASE DE DATOS
    // ========================================================

    const [opciones, setOpciones] = useState({

        proveedores: [],
        colores: [],
        tiposPaquete: []

    });


    // ========================================================
    // ESTADOS DE CARGA
    // ========================================================

    // Indica si las opciones todavía están cargando.

    const [cargandoOpciones, setCargandoOpciones] =
        useState(true);


    // Indica si se está guardando el producto.

    const [guardando, setGuardando] =
        useState(false);


    // ========================================================
    // CARGAR OPCIONES DESDE LA BASE DE DATOS
    // ========================================================

    useEffect(() => {

        const cargarOpciones = async () => {

            try {

                setCargandoOpciones(true);

                const data =
                    await obtenerOpcionesInventario();


                setOpciones({

                    proveedores:
                        data.proveedores || [],

                    colores:
                        data.colores || [],

                    tiposPaquete:
                        data.tiposPaquete || []

                });

            } catch (error) {

                console.error(error);

                if (onMostrarMensaje) {

                    onMostrarMensaje({

                        tipo: 'error',

                        titulo:
                            'No se pudieron cargar las opciones',

                        mensaje:
                            error.message

                    });

                }

            } finally {

                setCargandoOpciones(false);

            }

        };


        cargarOpciones();

    }, [onMostrarMensaje]);


    // ========================================================
    // CAMBIAR VALOR DE UN CAMPO
    // ========================================================

    const cambiarCampo = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;


        setFormulario((anterior) => ({

            ...anterior,

            [name]:
                type === 'checkbox'
                    ? checked
                    : value

        }));

    };


    // ========================================================
    // GUARDAR PRODUCTO
    // ========================================================

    const guardarInventario = async (e) => {

        e.preventDefault();

        setGuardando(true);


        try {

            // ==================================================
            // CONVERTIR LOS CAMPOS NUMÉRICOS
            // ==================================================
            //
            // Los inputs HTML entregan sus valores como texto.
            // Antes de enviarlos al backend los convertimos
            // al tipo de dato correspondiente.

            const datos = {

                ...formulario,


                // ------------------------------------------------
                // IDs
                // ------------------------------------------------

                SupplierID:
                    Number(formulario.SupplierID),

                ColorID:
                    formulario.ColorID === ''
                        ? null
                        : Number(formulario.ColorID),

                UnitPackageID:
                    Number(formulario.UnitPackageID),

                OuterPackageID:
                    Number(formulario.OuterPackageID),


                // ------------------------------------------------
                // CANTIDADES
                // ------------------------------------------------

                LeadTimeDays:
                    Number(formulario.LeadTimeDays),

                QuantityPerOuter:
                    Number(formulario.QuantityPerOuter),


                // ------------------------------------------------
                // PRECIOS E IMPUESTOS
                // ------------------------------------------------

                TaxRate:
                    Number(formulario.TaxRate),

                UnitPrice:
                    Number(formulario.UnitPrice),

                RecommendedRetailPrice:
                    formulario.RecommendedRetailPrice === ''
                        ? null
                        : Number(
                            formulario.RecommendedRetailPrice
                        ),


                // ------------------------------------------------
                // PESO
                // ------------------------------------------------

                Weight:
                    Number(formulario.Weight),


                // ------------------------------------------------
                // USUARIO
                // ------------------------------------------------

                LastEditedBy:
                    Number(formulario.LastEditedBy)

            };


            // ==================================================
            // ENVIAR PRODUCTO A LA API
            // ==================================================

            const data =
                await insertarInventario(datos);


            // ==================================================
            // AVISAR AL COMPONENTE PADRE
            // ==================================================

            await onInventarioCreado(data);


        } catch (error) {

            console.error(error);


            if (onMostrarMensaje) {

                onMostrarMensaje({

                    tipo: 'error',

                    titulo:
                        'No se puede crear el producto',

                    mensaje:
                        error.message

                });

            }

        } finally {

            setGuardando(false);

        }

    };


    // ========================================================
    // RENDERIZADO
    // ========================================================

    return (

        <div
            className="modal-fondo"
            onClick={onCerrar}
        >

            <div
                className="modal-contenido modal-cliente-form"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >


                {/* ==================================================
                    ENCABEZADO
                    ================================================== */}

                <header className="cd-encabezado">

                    <div className="cd-avatar">

                        <PackagePlus size={25} />

                    </div>


                    <div className="cd-titulo">

                        <h2>
                            Nuevo producto
                        </h2>

                        <p className="cd-subtitulo">

                            Complete la información para registrar
                            un nuevo producto de inventario.

                        </p>

                    </div>


                    <button
                        type="button"
                        className="modal-cerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        disabled={guardando}
                    >

                        <X size={22} />

                    </button>

                </header>


                {/* ==================================================
                    FORMULARIO
                    ================================================== */}

                <form onSubmit={guardarInventario}>


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


                            {/* ==========================================
                                NOMBRE DEL PRODUCTO
                                ========================================== */}

                            <div className="campo campo-completo">

                                <label>
                                    Nombre del producto
                                </label>

                                <input
                                    type="text"
                                    name="StockItemName"
                                    value={
                                        formulario.StockItemName
                                    }
                                    onChange={cambiarCampo}
                                    required
                                    maxLength={100}
                                    placeholder="Nombre del producto"
                                />

                            </div>


                            {/* ==========================================
                                PROVEEDOR
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Proveedor
                                </label>

                                <select
                                    name="SupplierID"
                                    value={
                                        formulario.SupplierID
                                    }
                                    onChange={cambiarCampo}
                                    required
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">

                                        {cargandoOpciones
                                            ? 'Cargando proveedores...'
                                            : 'Seleccione un proveedor'}

                                    </option>


                                    {opciones.proveedores.map(
                                        (proveedor) => (

                                            <option
                                                key={proveedor.ID}
                                                value={proveedor.ID}
                                            >

                                                {proveedor.Nombre}

                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* ==========================================
                                COLOR
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Color
                                </label>

                                <select
                                    name="ColorID"
                                    value={
                                        formulario.ColorID
                                    }
                                    onChange={cambiarCampo}
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">
                                        Sin color
                                    </option>


                                    {opciones.colores.map(
                                        (color) => (

                                            <option
                                                key={color.ID}
                                                value={color.ID}
                                            >

                                                {color.Nombre}

                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* ==========================================
                                UNIDAD DE EMPAQUETAMIENTO
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Unidad de empaquetamiento
                                </label>

                                <select
                                    name="UnitPackageID"
                                    value={
                                        formulario.UnitPackageID
                                    }
                                    onChange={cambiarCampo}
                                    required
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">

                                        {cargandoOpciones
                                            ? 'Cargando opciones...'
                                            : 'Seleccione una unidad'}

                                    </option>


                                    {opciones.tiposPaquete.map(
                                        (paquete) => (

                                            <option
                                                key={paquete.ID}
                                                value={paquete.ID}
                                            >

                                                {paquete.Nombre}

                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* ==========================================
                                EMPAQUETAMIENTO EXTERIOR
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Empaquetamiento exterior
                                </label>

                                <select
                                    name="OuterPackageID"
                                    value={
                                        formulario.OuterPackageID
                                    }
                                    onChange={cambiarCampo}
                                    required
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">

                                        {cargandoOpciones
                                            ? 'Cargando opciones...'
                                            : 'Seleccione un empaquetamiento'}

                                    </option>


                                    {opciones.tiposPaquete.map(
                                        (paquete) => (

                                            <option
                                                key={paquete.ID}
                                                value={paquete.ID}
                                            >

                                                {paquete.Nombre}

                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        INFORMACIÓN DEL PRODUCTO
                        ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico verde">

                                <Package size={18} />

                            </span>

                            Información del producto

                        </h3>


                        <div className="form-grid">


                            {/* ==========================================
                                MARCA
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Marca
                                </label>

                                <input
                                    type="text"
                                    name="Brand"
                                    value={formulario.Brand}
                                    onChange={cambiarCampo}
                                    maxLength={50}
                                    placeholder="Marca"
                                />

                            </div>


                            {/* ==========================================
                                TALLA / TAMAÑO
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Talla / tamaño
                                </label>

                                <input
                                    type="text"
                                    name="Size"
                                    value={formulario.Size}
                                    onChange={cambiarCampo}
                                    maxLength={20}
                                    placeholder="Talla o tamaño"
                                />

                            </div>


                            {/* ==========================================
                                DÍAS DE ENTREGA
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Días de entrega
                                </label>

                                <input
                                    type="number"
                                    name="LeadTimeDays"
                                    value={
                                        formulario.LeadTimeDays
                                    }
                                    onChange={cambiarCampo}
                                    required
                                    min="0"
                                    placeholder="0"
                                />

                            </div>


                            {/* ==========================================
                                CANTIDAD POR EMPAQUETAMIENTO
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Cantidad por empaquetamiento
                                </label>

                                <input
                                    type="number"
                                    name="QuantityPerOuter"
                                    value={
                                        formulario.QuantityPerOuter
                                    }
                                    onChange={cambiarCampo}
                                    required
                                    min="1"
                                    placeholder="Cantidad"
                                />

                            </div>


                            {/* ==========================================
                                CÓDIGO DE BARRAS
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Código de barras
                                </label>

                                <input
                                    type="text"
                                    name="Barcode"
                                    value={formulario.Barcode}
                                    onChange={cambiarCampo}
                                    maxLength={50}
                                    placeholder="Código de barras"
                                />

                            </div>


                            {/* ==========================================
                                PRODUCTO REFRIGERADO
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    ¿Producto refrigerado?
                                </label>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        minHeight: '42px'
                                    }}
                                >

                                    <input
                                        type="checkbox"
                                        name="IsChillerStock"
                                        checked={
                                            formulario.IsChillerStock
                                        }
                                        onChange={cambiarCampo}
                                    />

                                    <span>
                                        Mantener en refrigeración
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        PRECIOS E IMPUESTOS
                        ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico ambar">

                                💰

                            </span>

                            Precios e impuestos

                        </h3>


                        <div className="form-grid">


                            {/* ==========================================
                                IMPUESTO
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Impuesto (%)
                                </label>

                                <input
                                    type="number"
                                    name="TaxRate"
                                    value={
                                        formulario.TaxRate
                                    }
                                    onChange={cambiarCampo}
                                    required
                                    min="0"
                                    step="0.001"
                                    placeholder="0.000"
                                />

                            </div>


                            {/* ==========================================
                                PRECIO UNITARIO
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Precio unitario
                                </label>

                                <input
                                    type="number"
                                    name="UnitPrice"
                                    value={
                                        formulario.UnitPrice
                                    }
                                    onChange={cambiarCampo}
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                />

                            </div>


                            {/* ==========================================
                                PRECIO DE VENTA
                                ========================================== */}

                            <div className="campo">

                                <label>
                                    Precio de venta
                                </label>

                                <input
                                    type="number"
                                    name="RecommendedRetailPrice"
                                    value={
                                        formulario
                                            .RecommendedRetailPrice
                                    }
                                    onChange={cambiarCampo}
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                />

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        PESO
                        ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico azul">

                                ⚖️

                            </span>

                            Peso

                        </h3>


                        <div className="form-grid">


                            <div className="campo">

                                <label>
                                    Peso por unidad
                                </label>

                                <input
                                    type="number"
                                    name="Weight"
                                    value={
                                        formulario.Weight
                                    }
                                    onChange={cambiarCampo}
                                    required
                                    min="0"
                                    step="0.001"
                                    placeholder="0.000"
                                />

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        INFORMACIÓN ADICIONAL
                        ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico verde">

                                📝

                            </span>

                            Información adicional

                        </h3>


                        <div className="form-grid">


                            {/* ==========================================
                                PALABRAS CLAVE / MARKETING COMMENTS
                                ========================================== */}

                            <div className="campo campo-completo">

                                <label>
                                    Información de marketing
                                </label>

                                <textarea
                                    name="MarketingComments"
                                    value={
                                        formulario.MarketingComments
                                    }
                                    onChange={cambiarCampo}
                                    rows="3"
                                    placeholder="Información comercial o de marketing"
                                />

                            </div>


                            {/* ==========================================
                                COMENTARIOS INTERNOS
                                ========================================== */}

                            <div className="campo campo-completo">

                                <label>
                                    Comentarios internos
                                </label>

                                <textarea
                                    name="InternalComments"
                                    value={
                                        formulario.InternalComments
                                    }
                                    onChange={cambiarCampo}
                                    rows="3"
                                    placeholder="Comentarios internos del producto"
                                />

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        BOTONES
                        ================================================== */}

                    <div className="modal-footer">


                        {/* ==================================================
                            CANCELAR
                            ================================================== */}

                        <button
                            type="button"
                            className="btn btn-claro"
                            onClick={onCerrar}
                            disabled={guardando}
                        >

                            Cancelar

                        </button>


                        {/* ==================================================
                            GUARDAR
                            ================================================== */}

                        <button
                            type="submit"
                            className="btn btn-azul"
                            disabled={
                                guardando ||
                                cargandoOpciones
                            }
                        >

                            {guardando ? (

                                <>

                                    <Loader2
                                        size={17}
                                        className="girando"
                                    />

                                    Guardando...

                                </>

                            ) : (

                                <>

                                    <Save size={17} />

                                    Crear producto

                                </>

                            )}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}


export default InventarioNuevoModal;