/*---------------------------------------------------------------------------------------*
* NOMBRE: formularioInventario.js
*
* DESCRIPCION: Datos del formulario de productos:
*   FORMULARIO_VACIO        valores iniciales al crear.
*   formularioDesdeDetalle  convierte el detalle de la API en valores del formulario.
*   validarInventario       revisa los datos antes de enviarlos (primer error o null).
*   datosParaApi            convierte el formulario en lo que espera la API.
*
* ENTRADA: El formulario o el detalle del producto.
*
* SALIDA: Valores, mensaje de error o datos para la API.
*
* OBJETIVO: Separar las reglas del formulario de la parte visual.
*-----------------------------------------------------------------------------------------*/

import { textoDe, idDe, limpio, textoOpcional, numeroOpcional, primerError } from '../../utils/formulario';

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
    StockGroupIDs: [],
    QuantityOnHand: '0',
    BinLocation: '',
    LastCostPrice: '',
    ReorderLevel: '0',
    TargetStockLevel: '0',
    LastEditedBy: 1
};

export function formularioDesdeDetalle(detalle) {
    return {
        StockItemName: textoDe(detalle.Producto),
        Version: detalle.Version ?? null,   // Control de concurrencia: fecha de la última edición.
        SupplierID: idDe(detalle.Proveedor_ID),
        ColorID: idDe(detalle.Color_ID),
        UnitPackageID: idDe(detalle.UnitPackageID),
        OuterPackageID: idDe(detalle.OuterPackageID),
        Brand: textoDe(detalle.Brand),
        Size: textoDe(detalle.Talla),
        LeadTimeDays: idDe(detalle.LeadTimeDays),
        QuantityPerOuter: idDe(detalle.Cantidad_Empaquetamiento),
        IsChillerStock: Boolean(detalle.IsChillerStock),
        Barcode: textoDe(detalle.Barcode),
        TaxRate: idDe(detalle.TaxRate),
        UnitPrice: idDe(detalle.Precio_Unitario),
        RecommendedRetailPrice: idDe(detalle.Precio_Venta),
        Weight: idDe(detalle.Peso),
        MarketingComments: textoDe(detalle.MarketingComments),
        InternalComments: textoDe(detalle.InternalComments),
        CustomFields: textoDe(detalle.CustomFields),
        StockGroupIDs: detalle.Grupos_IDs ? String(detalle.Grupos_IDs).split(',').map((grupo) => grupo.trim()) : [],
        QuantityOnHand: idDe(detalle.Cantidad_Disponible),
        BinLocation: textoDe(detalle.Ubicacion),
        LastCostPrice: idDe(detalle.LastCostPrice),
        ReorderLevel: idDe(detalle.ReorderLevel),
        TargetStockLevel: idDe(detalle.TargetStockLevel),
        LastEditedBy: 1
    };
}

const noEsEntero = (valor) => limpio(valor) === '' || !Number.isInteger(Number(valor));
const noEsNumero = (valor) => limpio(valor) === '' || Number.isNaN(Number(valor));

export function validarInventario(producto) {
    return primerError([
        !limpio(producto.StockItemName) && 'Debe ingresar el nombre del producto.',
        !producto.SupplierID && 'Debe seleccionar un proveedor.',
        !producto.UnitPackageID && 'Debe seleccionar la unidad de empaquetamiento.',
        !producto.OuterPackageID && 'Debe seleccionar el empaquetamiento exterior.',
        (!producto.StockGroupIDs || producto.StockGroupIDs.length === 0) && 'Debe seleccionar al menos un grupo.',
        noEsEntero(producto.LeadTimeDays) && 'Los días de entrega deben ser un número entero.',
        (noEsEntero(producto.QuantityPerOuter) || Number(producto.QuantityPerOuter) <= 0) &&
            'La cantidad por empaquetamiento debe ser un entero mayor que 0.',
        noEsNumero(producto.TaxRate) && 'Debe ingresar una tasa de impuesto válida.',
        noEsNumero(producto.UnitPrice) && 'Debe ingresar un precio unitario válido.',
        noEsNumero(producto.Weight) && 'Debe ingresar un peso válido.',
        limpio(producto.QuantityOnHand) !== '' && !Number.isInteger(Number(producto.QuantityOnHand)) &&
            'La cantidad en inventario debe ser un número entero.',
        limpio(producto.BinLocation).length > 20 && 'La ubicación no puede superar los 20 caracteres.'
    ]);
}

export function datosParaApi(producto) {
    return {
        StockItemName: limpio(producto.StockItemName),
        SupplierID: Number(producto.SupplierID),
        ColorID: numeroOpcional(producto.ColorID),
        UnitPackageID: Number(producto.UnitPackageID),
        OuterPackageID: Number(producto.OuterPackageID),
        Brand: textoOpcional(producto.Brand),
        Size: textoOpcional(producto.Size),
        LeadTimeDays: Number(producto.LeadTimeDays),
        QuantityPerOuter: Number(producto.QuantityPerOuter),
        IsChillerStock: Boolean(producto.IsChillerStock),
        Barcode: textoOpcional(producto.Barcode),
        TaxRate: Number(producto.TaxRate),
        UnitPrice: Number(producto.UnitPrice),
        RecommendedRetailPrice: numeroOpcional(producto.RecommendedRetailPrice),
        Weight: Number(producto.Weight),
        MarketingComments: textoOpcional(producto.MarketingComments),
        InternalComments: textoOpcional(producto.InternalComments),
        CustomFields: textoOpcional(producto.CustomFields),
        StockGroupIDs: (producto.StockGroupIDs || []).join(','),
        QuantityOnHand: numeroOpcional(producto.QuantityOnHand),
        BinLocation: textoOpcional(producto.BinLocation),
        LastCostPrice: numeroOpcional(producto.LastCostPrice),
        ReorderLevel: numeroOpcional(producto.ReorderLevel),
        TargetStockLevel: numeroOpcional(producto.TargetStockLevel),
        LastEditedBy: producto.LastEditedBy ?? 1,
        Version: producto.Version ?? null   // El procedimiento rechaza el cambio si otro usuario lo modificó.
    };
}
