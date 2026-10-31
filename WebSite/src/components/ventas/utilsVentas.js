

// ------------------------------------------------------------
// VALORES INICIALES
// ------------------------------------------------------------

export const FORMULARIO_VACIO = {

    // Factura
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

    // Línea de producto
    StockItemID: '',
    Description: '',
    PackageTypeID: '',
    Quantity: '1',
    UnitPrice: '',
    TaxRate: '0'
};



export function formularioDesdeDetalle(encabezado, primeraLinea) {

    const texto = (valor) => valor ?? '';

    const id = (valor) =>
        valor != null ? String(valor) : '';

    const linea = primeraLinea || {};

    // La fecha viene como datetime completo.
    // El input type="date" necesita solamente AAAA-MM-DD.
    const fecha = encabezado.Fecha_Factura
        ? String(encabezado.Fecha_Factura).slice(0, 10)
        : '';

    return {

        // ----------------------------------------------------
        // DATOS DE LA FACTURA
        // ----------------------------------------------------

        CustomerID: id(encabezado.CustomerID),

        BillToCustomerID: id(
            encabezado.BillToCustomerID ??
            encabezado.CustomerID
        ),

        OrderID: id(encabezado.OrderID),

        DeliveryMethod: id(
            encabezado.DeliveryMethodID
        ),

        ContactPersonID: id(
            encabezado.ContactPersonID
        ),

        AccountsPersonID: id(
            encabezado.AccountsPersonID
        ),

        SalespersonPersonID: id(
            encabezado.SalespersonPersonID
        ),

        PackedByPersonID: id(
            encabezado.PackedByPersonID
        ),

        InvoiceDate: fecha,

        CustomerPurchaseOrderNumber:
            texto(encabezado.Numero_Orden),

        IsCreditNote:
            Boolean(encabezado.IsCreditNote),

        CreditNoteReason:
            texto(encabezado.CreditNoteReason),

        Comments:
            texto(encabezado.Comments),

        DeliveryInstructions:
            texto(encabezado.Intrucciones_Entrega),

        InternalComments:
            texto(encabezado.InternalComments),

        TotalDryItems:
            encabezado.TotalDryItems != null
                ? String(encabezado.TotalDryItems)
                : '0',

        TotalChillerItems:
            encabezado.TotalChillerItems != null
                ? String(encabezado.TotalChillerItems)
                : '0',

        DeliveryRun:
            texto(encabezado.DeliveryRun),

        RunPosition:
            texto(encabezado.RunPosition),

        ReturnedDeliveryData:
            texto(encabezado.ReturnedDeliveryData),

        LastEditedBy: 1,

        // ----------------------------------------------------
        // LÍNEA DE PRODUCTO
        // ----------------------------------------------------

        StockItemID:
            id(linea.StockItemID),

        Description:
            texto(
                linea.Description ??
                linea.Producto
            ),

        PackageTypeID:
            id(linea.PackageTypeID),

        Quantity:
            linea.Cantidad != null
                ? String(linea.Cantidad)
                : '1',

        UnitPrice:
            linea.Precio_Unitario != null
                ? String(linea.Precio_Unitario)
                : '',

        TaxRate:
            linea.Impuesto_Aplicado != null
                ? String(linea.Impuesto_Aplicado)
                : '0'
    };
}



export function formulariosDesdeDetalle(encabezado, lineas) {

    const texto = (valor) => valor ?? '';

    const id = (valor) =>
        valor != null ? String(valor) : '';

    const fecha = encabezado.Fecha_Factura
        ? String(encabezado.Fecha_Factura).slice(0, 10)
        : '';

    // --------------------------------------------------------
    // DATOS COMUNES DE LA FACTURA
    // --------------------------------------------------------

    const datosFactura = {

        CustomerID:
            id(encabezado.CustomerID),

        BillToCustomerID:
            id(
                encabezado.BillToCustomerID ??
                encabezado.CustomerID
            ),

        OrderID:
            id(encabezado.OrderID),

        DeliveryMethod:
            id(encabezado.DeliveryMethodID),

        ContactPersonID:
            id(encabezado.ContactPersonID),

        AccountsPersonID:
            id(encabezado.AccountsPersonID),

        SalespersonPersonID:
            id(encabezado.SalespersonPersonID),

        PackedByPersonID:
            id(encabezado.PackedByPersonID),

        InvoiceDate:
            fecha,

        CustomerPurchaseOrderNumber:
            texto(encabezado.Numero_Orden),

        IsCreditNote:
            Boolean(encabezado.IsCreditNote),

        CreditNoteReason:
            texto(encabezado.CreditNoteReason),

        Comments:
            texto(encabezado.Comments),

        DeliveryInstructions:
            texto(encabezado.Intrucciones_Entrega),

        InternalComments:
            texto(encabezado.InternalComments),

        TotalDryItems:
            encabezado.TotalDryItems != null
                ? String(encabezado.TotalDryItems)
                : '0',

        TotalChillerItems:
            encabezado.TotalChillerItems != null
                ? String(encabezado.TotalChillerItems)
                : '0',

        DeliveryRun:
            texto(encabezado.DeliveryRun),

        RunPosition:
            texto(encabezado.RunPosition),

        ReturnedDeliveryData:
            texto(encabezado.ReturnedDeliveryData),

        LastEditedBy: 1
    };

    // --------------------------------------------------------
    // CONVERTIR CADA LÍNEA REAL
    // --------------------------------------------------------

    return (lineas || []).map((linea) => ({

        ...datosFactura,

        // Estos valores vienen de la línea existente.
        StockItemID:
            id(linea.StockItemID),

        Description:
            texto(
                linea.Description ??
                linea.Producto
            ),

        PackageTypeID:
            id(linea.PackageTypeID),

        Quantity:
            linea.Cantidad != null
                ? String(linea.Cantidad)
                : '1',

        UnitPrice:
            linea.Precio_Unitario != null
                ? String(linea.Precio_Unitario)
                : '',

        TaxRate:
            linea.Impuesto_Aplicado != null
                ? String(linea.Impuesto_Aplicado)
                : '0'
    }));
}


// ------------------------------------------------------------
// VALIDACIÓN
//
// Devuelve el primer mensaje de error que encuentre,
// o null si todo está bien.
// ------------------------------------------------------------

export function validarVenta(f) {

    const t = (valor) =>
        String(valor ?? '').trim();

    const cantidad =
        Number(f.Quantity);

    const impuesto =
        Number(f.TaxRate);

    const secos =
        Number(f.TotalDryItems);

    const frios =
        Number(f.TotalChillerItems);

    const reglas = [

        // ----------------------------------------------------
        // CLIENTE Y FACTURACIÓN
        // ----------------------------------------------------

        !f.CustomerID &&
            'Debe seleccionar un cliente.',

        !f.BillToCustomerID &&
            'Debe seleccionar a quién se factura.',

        // ----------------------------------------------------
        // ENTREGA Y CONTACTO
        // ----------------------------------------------------

        !f.DeliveryMethod &&
            'Debe seleccionar un método de entrega.',

        !f.ContactPersonID &&
            'Debe seleccionar la persona de contacto.',

        !f.AccountsPersonID &&
            'Debe seleccionar la persona de cuentas.',

        !f.SalespersonPersonID &&
            'Debe seleccionar un vendedor.',

        !f.PackedByPersonID &&
            'Debe seleccionar quién empacó el pedido.',

        // ----------------------------------------------------
        // FECHA
        // ----------------------------------------------------

        !t(f.InvoiceDate) &&
            'Debe ingresar la fecha de la factura.',

        // ----------------------------------------------------
        // TOTALES
        // ----------------------------------------------------

        (
            t(f.TotalDryItems) === '' ||
            !Number.isInteger(secos) ||
            secos < 0
        ) &&
            'El total de artículos secos debe ser un número entero mayor o igual a 0.',

        (
            t(f.TotalChillerItems) === '' ||
            !Number.isInteger(frios) ||
            frios < 0
        ) &&
            'El total de artículos refrigerados debe ser un número entero mayor o igual a 0.',

        // ----------------------------------------------------
        // NOTA DE CRÉDITO
        // ----------------------------------------------------

        f.IsCreditNote &&
        !t(f.CreditNoteReason) &&
            'Debe indicar el motivo de la nota de crédito.',

        // ----------------------------------------------------
        // LÍNEA DE PRODUCTO
        // ----------------------------------------------------

        !f.StockItemID &&
            'Debe seleccionar un producto.',

        !t(f.Description) &&
            'Debe ingresar una descripción para la línea.',

        t(f.Description).length > 100 &&
            'La descripción no puede superar los 100 caracteres.',

        !f.PackageTypeID &&
            'Debe seleccionar un tipo de empaque.',

        (
            t(f.Quantity) === '' ||
            !Number.isInteger(cantidad) ||
            cantidad <= 0
        ) &&
            'La cantidad debe ser un número entero mayor que 0.',

        (
            t(f.TaxRate) === '' ||
            isNaN(impuesto) ||
            impuesto < 0 ||
            impuesto > 100
        ) &&
            'El impuesto debe estar entre 0 y 100.',

        t(f.UnitPrice) !== '' &&
        Number(f.UnitPrice) < 0 &&
            'El precio unitario no puede ser negativo.'
    ];

    return reglas.find(Boolean) || null;
}


// ------------------------------------------------------------
// FORMULARIO → DATOS PARA LA API
// ------------------------------------------------------------

export function armarDatos(f) {

    const t = (valor) =>
        String(valor ?? '').trim();

    const opcional = (valor) =>
        t(valor) === ''
            ? null
            : t(valor);

    const idOpcional = (valor) =>
        valor === '' || valor == null
            ? null
            : Number(valor);

    return {

        // ----------------------------------------------------
        // FACTURA
        // ----------------------------------------------------

        CustomerID:
            Number(f.CustomerID),

        BillToCustomerID:
            Number(f.BillToCustomerID),

        OrderID:
            idOpcional(f.OrderID),

        DeliveryMethod:
            Number(f.DeliveryMethod),

        ContactPersonID:
            Number(f.ContactPersonID),

        AccountsPersonID:
            Number(f.AccountsPersonID),

        SalespersonPersonID:
            Number(f.SalespersonPersonID),

        PackedByPersonID:
            Number(f.PackedByPersonID),

        InvoiceDate:
            t(f.InvoiceDate),

        CustomerPurchaseOrderNumber:
            opcional(
                f.CustomerPurchaseOrderNumber
            ),

        IsCreditNote:
            Boolean(f.IsCreditNote),

        CreditNoteReason:
            opcional(
                f.CreditNoteReason
            ),

        Comments:
            opcional(f.Comments),

        DeliveryInstructions:
            opcional(
                f.DeliveryInstructions
            ),

        InternalComments:
            opcional(
                f.InternalComments
            ),

        TotalDryItems:
            Number(f.TotalDryItems),

        TotalChillerItems:
            Number(f.TotalChillerItems),

        DeliveryRun:
            opcional(f.DeliveryRun),

        RunPosition:
            opcional(f.RunPosition),

        ReturnedDeliveryData:
            opcional(
                f.ReturnedDeliveryData
            ),

        LastEditedBy:
            f.LastEditedBy ?? 1,

        // ----------------------------------------------------
        // LÍNEA DE PRODUCTO
        // ----------------------------------------------------

        StockItemID:
            Number(f.StockItemID),

        Description:
            t(f.Description),

        PackageTypeID:
            Number(f.PackageTypeID),

        Quantity:
            Number(f.Quantity),

        UnitPrice:
            t(f.UnitPrice) === ''
                ? null
                : Number(f.UnitPrice),

        TaxRate:
            Number(f.TaxRate)
    };
}