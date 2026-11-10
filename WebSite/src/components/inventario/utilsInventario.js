/*---------------------------------------------------------------------------------------*
*
* NOMBRE: utilsInventario (CORREGIDO)
*
* CAMBIOS:
*   - formularioDesdeDetalle ahora lee los IDs reales que devuelve el SP de detalle
*     (antes leía columnas que el SP NO devolvía: UnitPackageID, TaxRate, etc.
*     y el formulario de edición quedaba vacío / fallaba la validación).
*   - Nuevos campos: grupos (StockGroupIDs) e inventario (holdings).
*   - Se quita Photo del envío (no se puede mandar un binario por JSON).
*
*-----------------------------------------------------------------------------------------*/

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
    CustomFields: '',

    // NUEVO: grupos e inventario (holdings)
    StockGroupIDs: [],
    QuantityOnHand: '0',
    BinLocation: '',
    LastCostPrice: '',
    ReorderLevel: '0',
    TargetStockLevel: '0',

    LastEditedBy: 1
};

export function formularioDesdeDetalle(d) {
    const texto = (v) => v ?? '';
    const str = (v) => (v != null ? String(v) : '');

    return {
        StockItemName: texto(d.Producto),
        Version: d.Version ?? null,          // PY2: control de concurrencia
        SupplierID: str(d.Proveedor_ID),
        ColorID: str(d.Color_ID),
        UnitPackageID: str(d.UnitPackageID),
        OuterPackageID: str(d.OuterPackageID),
        Brand: texto(d.Brand),               // marca real, no "Marca sin definir"
        Size: texto(d.Talla),
        LeadTimeDays: str(d.LeadTimeDays),
        QuantityPerOuter: str(d.Cantidad_Empaquetamiento),
        IsChillerStock: Boolean(d.IsChillerStock),
        Barcode: texto(d.Barcode),
        TaxRate: str(d.TaxRate),
        UnitPrice: str(d.Precio_Unitario),
        RecommendedRetailPrice: str(d.Precio_Venta),
        Weight: str(d.Peso),
        MarketingComments: texto(d.MarketingComments),
        InternalComments: texto(d.InternalComments),
        CustomFields: texto(d.CustomFields),

        StockGroupIDs: d.Grupos_IDs
            ? String(d.Grupos_IDs).split(',').map((x) => x.trim())
            : [],
        QuantityOnHand: str(d.Cantidad_Disponible),
        BinLocation: texto(d.Ubicacion),
        LastCostPrice: str(d.LastCostPrice),
        ReorderLevel: str(d.ReorderLevel),
        TargetStockLevel: str(d.TargetStockLevel),

        LastEditedBy: 1
    };
}

/*
 * Validación rápida en el navegador SOLO para dar respuesta inmediata al usuario.
 * La validación oficial sigue estando en el SP (es la que cuenta).
 */
export function validarInventario(f) {
    const t = (v) => String(v ?? '').trim();
    const n = (v) => Number(v);

    const reglas = [
        !t(f.StockItemName) && 'Debe ingresar el nombre del producto.',
        !f.SupplierID && 'Debe seleccionar un proveedor.',
        !f.UnitPackageID && 'Debe seleccionar la unidad de empaquetamiento.',
        !f.OuterPackageID && 'Debe seleccionar el empaquetamiento exterior.',
        (!f.StockGroupIDs || f.StockGroupIDs.length === 0) && 'Debe seleccionar al menos un grupo.',
        (t(f.LeadTimeDays) === '' || !Number.isInteger(n(f.LeadTimeDays))) &&
            'Los días de entrega deben ser un número entero.',
        (t(f.QuantityPerOuter) === '' || !Number.isInteger(n(f.QuantityPerOuter)) || n(f.QuantityPerOuter) <= 0) &&
            'La cantidad por empaquetamiento debe ser un entero mayor que 0.',
        (t(f.TaxRate) === '' || Number.isNaN(n(f.TaxRate))) && 'Debe ingresar una tasa de impuesto válida.',
        (t(f.UnitPrice) === '' || Number.isNaN(n(f.UnitPrice))) && 'Debe ingresar un precio unitario válido.',
        (t(f.Weight) === '' || Number.isNaN(n(f.Weight))) && 'Debe ingresar un peso válido.',
        t(f.QuantityOnHand) !== '' && !Number.isInteger(n(f.QuantityOnHand)) &&
            'La cantidad en inventario debe ser un número entero.',
        t(f.BinLocation).length > 20 && 'La ubicación no puede superar los 20 caracteres.'
    ];

    return reglas.find(Boolean) || null;
}

export function armarDatos(f) {
    const t = (v) => String(v ?? '').trim();
    const opcional = (v) => (t(v) === '' ? null : t(v));
    const numero = (v) => (t(v) === '' ? null : Number(v));

    return {
        StockItemName: t(f.StockItemName),
        SupplierID: Number(f.SupplierID),
        ColorID: numero(f.ColorID),
        UnitPackageID: Number(f.UnitPackageID),
        OuterPackageID: Number(f.OuterPackageID),
        Brand: opcional(f.Brand),
        Size: opcional(f.Size),
        LeadTimeDays: Number(f.LeadTimeDays),
        QuantityPerOuter: Number(f.QuantityPerOuter),
        IsChillerStock: Boolean(f.IsChillerStock),
        Barcode: opcional(f.Barcode),
        TaxRate: Number(f.TaxRate),
        UnitPrice: Number(f.UnitPrice),
        RecommendedRetailPrice: numero(f.RecommendedRetailPrice),
        Weight: Number(f.Weight),
        MarketingComments: opcional(f.MarketingComments),
        InternalComments: opcional(f.InternalComments),
        CustomFields: opcional(f.CustomFields),

        StockGroupIDs: (f.StockGroupIDs || []).join(','),
        QuantityOnHand: numero(f.QuantityOnHand),
        BinLocation: opcional(f.BinLocation),
        LastCostPrice: numero(f.LastCostPrice),
        ReorderLevel: numero(f.ReorderLevel),
        TargetStockLevel: numero(f.TargetStockLevel),

        LastEditedBy: f.LastEditedBy ?? 1,
        Version: f.Version ?? null           // PY2: el SP rechaza el cambio si otro usuario lo modificó
    };
}
