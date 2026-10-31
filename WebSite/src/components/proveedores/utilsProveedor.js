/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Utilidades del formulario de proveedores (FORMULARIO_VACIO, formularioDesdeDetalle,
* validarProveedor y armarDatos)
*
* DESCRIPCION: Modulo de apoyo para los formularios de proveedores (crear y editar).
* Exporta cuatro elementos: FORMULARIO_VACIO (valores iniciales del formulario),
* formularioDesdeDetalle (convierte el detalle devuelto por la API en datos de
* formulario), validarProveedor (valida los campos y devuelve el primer error) y
* armarDatos (convierte el formulario en el objeto que se envia a la API).
*
* ENTRADA: Segun la funcion: el detalle de un proveedor (formularioDesdeDetalle) o el
* objeto del formulario (validarProveedor y armarDatos).
*
* SALIDA: Un objeto de formulario, un mensaje de error o null, y un objeto de datos para
* la API, segun la funcion.
*
* RESTRICCIONES: Los limites de longitud de la validacion deben coincidir con los
* tamanos de los parametros de los procedimientos almacenados. El UsuarioID se envia con
* el valor fijo 1. Este archivo no contiene componentes ni JSX.
*
* OBJETIVO: Centralizar la logica de valores iniciales, conversion, validacion y armado
* de datos de los formularios de proveedores, para reutilizarla en los modales.
*
*---------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------*
*
* NOMBRE: FORMULARIO_VACIO
*
* DESCRIPCION: Objeto con los valores iniciales del formulario de proveedores. Todos los
* campos de texto y los IDs comienzan como texto vacio, los dias de pago comienzan en
* '7' y el UsuarioID en 1.
*
* ENTRADA: Ninguna.
*
* SALIDA: Objeto con todos los campos del formulario.
*
* RESTRICCIONES: Debe contener todas las llaves que usan el formulario, la validacion y
* armarDatos.
*
* OBJETIVO: Servir como estado inicial al crear un nuevo proveedor.
*
*---------------------------------------------------------------------------------------*/

export const FORMULARIO_VACIO = {
    Nombre: '',
    ReferenciaProveedor: '',
    CategoriaID: '',
    ContactoPrimarioID: '',
    ContactoAlternativoID: '',
    MetodoEntregaID: '',
    CiudadEntregaID: '',
    CiudadPostalID: '',
    Telefono: '',
    Fax: '',
    SitioWeb: '',
    NombreCuentaBancaria: '',
    SucursalBancaria: '',
    CodigoBanco: '',
    NumeroCuentaBancaria: '',
    CodigoInternacionalBanco: '',
    DiasPago: '7',
    ComentariosInternos: '',
    DireccionEntrega1: '',
    DireccionEntrega2: '',
    CodigoPostalEntrega: '',
    DireccionPostal1: '',
    DireccionPostal2: '',
    CodigoPostalPostal: '',
    UsuarioID: 1
};


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: formularioDesdeDetalle
*
* DESCRIPCION: Convierte el detalle de un proveedor (resultado de
* SP_Proveedores_Detalle) en un objeto con la estructura del formulario. Los select
* trabajan con texto, por eso los IDs se convierten a String, y los valores null pasan a
* texto vacio para los inputs. Si el detalle no trae la ciudad postal, se usa la ciudad
* de entrega. Si no trae los dias de gracia, se usa '7'.
*
* ENTRADA: d - objeto con el detalle del proveedor devuelto por la API.
*
* SALIDA: Objeto con los campos del formulario, con IDs como texto y sin valores null.
*
* RESTRICCIONES: Los campos Ciudad_Postal_ID y Codigo_Postal_Postal solo llegan si
* SP_Proveedores_Detalle devuelve PostalCityID y PostalPostalCode. El UsuarioID se
* establece en 1.
*
* OBJETIVO: Cargar los datos de un proveedor existente en el formulario de edicion.
*
*---------------------------------------------------------------------------------------*/

export function formularioDesdeDetalle(d) {

    const texto = (valor) => valor ?? '';

    const id = (valor) =>
        valor != null ? String(valor) : '';

    return {
        Nombre: texto(d.Nombre_Proveedor),
        ReferenciaProveedor: texto(d.Referencia_Proveedor),

        CategoriaID: id(d.Categoria_ID),
        ContactoPrimarioID: id(d.Contacto_Primario_ID),
        ContactoAlternativoID: id(d.Contacto_Alternativo_ID),
        MetodoEntregaID: id(d.Metodo_Entrega_ID),
        CiudadEntregaID: id(d.Ciudad_Entrega_ID),

        // Estos dos campos solo llegan si SP_Proveedores_Detalle
        // devuelve PostalCityID y PostalPostalCode.
        CiudadPostalID: id(d.Ciudad_Postal_ID ?? d.Ciudad_Entrega_ID),
        CodigoPostalPostal: texto(d.Codigo_Postal_Postal),

        Telefono: texto(d.Telefono),
        Fax: texto(d.Fax),
        SitioWeb: texto(d.Sitio_Web),

        NombreCuentaBancaria: texto(d.Nombre_Cuenta_Bancaria),
        SucursalBancaria: texto(d.Sucursal_Cuenta_Bancaria),
        CodigoBanco: texto(d.Codigo_Cuenta_Bancaria),
        NumeroCuentaBancaria: texto(d.Numero_Cuenta_Bancaria),
        CodigoInternacionalBanco: texto(d.Codigo_Bancario_Internacional),

        DiasPago:
            d.Dias_De_Gracia != null
                ? String(d.Dias_De_Gracia)
                : '7',

        ComentariosInternos: texto(d.Comentarios_Internos),

        DireccionEntrega1: texto(d.Direccion_Entrega1),
        DireccionEntrega2: texto(d.Direccion_Entrega2),
        CodigoPostalEntrega: texto(d.Codigo_Postal_Entrega),

        DireccionPostal1: texto(d.Direccion_Postal1),
        DireccionPostal2: texto(d.Direccion_Postal2),

        UsuarioID: 1
    };
}


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: validarProveedor
*
* DESCRIPCION: Valida los campos del formulario de proveedores y devuelve el PRIMER
* mensaje de error que encuentre, o null si todo esta bien. Revisa, en este orden, la
* informacion principal, la entrega y contacto, los datos bancarios y de pago, y las
* direcciones. Verifica campos obligatorios, longitudes maximas, que el sitio web
* empiece con http:// o https:// y que los dias de gracia sean un entero entre 0 y 365.
* Los limites coinciden con los tamanos de los parametros de los procedimientos
* almacenados.
*
* ENTRADA: f - objeto con los datos del formulario.
*
* SALIDA: Texto con el primer mensaje de error, o null si no hay errores.
*
* RESTRICCIONES: El objeto debe tener las mismas llaves que FORMULARIO_VACIO. Los
* espacios al inicio y al final se ignoran al medir longitudes y comprobar campos
* vacios. Los mensajes devueltos son texto visible para el usuario.
*
* OBJETIVO: Evitar enviar a la API datos incompletos o que excedan los limites de la
* base de datos.
*
*---------------------------------------------------------------------------------------*/

export function validarProveedor(f) {

    const t = (valor) => String(valor ?? '').trim();

    const dias = Number(f.DiasPago);

    const reglas = [

        // ---------- Informacion principal ----------

        !t(f.Nombre) &&
            'Debe ingresar el nombre del proveedor.',

        t(f.Nombre).length > 100 &&
            'El nombre del proveedor no puede superar los 100 caracteres.',

        t(f.ReferenciaProveedor).length > 20 &&
            'El código del proveedor no puede superar los 20 caracteres.',

        !f.CategoriaID &&
            'Debe seleccionar una categoría.',

        !f.ContactoPrimarioID &&
            'Debe seleccionar un contacto principal.',

        // ---------- Entrega y contacto ----------

        !f.MetodoEntregaID &&
            'Debe seleccionar un método de entrega.',

        !f.CiudadEntregaID &&
            'Debe seleccionar una ciudad de entrega.',

        !t(f.Telefono) &&
            'Debe ingresar el teléfono del proveedor.',

        t(f.Telefono).length > 20 &&
            'El teléfono no puede superar los 20 caracteres.',

        t(f.Fax).length > 20 &&
            'El fax no puede superar los 20 caracteres.',

        t(f.SitioWeb) &&
        !/^https?:\/\//i.test(t(f.SitioWeb)) &&
            'El sitio web debe empezar con http:// o https://',

        // ---------- Datos bancarios y de pago ----------

        t(f.SucursalBancaria).length > 50 &&
            'El banco y sucursal no puede superar los 50 caracteres.',

        t(f.NombreCuentaBancaria).length > 50 &&
            'El titular de la cuenta no puede superar los 50 caracteres.',

        t(f.NumeroCuentaBancaria).length > 50 &&
            'El número de cuenta no puede superar los 50 caracteres.',

        t(f.CodigoBanco).length > 20 &&
            'El código del banco no puede superar los 20 caracteres.',

        t(f.CodigoInternacionalBanco).length > 20 &&
            'El código internacional no puede superar los 20 caracteres.',

        (t(f.DiasPago) === '' || !Number.isInteger(dias)) &&
            'Los días de gracia deben ser un número entero.',

        (dias < 0 || dias > 365) &&
            'Los días de gracia deben estar entre 0 y 365.',

        // ---------- Direcciones ----------

        !t(f.DireccionEntrega1) &&
            'Debe ingresar la dirección de entrega.',

        t(f.DireccionEntrega1).length > 60 &&
            'La dirección de entrega no puede superar los 60 caracteres.',

        t(f.DireccionEntrega2).length > 60 &&
            'La dirección de entrega adicional no puede superar los 60 caracteres.',

        !t(f.CodigoPostalEntrega) &&
            'Debe ingresar el código postal de entrega.',

        t(f.CodigoPostalEntrega).length > 10 &&
            'El código postal de entrega no puede superar los 10 caracteres.',

        !f.CiudadPostalID &&
            'Debe seleccionar la ciudad de la dirección postal.',

        !t(f.DireccionPostal1) &&
            'Debe ingresar la dirección postal.',

        t(f.DireccionPostal1).length > 60 &&
            'La dirección postal no puede superar los 60 caracteres.',

        t(f.DireccionPostal2).length > 60 &&
            'La dirección postal adicional no puede superar los 60 caracteres.',

        !t(f.CodigoPostalPostal) &&
            'Debe ingresar el código postal de la dirección postal.',

        t(f.CodigoPostalPostal).length > 10 &&
            'El código postal de la dirección postal no puede superar los 10 caracteres.'
    ];

    return reglas.find(Boolean) || null;
}


/*---------------------------------------------------------------------------------------*
*
* NOMBRE: armarDatos
*
* DESCRIPCION: Convierte el objeto del formulario en el objeto de datos que se envia a
* la API. Los IDs obligatorios pasan a numero, los IDs opcionales vacios pasan a null,
* los textos obligatorios se limpian de espacios y los textos opcionales vacios se
* envian como null. Los dias de pago pasan a numero y el UsuarioID usa el valor del
* formulario o 1 si no existe.
*
* ENTRADA: f - objeto con los datos del formulario.
*
* SALIDA: Objeto con los datos listos para enviar a la API.
*
* RESTRICCIONES: Debe llamarse despues de validarProveedor, ya que no valida los datos.
* Los campos Telefono, Fax y SitioWeb se envian como texto aunque esten vacios (no se
* convierten a null).
*
* OBJETIVO: Preparar los datos del formulario en el formato que espera la API.
*
*---------------------------------------------------------------------------------------*/

export function armarDatos(f) {

    const t = (valor) => String(valor ?? '').trim();

    // Texto opcional: '' se convierte en null.
    const opcional = (valor) =>
        t(valor) === '' ? null : t(valor);

    // ID opcional: '' se convierte en null.
    const idOpcional = (valor) =>
        valor === '' || valor == null ? null : Number(valor);

    return {
        Nombre: t(f.Nombre),
        CategoriaID: Number(f.CategoriaID),
        ContactoPrimarioID: Number(f.ContactoPrimarioID),
        ContactoAlternativoID: idOpcional(f.ContactoAlternativoID),
        MetodoEntregaID: Number(f.MetodoEntregaID),
        CiudadEntregaID: Number(f.CiudadEntregaID),
        CiudadPostalID: Number(f.CiudadPostalID),

        ReferenciaProveedor: opcional(f.ReferenciaProveedor),
        NombreCuentaBancaria: opcional(f.NombreCuentaBancaria),
        SucursalBancaria: opcional(f.SucursalBancaria),
        CodigoBanco: opcional(f.CodigoBanco),
        NumeroCuentaBancaria: opcional(f.NumeroCuentaBancaria),
        CodigoInternacionalBanco: opcional(f.CodigoInternacionalBanco),

        DiasPago: Number(f.DiasPago),
        ComentariosInternos: opcional(f.ComentariosInternos),

        Telefono: t(f.Telefono),
        Fax: t(f.Fax),
        SitioWeb: t(f.SitioWeb),

        DireccionEntrega1: t(f.DireccionEntrega1),
        DireccionEntrega2: opcional(f.DireccionEntrega2),
        CodigoPostalEntrega: t(f.CodigoPostalEntrega),

        DireccionPostal1: t(f.DireccionPostal1),
        DireccionPostal2: opcional(f.DireccionPostal2),
        CodigoPostalPostal: t(f.CodigoPostalPostal),

        UsuarioID: f.UsuarioID ?? 1
    };
}