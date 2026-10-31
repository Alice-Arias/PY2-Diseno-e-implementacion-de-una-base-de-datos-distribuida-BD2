
// ------------------------------------------------------------
// VALORES INICIALES
// ------------------------------------------------------------

export const FORMULARIO_VACIO = {

    StockItemName: '',

    SupplierID: '',
    ColorID: '',
    UnitPackageID: '',
    OuterPackageID: '',

    Brand: '',
    Size: '',

    LeadTimeDays: '',
    QuantityPerOuter: '',

    IsChillerStock: false,

    Barcode: '',

    TaxRate: '',
    UnitPrice: '',
    RecommendedRetailPrice: '',

    Weight: '',

    MarketingComments: '',
    InternalComments: '',

    Photo: null,
    CustomFields: '',

    LastEditedBy: 1
};


// ------------------------------------------------------------
// DETALLE (SP_Inventarios_Detalle) → FORMULARIO
//
// Los select trabajan con texto, por eso los IDs se convierten
// a String.
//
// Los valores null pasan a '' para que los inputs no reciban
// valores null.
//
// ------------------------------------------------------------

export function formularioDesdeDetalle(d) {

    const texto = (valor) =>
        valor ?? '';

    const id = (valor) =>
        valor != null
            ? String(valor)
            : '';

    return {

        StockItemName: texto(d.Producto),

        SupplierID: id(d.Proveedor_ID),

        ColorID: id(d.Color_ID),

        UnitPackageID: id(d.UnitPackageID),

        OuterPackageID: id(d.OuterPackageID),

        Brand: texto(d.Marca),

        Size: texto(d.Talla),

        LeadTimeDays:
            d.LeadTimeDays != null
                ? String(d.LeadTimeDays)
                : '',

        QuantityPerOuter:
            d.Cantidad_Empaquetamiento != null
                ? String(d.Cantidad_Empaquetamiento)
                : '',

        IsChillerStock:
            d.IsChillerStock ?? false,

        Barcode: texto(d.Barcode),

        TaxRate:
            d.TaxRate != null
                ? String(d.TaxRate)
                : '',

        UnitPrice:
            d.Precio_Unitario != null
                ? String(d.Precio_Unitario)
                : '',

        RecommendedRetailPrice:
            d.Precio_Venta != null
                ? String(d.Precio_Venta)
                : '',

        Weight:
            d.Peso != null
                ? String(d.Peso)
                : '',

        MarketingComments:
            texto(d.MarketingComments),

        InternalComments:
            texto(d.InternalComments),

        Photo:
            d.Photo ?? null,

        CustomFields:
            texto(d.CustomFields),

        LastEditedBy: 1
    };
}


// ------------------------------------------------------------
// VALIDACIÓN
//
// Devuelve el PRIMER mensaje de error que encuentre,
// o null si todo está bien.
//
// Las reglas corresponden a los tamaños y rangos utilizados
// por los procedimientos almacenados de Inventario.
//
// ------------------------------------------------------------

export function validarInventario(f) {

    const t = (valor) =>
        String(valor ?? '').trim();

    const entero = (valor) =>
        Number(valor);

    const reglas = [

        // ---------- Información principal ----------

        !t(f.StockItemName) &&
            'Debe ingresar el nombre del producto.',

        t(f.StockItemName).length > 100 &&
            'El nombre del producto no puede superar los 100 caracteres.',

        !f.SupplierID &&
            'Debe seleccionar un proveedor.',

        !f.UnitPackageID &&
            'Debe seleccionar la unidad de empaquetamiento.',

        !f.OuterPackageID &&
            'Debe seleccionar el empaquetamiento exterior.',


        // ---------- Información del producto ----------

        t(f.Brand).length > 50 &&
            'La marca no puede superar los 50 caracteres.',

        t(f.Size).length > 20 &&
            'La talla no puede superar los 20 caracteres.',

        (
            t(f.LeadTimeDays) === '' ||
            !Number.isInteger(entero(f.LeadTimeDays))
        ) &&
            'Los días de entrega deben ser un número entero.',

        (
            t(f.QuantityPerOuter) === '' ||
            !Number.isInteger(entero(f.QuantityPerOuter))
        ) &&
            'La cantidad por empaquetamiento debe ser un número entero.',

        (
            entero(f.LeadTimeDays) < 0 ||
            entero(f.LeadTimeDays) > 365
        ) &&
            'Los días de entrega deben estar entre 0 y 365.',

        (
            entero(f.QuantityPerOuter) < 0
        ) &&
            'La cantidad por empaquetamiento no puede ser negativa.',

        t(f.Barcode).length > 50 &&
            'El código de barras no puede superar los 50 caracteres.',


        // ---------- Precios e impuestos ----------

        (
            t(f.TaxRate) === '' ||
            Number.isNaN(Number(f.TaxRate))
        ) &&
            'Debe ingresar una tasa de impuesto válida.',

        Number(f.TaxRate) < 0 &&
            'La tasa de impuesto no puede ser negativa.',

        (
            t(f.UnitPrice) === '' ||
            Number.isNaN(Number(f.UnitPrice))
        ) &&
            'Debe ingresar un precio unitario válido.',

        Number(f.UnitPrice) < 0 &&
            'El precio unitario no puede ser negativo.',

        (
            t(f.RecommendedRetailPrice) !== '' &&
            Number.isNaN(Number(f.RecommendedRetailPrice))
        ) &&
            'El precio de venta recomendado no es válido.',

        Number(f.RecommendedRetailPrice) < 0 &&
            'El precio de venta recomendado no puede ser negativo.',


        // ---------- Peso ----------

        (
            t(f.Weight) === '' ||
            Number.isNaN(Number(f.Weight))
        ) &&
            'Debe ingresar un peso válido.',

        Number(f.Weight) < 0 &&
            'El peso no puede ser negativo.',


        // ---------- Información adicional ----------

        t(f.MarketingComments).length > 4000 &&
            'Los comentarios de marketing son demasiado largos.',

        t(f.InternalComments).length > 4000 &&
            'Los comentarios internos son demasiado largos.'

    ];

    return reglas.find(Boolean) || null;
}


// ------------------------------------------------------------
// FORMULARIO → DATOS PARA LA API
//
// - Los IDs pasan a número.
// - Los números pasan a Number.
// - Los campos opcionales vacíos se envían como null.
// - IsChillerStock se mantiene como booleano.
// ------------------------------------------------------------

export function armarDatos(f) {

    const t = (valor) =>
        String(valor ?? '').trim();


    // Texto opcional:
    // '' se convierte en null.

    const opcional = (valor) =>
        t(valor) === ''
            ? null
            : t(valor);


    // ID opcional:
    // '' se convierte en null.

    const idOpcional = (valor) =>
        valor === '' || valor == null
            ? null
            : Number(valor);


    // Número opcional:
    // '' se convierte en null.

    const numeroOpcional = (valor) =>
        valor === '' || valor == null
            ? null
            : Number(valor);


    return {

        StockItemName:
            t(f.StockItemName),

        SupplierID:
            Number(f.SupplierID),

        ColorID:
            idOpcional(f.ColorID),

        UnitPackageID:
            Number(f.UnitPackageID),

        OuterPackageID:
            Number(f.OuterPackageID),

        Brand:
            opcional(f.Brand),

        Size:
            opcional(f.Size),

        LeadTimeDays:
            Number(f.LeadTimeDays),

        QuantityPerOuter:
            Number(f.QuantityPerOuter),

        IsChillerStock:
            Boolean(f.IsChillerStock),

        Barcode:
            opcional(f.Barcode),

        TaxRate:
            Number(f.TaxRate),

        UnitPrice:
            Number(f.UnitPrice),

        RecommendedRetailPrice:
            numeroOpcional(
                f.RecommendedRetailPrice
            ),

        Weight:
            Number(f.Weight),

        MarketingComments:
            opcional(f.MarketingComments),

        InternalComments:
            opcional(f.InternalComments),

        Photo:
            f.Photo ?? null,

        CustomFields:
            opcional(f.CustomFields),

        LastEditedBy:
            f.LastEditedBy ?? 1
    };
}