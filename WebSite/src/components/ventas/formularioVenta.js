/*---------------------------------------------------------------------------------------*
* NOMBRE: formularioVenta.js
*
* DESCRIPCION: Datos del formulario de ventas. Una venta tiene un ENCABEZADO (cliente,
* entrega, fecha, totales...) y una o varias LÍNEAS (producto, cantidad, precio...).
*   FORMULARIO_VACIO         valores iniciales al crear (encabezado + una línea).
*   encabezadoDesdeDetalle   encabezado de la API -> valores del formulario.
*   lineasDesdeDetalle       líneas de la API -> una lista de formularios (para editar).
*   soloEncabezado           quita los campos de la línea de un formulario.
*   validarVenta             revisa los datos (primer error o null).
*   datosParaApi             formulario -> lo que espera la API.
*
* ENTRADA: El formulario o el detalle de la venta.
*
* SALIDA: Valores, mensaje de error o datos para la API.
*
* OBJETIVO: Separar las reglas del formulario de la parte visual.
*-----------------------------------------------------------------------------------------*/

import { textoDe, idDe, numeroComoTexto, limpio, textoOpcional, idOpcional, primerError } from '../../utils/formulario';

const CAMPOS_LINEA = ['StockItemID', 'Description', 'PackageTypeID', 'Quantity', 'UnitPrice', 'TaxRate'];

export const FORMULARIO_VACIO = {
    CustomerID: '',
    BillToCustomerID: '',
    OrderID: '',
    DeliveryMethod: '',
    ContactPersonID: '',
    AccountsPersonID: '',
    SalespersonPersonID: '',
    PackedByPersonID: '',
    InvoiceDate: '',
    CustomerPurchaseOrderNumber: '',
    IsCreditNote: false,
    CreditNoteReason: '',
    Comments: '',
    DeliveryInstructions: '',
    InternalComments: '',
    TotalDryItems: '0',
    TotalChillerItems: '0',
    DeliveryRun: '',
    RunPosition: '',
    ReturnedDeliveryData: '',
    LastEditedBy: 1,
    StockItemID: '',
    Description: '',
    PackageTypeID: '',
    Quantity: '1',
    UnitPrice: '',
    TaxRate: '0'
};

export function encabezadoDesdeDetalle(encabezado) {
    return {
        CustomerID: idDe(encabezado.CustomerID),
        BillToCustomerID: idDe(encabezado.BillToCustomerID ?? encabezado.CustomerID),
        OrderID: idDe(encabezado.OrderID),
        DeliveryMethod: idDe(encabezado.DeliveryMethodID),
        ContactPersonID: idDe(encabezado.ContactPersonID),
        AccountsPersonID: idDe(encabezado.AccountsPersonID),
        SalespersonPersonID: idDe(encabezado.SalespersonPersonID),
        PackedByPersonID: idDe(encabezado.PackedByPersonID),
        InvoiceDate: encabezado.Fecha_Factura ? String(encabezado.Fecha_Factura).slice(0, 10) : '',
        CustomerPurchaseOrderNumber: textoDe(encabezado.Numero_Orden),
        IsCreditNote: Boolean(encabezado.IsCreditNote),
        CreditNoteReason: textoDe(encabezado.CreditNoteReason),
        Comments: textoDe(encabezado.Comments),
        DeliveryInstructions: textoDe(encabezado.Intrucciones_Entrega),
        InternalComments: textoDe(encabezado.InternalComments),
        TotalDryItems: numeroComoTexto(encabezado.TotalDryItems, '0'),
        TotalChillerItems: numeroComoTexto(encabezado.TotalChillerItems, '0'),
        DeliveryRun: textoDe(encabezado.DeliveryRun),
        RunPosition: textoDe(encabezado.RunPosition),
        ReturnedDeliveryData: textoDe(encabezado.ReturnedDeliveryData),
        LastEditedBy: 1
    };
}

function lineaDesdeDetalle(linea) {
    return {
        StockItemID: idDe(linea.StockItemID),
        Description: textoDe(linea.Description ?? linea.Producto),
        PackageTypeID: idDe(linea.PackageTypeID),
        Quantity: numeroComoTexto(linea.Cantidad, '1'),
        UnitPrice: numeroComoTexto(linea.Precio_Unitario, ''),
        TaxRate: numeroComoTexto(linea.Impuesto_Aplicado, '0')
    };
}

/* Cada línea de la factura con los datos del encabezado (así se envía cada una a la API). */
export function lineasDesdeDetalle(encabezado, lineas) {
    const datosFactura = encabezadoDesdeDetalle(encabezado);
    return (lineas || []).map((linea) => ({ ...datosFactura, ...lineaDesdeDetalle(linea) }));
}

export function soloEncabezado(formulario) {
    return Object.fromEntries(Object.entries(formulario || {}).filter(([campo]) => !CAMPOS_LINEA.includes(campo)));
}

const enteroNoNegativo = (valor) => limpio(valor) !== '' && Number.isInteger(Number(valor)) && Number(valor) >= 0;

export function validarVenta(venta) {
    const cantidad = Number(venta.Quantity);
    const impuesto = Number(venta.TaxRate);

    return primerError([
        !venta.CustomerID && 'Debe seleccionar un cliente.',
        !venta.BillToCustomerID && 'Debe seleccionar a quién se factura.',
        !venta.DeliveryMethod && 'Debe seleccionar un método de entrega.',
        !venta.ContactPersonID && 'Debe seleccionar la persona de contacto.',
        !venta.AccountsPersonID && 'Debe seleccionar la persona de cuentas.',
        !venta.SalespersonPersonID && 'Debe seleccionar un vendedor.',
        !venta.PackedByPersonID && 'Debe seleccionar quién empacó el pedido.',
        !limpio(venta.InvoiceDate) && 'Debe ingresar la fecha de la factura.',
        !enteroNoNegativo(venta.TotalDryItems) &&
            'El total de artículos secos debe ser un número entero mayor o igual a 0.',
        !enteroNoNegativo(venta.TotalChillerItems) &&
            'El total de artículos refrigerados debe ser un número entero mayor o igual a 0.',
        venta.IsCreditNote && !limpio(venta.CreditNoteReason) && 'Debe indicar el motivo de la nota de crédito.',
        !venta.StockItemID && 'Debe seleccionar un producto.',
        !limpio(venta.Description) && 'Debe ingresar una descripción para la línea.',
        limpio(venta.Description).length > 100 && 'La descripción no puede superar los 100 caracteres.',
        !venta.PackageTypeID && 'Debe seleccionar un tipo de empaque.',
        (limpio(venta.Quantity) === '' || !Number.isInteger(cantidad) || cantidad <= 0) &&
            'La cantidad debe ser un número entero mayor que 0.',
        (limpio(venta.TaxRate) === '' || isNaN(impuesto) || impuesto < 0 || impuesto > 100) &&
            'El impuesto debe estar entre 0 y 100.',
        limpio(venta.UnitPrice) !== '' && Number(venta.UnitPrice) < 0 && 'El precio unitario no puede ser negativo.'
    ]);
}

export function datosParaApi(venta) {
    return {
        CustomerID: Number(venta.CustomerID),
        BillToCustomerID: Number(venta.BillToCustomerID),
        OrderID: idOpcional(venta.OrderID),
        DeliveryMethod: Number(venta.DeliveryMethod),
        ContactPersonID: Number(venta.ContactPersonID),
        AccountsPersonID: Number(venta.AccountsPersonID),
        SalespersonPersonID: Number(venta.SalespersonPersonID),
        PackedByPersonID: Number(venta.PackedByPersonID),
        InvoiceDate: limpio(venta.InvoiceDate),
        CustomerPurchaseOrderNumber: textoOpcional(venta.CustomerPurchaseOrderNumber),
        IsCreditNote: Boolean(venta.IsCreditNote),
        CreditNoteReason: textoOpcional(venta.CreditNoteReason),
        Comments: textoOpcional(venta.Comments),
        DeliveryInstructions: textoOpcional(venta.DeliveryInstructions),
        InternalComments: textoOpcional(venta.InternalComments),
        TotalDryItems: Number(venta.TotalDryItems),
        TotalChillerItems: Number(venta.TotalChillerItems),
        DeliveryRun: textoOpcional(venta.DeliveryRun),
        RunPosition: textoOpcional(venta.RunPosition),
        ReturnedDeliveryData: textoOpcional(venta.ReturnedDeliveryData),
        LastEditedBy: venta.LastEditedBy ?? 1,
        StockItemID: Number(venta.StockItemID),
        Description: limpio(venta.Description),
        PackageTypeID: Number(venta.PackageTypeID),
        Quantity: Number(venta.Quantity),
        UnitPrice: limpio(venta.UnitPrice) === '' ? null : Number(venta.UnitPrice),
        TaxRate: Number(venta.TaxRate)
    };
}
