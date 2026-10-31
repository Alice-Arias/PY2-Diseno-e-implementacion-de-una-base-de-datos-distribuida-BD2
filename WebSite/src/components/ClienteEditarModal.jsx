
import {
    X,
    Pencil,
    User,
    Tag,
    Users,
    Phone,
    MapPin,
    Save,
    Loader2
} from 'lucide-react';

// Hooks de React.
import { useEffect, useState } from 'react';

// Funciones de la API.
import {
    actualizarCliente,
    obtenerOpcionesClientes,
    obtenerDetalleClientes
} from '../services/api';

function ClienteEditarModal({
    cliente,
    onCerrar,
    onClienteActualizado,
    onMostrarMensaje
}) {

    // ========================================================
    // DATOS DEL FORMULARIO
    // ========================================================

    const [formulario, setFormulario] = useState({
        Nombre: '',
        CategoriaID: '',
        GrupoCompraID: '',
        ContactoPrimarioID: '',
        ContactoAlternativoID: '',
        ClienteFacturarID: '',
        MetodoEntregaID: '',
        CiudadEntregaID: '',
        LimiteCredito: '',
        Descuento: '0',
        DiasGracia: '7',
        Telefono: '',
        Fax: '',
        SitioWeb: '',
        DireccionEntrega1: '',
        DireccionEntrega2: '',
        CodigoPostal: '',
        DireccionPostal1: '',
        DireccionPostal2: '',
        UsuarioID: 1
    });

    // ========================================================
    // CAMPO ACTIVO
    // ========================================================

    const [campoActivo, setCampoActivo] = useState(null);

    // ========================================================
    // OPCIONES DE LOS SELECT
    // ========================================================

    const [opciones, setOpciones] = useState({
        categorias: [],
        gruposCompra: [],
        contactos: [],
        clientes: [],
        metodosEntrega: [],
        ciudades: []
    });

    // Indica si se están cargando las opciones de los select.
    const [cargandoOpciones, setCargandoOpciones] = useState(true);

    // Indica si se está cargando la información completa
    // del cliente seleccionado.
    const [cargandoCliente, setCargandoCliente] = useState(true);

    // Indica si se están guardando los cambios.
    const [guardando, setGuardando] = useState(false);

    // ========================================================
    // CLIENTE COMPLETO
    // ========================================================

    const [clienteCompleto, setClienteCompleto] = useState(null);

    // ========================================================
    // CARGAR OPCIONES
    // ========================================================

    useEffect(() => {

        const cargarOpciones = async () => {

            try {

                setCargandoOpciones(true);

                const data = await obtenerOpcionesClientes();

                console.log(
                    'Opciones cargadas:',
                    data
                );

                setOpciones({
                    categorias: data.categorias || [],
                    gruposCompra: data.gruposCompra || [],
                    contactos: data.contactos || [],
                    clientes: data.clientes || [],
                    metodosEntrega: data.metodosEntrega || [],
                    ciudades: data.ciudades || []
                });

            } catch (error) {

                console.error(
                    'Error cargando opciones:',
                    error
                );

                if (onMostrarMensaje) {

                    onMostrarMensaje({
                        tipo: 'error',
                        titulo: 'No se pudieron cargar las opciones',
                        mensaje:
                            error.message ||
                            'No fue posible cargar las opciones del formulario.'
                    });

                }

            } finally {

                setCargandoOpciones(false);

            }
        };

        cargarOpciones();

    }, [onMostrarMensaje]);

    // ========================================================
    // CARGAR INFORMACIÓN COMPLETA DEL CLIENTE
    // ========================================================

    useEffect(() => {

        const cargarClienteCompleto = async () => {

            if (!cliente?.CustomerID) {

                setClienteCompleto(null);
                setCargandoCliente(false);

                return;
            }

            try {

                setCargandoCliente(true);

                setCampoActivo(null);

                console.log(
                    'Cliente recibido para editar:',
                    cliente
                );

                console.log(
                    'Obteniendo información completa del cliente:',
                    cliente.CustomerID
                );

                // Obtenemos todos los datos del cliente
                // utilizando su CustomerID.
                const data = await obtenerDetalleClientes(
                    cliente.CustomerID
                );

                console.log(
                    'Cliente completo recibido:',
                    data
                );

                // Dependiendo de cómo responda el backend,
                // puede venir como objeto o como arreglo.
                const datosCliente = Array.isArray(data)
                    ? data[0]
                    : data;

                if (!datosCliente) {

                    throw new Error(
                        'No se encontró la información del cliente.'
                    );

                }

                setClienteCompleto(datosCliente);

            } catch (error) {

                console.error(
                    'Error obteniendo cliente:',
                    error
                );

                setClienteCompleto(null);

                if (onMostrarMensaje) {

                    onMostrarMensaje({
                        tipo: 'error',
                        titulo: 'No se pudo cargar el cliente',
                        mensaje:
                            error.message ||
                            'No fue posible obtener la información completa del cliente.'
                    });

                }

            } finally {

                setCargandoCliente(false);

            }
        };

        cargarClienteCompleto();

    }, [cliente, onMostrarMensaje]);

    // ========================================================
    // BUSCAR ID DE UNA OPCIÓN POR SU NOMBRE
    // ========================================================

    const buscarID = (lista, nombre) => {

        if (!nombre || !Array.isArray(lista)) {

            return '';

        }

        const nombreBuscado = String(nombre)
            .trim()
            .toLowerCase();

        const encontrado = lista.find((item) => {

            const nombreItem = String(
                item.Nombre ??
                item.Nombre_Categoria ??
                item.Nombre_Grupo ??
                item.Nombre_Contacto ??
                item.Nombre_Cliente ??
                item.Nombre_Metodo ??
                item.Nombre_Ciudad ??
                ''
            )
                .trim()
                .toLowerCase();

            return nombreItem === nombreBuscado;

        });

        return encontrado?.ID != null
            ? String(encontrado.ID)
            : '';
    };

    // ========================================================
    // CARGAR LOS DATOS DEL CLIENTE EN EL FORMULARIO
    // ========================================================

    useEffect(() => {

        if (!clienteCompleto) {

            return;

        }

        console.log(
            'Cargando datos del cliente en el formulario:',
            clienteCompleto
        );

        setCampoActivo(null);

        // ----------------------------------------------------
        // OBTENER LOS IDS
        // ----------------------------------------------------

        const categoriaID =
            clienteCompleto.Categoria_ID != null
                ? String(clienteCompleto.Categoria_ID)
                : buscarID(
                    opciones.categorias,
                    clienteCompleto.Categoria
                );

        const grupoCompraID =
            clienteCompleto.Grupo_Compra_ID != null
                ? String(clienteCompleto.Grupo_Compra_ID)
                : buscarID(
                    opciones.gruposCompra,
                    clienteCompleto.Grupo_Compra
                );

        const contactoPrimarioID =
            clienteCompleto.Contacto_Primario_ID != null
                ? String(clienteCompleto.Contacto_Primario_ID)
                : buscarID(
                    opciones.contactos,
                    clienteCompleto.Contacto_Primario
                );

        const contactoAlternativoID =
            clienteCompleto.Contacto_Alternativo_ID != null
                ? String(clienteCompleto.Contacto_Alternativo_ID)
                : buscarID(
                    opciones.contactos,
                    clienteCompleto.Contacto_Alternativo
                );

        const clienteFacturarID =
            clienteCompleto.Cliente_Por_Facturar_ID != null
                ? String(clienteCompleto.Cliente_Por_Facturar_ID)
                : buscarID(
                    opciones.clientes,
                    clienteCompleto.Cliente_Por_Facturar
                );

        const metodoEntregaID =
            clienteCompleto.Metodo_Entrega_ID != null
                ? String(clienteCompleto.Metodo_Entrega_ID)
                : buscarID(
                    opciones.metodosEntrega,
                    clienteCompleto.Metodo_Entrega
                );

        const ciudadEntregaID =
            clienteCompleto.Ciudad_Entrega_ID != null
                ? String(clienteCompleto.Ciudad_Entrega_ID)
                : buscarID(
                    opciones.ciudades,
                    clienteCompleto.Ciudad_Entrega
                );

        // ----------------------------------------------------
        // CARGAR TODO EL FORMULARIO
        // ----------------------------------------------------

        setFormulario({

            Nombre:
                clienteCompleto.Nombre_Cliente ??
                clienteCompleto.Nombre ??
                '',

            CategoriaID:
                categoriaID,

            GrupoCompraID:
                grupoCompraID,

            ContactoPrimarioID:
                contactoPrimarioID,

            ContactoAlternativoID:
                contactoAlternativoID,

            ClienteFacturarID:
                clienteFacturarID,

            MetodoEntregaID:
                metodoEntregaID,

            CiudadEntregaID:
                ciudadEntregaID,

            LimiteCredito:
                clienteCompleto.Limite_Credito ??
                clienteCompleto.LimiteCredito ??
                '',

            Descuento:
                clienteCompleto.Descuento ??
                '0',

            DiasGracia:
                clienteCompleto.Dias_De_Gracia ??
                clienteCompleto.DiasGracia ??
                '7',

            Telefono:
                clienteCompleto.Telefono ??
                '',

            Fax:
                clienteCompleto.Fax ??
                '',

            SitioWeb:
                clienteCompleto.Sitio_Web ??
                clienteCompleto.SitioWeb ??
                '',

            DireccionEntrega1:
                clienteCompleto.Direccion_Entrega1 ??
                '',

            DireccionEntrega2:
                clienteCompleto.Direccion_Entrega2 ??
                '',

            CodigoPostal:
                clienteCompleto.Codigo_Postal ??
                '',

            DireccionPostal1:
                clienteCompleto.Direccion_Postal1 ??
                '',

            DireccionPostal2:
                clienteCompleto.Direccion_Postal2 ??
                '',

            UsuarioID: 1

        });

    }, [
        clienteCompleto,
        opciones.categorias,
        opciones.gruposCompra,
        opciones.contactos,
        opciones.clientes,
        opciones.metodosEntrega,
        opciones.ciudades
    ]);

    // ========================================================
    // CAMBIAR CAMPO
    // ========================================================

    const cambiarCampo = (e) => {

        const { name, value } = e.target;

        setCampoActivo(name);

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value
        }));

    };

    // ========================================================
    // SELECCIONAR CAMPO
    // ========================================================

    const seleccionarCampo = (nombreCampo) => {

        setCampoActivo(nombreCampo);

    };

    // ========================================================
    // CLASE PARA CAMPOS
    // ========================================================

    const claseCampo = (nombreCampo) => {

        return campoActivo === nombreCampo
            ? 'campo-editando'
            : '';

    };

    // ========================================================
    // MOSTRAR ERROR
    // ========================================================

    const mostrarError = (mensaje) => {

        if (onMostrarMensaje) {

            onMostrarMensaje({
                tipo: 'error',
                titulo: 'Datos inválidos',
                mensaje
            });

        }

    };

    // ========================================================
    // VALIDAR FORMULARIO
    // ========================================================

    const validarFormulario = () => {

        // ----------------------------------------------------
        // NOMBRE
        // ----------------------------------------------------

        if (!formulario.Nombre.trim()) {

            mostrarError(
                'Debe ingresar el nombre del cliente.'
            );

            return false;
        }

        if (formulario.Nombre.trim().length > 100) {

            mostrarError(
                'El nombre del cliente no puede superar los 100 caracteres.'
            );

            return false;
        }

        // ----------------------------------------------------
        // CATEGORÍA
        // ----------------------------------------------------

        if (
            !formulario.CategoriaID ||
            Number(formulario.CategoriaID) <= 0
        ) {

            mostrarError(
                'Debe seleccionar una categoría.'
            );

            return false;
        }

        // ----------------------------------------------------
        // CONTACTO PRINCIPAL
        // ----------------------------------------------------

        if (
            !formulario.ContactoPrimarioID ||
            Number(formulario.ContactoPrimarioID) <= 0
        ) {

            mostrarError(
                'Debe seleccionar un contacto principal.'
            );

            return false;
        }

        // ----------------------------------------------------
        // MÉTODO DE ENTREGA
        // ----------------------------------------------------

        if (
            !formulario.MetodoEntregaID ||
            Number(formulario.MetodoEntregaID) <= 0
        ) {

            mostrarError(
                'Debe seleccionar un método de entrega.'
            );

            return false;
        }

        // ----------------------------------------------------
        // CIUDAD
        // ----------------------------------------------------

        if (
            !formulario.CiudadEntregaID ||
            Number(formulario.CiudadEntregaID) <= 0
        ) {

            mostrarError(
                'Debe seleccionar una ciudad de entrega.'
            );

            return false;
        }

        // ----------------------------------------------------
        // TELÉFONO
        // ----------------------------------------------------

        if (!formulario.Telefono.trim()) {

            mostrarError(
                'Debe ingresar el teléfono del cliente.'
            );

            return false;
        }

        if (formulario.Telefono.trim().length > 20) {

            mostrarError(
                'El teléfono no puede superar los 20 caracteres.'
            );

            return false;
        }

        // ----------------------------------------------------
        // FAX
        // ----------------------------------------------------

        if (formulario.Fax.trim().length > 20) {

            mostrarError(
                'El fax no puede superar los 20 caracteres.'
            );

            return false;
        }

        // ----------------------------------------------------
        // SITIO WEB
        // ----------------------------------------------------

        if (formulario.SitioWeb.trim()) {

            try {

                new URL(
                    formulario.SitioWeb.trim()
                );

            } catch {

                mostrarError(
                    'El sitio web no tiene un formato válido. Ejemplo: https://ejemplo.com'
                );

                return false;
            }
        }

        // ----------------------------------------------------
        // LÍMITE DE CRÉDITO
        // ----------------------------------------------------

        if (formulario.LimiteCredito !== '') {

            const limite =
                Number(formulario.LimiteCredito);

            if (isNaN(limite)) {

                mostrarError(
                    'El límite de crédito debe ser un número válido.'
                );

                return false;
            }

            if (limite < 0) {

                mostrarError(
                    'El límite de crédito no puede ser negativo.'
                );

                return false;
            }
        }

        // ----------------------------------------------------
        // DESCUENTO
        // ----------------------------------------------------

        const descuento =
            Number(formulario.Descuento);

        if (isNaN(descuento)) {

            mostrarError(
                'El descuento debe ser un número válido.'
            );

            return false;
        }

        if (
            descuento < 0 ||
            descuento > 100
        ) {

            mostrarError(
                'El descuento debe estar entre 0 y 100.'
            );

            return false;
        }

        // ----------------------------------------------------
        // DÍAS DE GRACIA
        // ----------------------------------------------------

        const diasGracia =
            Number(formulario.DiasGracia);

        if (isNaN(diasGracia)) {

            mostrarError(
                'Los días de gracia deben ser un número válido.'
            );

            return false;
        }

        if (
            diasGracia < 0 ||
            diasGracia > 365
        ) {

            mostrarError(
                'Los días de gracia deben estar entre 0 y 365.'
            );

            return false;
        }

        // ----------------------------------------------------
        // DIRECCIÓN DE ENTREGA
        // ----------------------------------------------------

        if (!formulario.DireccionEntrega1.trim()) {

            mostrarError(
                'Debe ingresar la dirección de entrega.'
            );

            return false;
        }

        if (
            formulario.DireccionEntrega1.trim().length > 60
        ) {

            mostrarError(
                'La dirección de entrega no puede superar los 60 caracteres.'
            );

            return false;
        }

        // ----------------------------------------------------
        // CÓDIGO POSTAL
        // ----------------------------------------------------

        if (!formulario.CodigoPostal.trim()) {

            mostrarError(
                'Debe ingresar el código postal.'
            );

            return false;
        }

        if (
            formulario.CodigoPostal.trim().length > 10
        ) {

            mostrarError(
                'El código postal no puede superar los 10 caracteres.'
            );

            return false;
        }

        // ----------------------------------------------------
        // DIRECCIÓN POSTAL
        // ----------------------------------------------------

        if (!formulario.DireccionPostal1.trim()) {

            mostrarError(
                'Debe ingresar la dirección postal.'
            );

            return false;
        }

        if (
            formulario.DireccionPostal1.trim().length > 60
        ) {

            mostrarError(
                'La dirección postal no puede superar los 60 caracteres.'
            );

            return false;
        }

        return true;
    };

    // ========================================================
    // ACTUALIZAR CLIENTE
    // ========================================================

    const guardarCambios = async (e) => {

        e.preventDefault();

        if (!cliente?.CustomerID) {

            mostrarError(
                'No se encontró el cliente que desea modificar.'
            );

            return;
        }

        if (!validarFormulario()) {

            return;
        }

        setGuardando(true);

        try {

            const datos = {

                ...formulario,

                Nombre:
                    formulario.Nombre.trim(),

                CategoriaID:
                    Number(formulario.CategoriaID),

                GrupoCompraID:
                    formulario.GrupoCompraID === ''
                        ? null
                        : Number(formulario.GrupoCompraID),

                ContactoPrimarioID:
                    Number(formulario.ContactoPrimarioID),

                ContactoAlternativoID:
                    formulario.ContactoAlternativoID === ''
                        ? null
                        : Number(formulario.ContactoAlternativoID),

                ClienteFacturarID:
                    formulario.ClienteFacturarID === ''
                        ? null
                        : Number(formulario.ClienteFacturarID),

                MetodoEntregaID:
                    Number(formulario.MetodoEntregaID),

                CiudadEntregaID:
                    Number(formulario.CiudadEntregaID),

                LimiteCredito:
                    formulario.LimiteCredito === ''
                        ? null
                        : Number(formulario.LimiteCredito),

                Descuento:
                    Number(formulario.Descuento),

                DiasGracia:
                    Number(formulario.DiasGracia),

                Telefono:
                    formulario.Telefono.trim(),

                Fax:
                    formulario.Fax.trim(),

                SitioWeb:
                    formulario.SitioWeb.trim(),

                DireccionEntrega1:
                    formulario.DireccionEntrega1.trim(),

                DireccionEntrega2:
                    formulario.DireccionEntrega2.trim(),

                CodigoPostal:
                    formulario.CodigoPostal.trim(),

                DireccionPostal1:
                    formulario.DireccionPostal1.trim(),

                DireccionPostal2:
                    formulario.DireccionPostal2.trim()

            };

            console.log(
                'Datos enviados para actualizar:',
                datos
            );

            const data =
                await actualizarCliente(
                    cliente.CustomerID,
                    datos
                );

            await onClienteActualizado(data);

        } catch (error) {

            console.error(
                'Error al actualizar cliente:',
                error
            );

            if (onMostrarMensaje) {

                onMostrarMensaje({
                    tipo: 'error',
                    titulo: 'No se puede actualizar el cliente',
                    mensaje:
                        error.message ||
                        'Ocurrió un error al actualizar el cliente.'
                });

            }

        } finally {

            setGuardando(false);

        }
    };

    // ========================================================
    // SI NO EXISTE CLIENTE
    // ========================================================

    if (!cliente) {

        return null;

    }

    // ========================================================
    // MOSTRAR CARGANDO
    // ========================================================

    if (cargandoCliente) {

        return (
            <div
                className="modal-fondo"
                onClick={onCerrar}
            >

                <div
                    className="modal-contenido modal-cliente-form"
                    onClick={(e) => e.stopPropagation()}
                >

                    <div
                        className="modal-cargando"
                    >

                        <Loader2
                            size={30}
                            className="girando"
                        />

                        <p>
                            Cargando información del cliente...
                        </p>

                    </div>

                </div>

            </div>
        );

    }

    // ========================================================
    // SI NO SE PUDO CARGAR EL CLIENTE
    // ========================================================

    if (!clienteCompleto) {

        return null;

    }

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
                onClick={(e) => e.stopPropagation()}
            >

                {/* ==================================================
                    ENCABEZADO
                ================================================== */}

                <header className="cd-encabezado">

                    <div className="cd-avatar">

                        <Pencil size={25} />

                    </div>

                    <div className="cd-titulo">

                        <h2>
                            Modificar cliente
                        </h2>

                        <p className="cd-subtitulo">
                            Actualice la información del cliente seleccionado.
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

                <form onSubmit={guardarCambios}>

                    {/* ==================================================
                        INFORMACIÓN PRINCIPAL
                    ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico azul">
                                <User size={18} />
                            </span>

                            Información principal

                        </h3>

                        <div className="form-grid">

                            {/* ID */}

                            <div className="campo">

                                <label>
                                    ID del cliente
                                </label>

                                <input
                                    type="text"
                                    value={
                                        cliente.CustomerID ?? ''
                                    }
                                    disabled
                                />

                            </div>

                            {/* NOMBRE */}

                            <div
                                className={`campo ${claseCampo('Nombre')}`}
                            >

                                <label>
                                    Nombre del cliente
                                </label>

                                <input
                                    type="text"
                                    name="Nombre"
                                    value={formulario.Nombre}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('Nombre')
                                    }
                                    required
                                    maxLength={100}
                                />

                            </div>

                            {/* CATEGORÍA */}

                            <div
                                className={`campo ${claseCampo('CategoriaID')}`}
                            >

                                <label>

                                    <Tag size={14} />

                                    Categoría

                                </label>

                                <select
                                    name="CategoriaID"
                                    value={formulario.CategoriaID}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('CategoriaID')
                                    }
                                    required
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">

                                        {cargandoOpciones
                                            ? 'Cargando categorías...'
                                            : 'Seleccione una categoría'}

                                    </option>

                                    {opciones.categorias.map(
                                        (categoria) => (

                                            <option
                                                key={categoria.ID}
                                                value={String(categoria.ID)}
                                            >
                                                {categoria.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* GRUPO DE COMPRA */}

                            <div
                                className={`campo ${claseCampo('GrupoCompraID')}`}
                            >

                                <label>

                                    <Users size={14} />

                                    Grupo de compra

                                </label>

                                <select
                                    name="GrupoCompraID"
                                    value={formulario.GrupoCompraID}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('GrupoCompraID')
                                    }
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">
                                        Sin grupo de compra
                                    </option>

                                    {opciones.gruposCompra.map(
                                        (grupo) => (

                                            <option
                                                key={grupo.ID}
                                                value={String(grupo.ID)}
                                            >
                                                {grupo.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* CONTACTO PRINCIPAL */}

                            <div
                                className={`campo ${claseCampo('ContactoPrimarioID')}`}
                            >

                                <label>
                                    Contacto principal
                                </label>

                                <select
                                    name="ContactoPrimarioID"
                                    value={formulario.ContactoPrimarioID}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('ContactoPrimarioID')
                                    }
                                    required
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">

                                        {cargandoOpciones
                                            ? 'Cargando contactos...'
                                            : 'Seleccione un contacto'}

                                    </option>

                                    {opciones.contactos.map(
                                        (contacto) => (

                                            <option
                                                key={contacto.ID}
                                                value={String(contacto.ID)}
                                            >
                                                {contacto.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* CONTACTO ALTERNATIVO */}

                            <div
                                className={`campo ${claseCampo('ContactoAlternativoID')}`}
                            >

                                <label>
                                    Contacto alternativo
                                </label>

                                <select
                                    name="ContactoAlternativoID"
                                    value={formulario.ContactoAlternativoID}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('ContactoAlternativoID')
                                    }
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">
                                        Sin contacto alternativo
                                    </option>

                                    {opciones.contactos.map(
                                        (contacto) => (

                                            <option
                                                key={contacto.ID}
                                                value={String(contacto.ID)}
                                            >
                                                {contacto.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* CLIENTE POR FACTURAR */}

                            <div
                                className={`campo ${claseCampo('ClienteFacturarID')}`}
                            >

                                <label>
                                    Cliente por facturar
                                </label>

                                <select
                                    name="ClienteFacturarID"
                                    value={formulario.ClienteFacturarID}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('ClienteFacturarID')
                                    }
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">
                                        El mismo cliente
                                    </option>

                                    {opciones.clientes.map(
                                        (clienteOpcion) => (

                                            <option
                                                key={clienteOpcion.ID}
                                                value={String(clienteOpcion.ID)}
                                            >
                                                {clienteOpcion.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                        </div>

                    </div>

                    {/* ==================================================
                        ENTREGA Y CONTACTO
                    ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico verde">
                                <Phone size={18} />
                            </span>

                            Entrega y contacto

                        </h3>

                        <div className="form-grid">

                            {/* MÉTODO */}

                            <div
                                className={`campo ${claseCampo('MetodoEntregaID')}`}
                            >

                                <label>
                                    Método de entrega
                                </label>

                                <select
                                    name="MetodoEntregaID"
                                    value={formulario.MetodoEntregaID}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('MetodoEntregaID')
                                    }
                                    required
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">

                                        {cargandoOpciones
                                            ? 'Cargando métodos...'
                                            : 'Seleccione un método'}

                                    </option>

                                    {opciones.metodosEntrega.map(
                                        (metodo) => (

                                            <option
                                                key={metodo.ID}
                                                value={String(metodo.ID)}
                                            >
                                                {metodo.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* CIUDAD */}

                            <div
                                className={`campo ${claseCampo('CiudadEntregaID')}`}
                            >

                                <label>
                                    Ciudad de entrega
                                </label>

                                <select
                                    name="CiudadEntregaID"
                                    value={formulario.CiudadEntregaID}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('CiudadEntregaID')
                                    }
                                    required
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">

                                        {cargandoOpciones
                                            ? 'Cargando ciudades...'
                                            : 'Seleccione una ciudad'}

                                    </option>

                                    {opciones.ciudades.map(
                                        (ciudad) => (

                                            <option
                                                key={ciudad.ID}
                                                value={String(ciudad.ID)}
                                            >
                                                {ciudad.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* TELÉFONO */}

                            <div
                                className={`campo ${claseCampo('Telefono')}`}
                            >

                                <label>

                                    <Phone size={14} />

                                    Teléfono

                                </label>

                                <input
                                    type="text"
                                    name="Telefono"
                                    value={formulario.Telefono}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('Telefono')
                                    }
                                    required
                                    maxLength={20}
                                />

                            </div>

                            {/* FAX */}

                            <div
                                className={`campo ${claseCampo('Fax')}`}
                            >

                                <label>
                                    Fax
                                </label>

                                <input
                                    type="text"
                                    name="Fax"
                                    value={formulario.Fax}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('Fax')
                                    }
                                    maxLength={20}
                                />

                            </div>

                            {/* SITIO WEB */}

                            <div
                                className={`campo campo-completo ${claseCampo('SitioWeb')}`}
                            >

                                <label>
                                    Sitio web
                                </label>

                                <input
                                    type="url"
                                    name="SitioWeb"
                                    value={formulario.SitioWeb}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('SitioWeb')
                                    }
                                    maxLength={256}
                                />

                            </div>

                        </div>

                    </div>

                    {/* ==================================================
                        INFORMACIÓN DE PAGO
                    ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico ambar">
                                📄
                            </span>

                            Información de pago

                        </h3>

                        <div className="form-grid">

                            {/* LÍMITE */}

                            <div
                                className={`campo ${claseCampo('LimiteCredito')}`}
                            >

                                <label>
                                    Límite de crédito
                                </label>

                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="LimiteCredito"
                                    value={formulario.LimiteCredito}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('LimiteCredito')
                                    }
                                />

                            </div>

                            {/* DESCUENTO */}

                            <div
                                className={`campo ${claseCampo('Descuento')}`}
                            >

                                <label>
                                    Descuento (%)
                                </label>

                                <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    max="100"
                                    name="Descuento"
                                    value={formulario.Descuento}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('Descuento')
                                    }
                                />

                            </div>

                            {/* DÍAS */}

                            <div
                                className={`campo ${claseCampo('DiasGracia')}`}
                            >

                                <label>
                                    Días de gracia
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    max="365"
                                    name="DiasGracia"
                                    value={formulario.DiasGracia}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('DiasGracia')
                                    }
                                />

                            </div>

                        </div>

                    </div>

                    {/* ==================================================
                        DIRECCIONES
                    ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico azul">
                                <MapPin size={18} />
                            </span>

                            Direcciones

                        </h3>

                        <div className="form-grid">

                            {/* DIRECCIÓN ENTREGA */}

                            <div
                                className={`campo campo-completo ${claseCampo('DireccionEntrega1')}`}
                            >

                                <label>
                                    Dirección de entrega
                                </label>

                                <input
                                    type="text"
                                    name="DireccionEntrega1"
                                    value={formulario.DireccionEntrega1}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('DireccionEntrega1')
                                    }
                                    required
                                    maxLength={60}
                                />

                            </div>

                            {/* DIRECCIÓN ENTREGA 2 */}

                            <div
                                className={`campo campo-completo ${claseCampo('DireccionEntrega2')}`}
                            >

                                <label>
                                    Dirección de entrega adicional
                                </label>

                                <input
                                    type="text"
                                    name="DireccionEntrega2"
                                    value={formulario.DireccionEntrega2}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('DireccionEntrega2')
                                    }
                                    maxLength={60}
                                />

                            </div>

                            {/* CÓDIGO POSTAL */}

                            <div
                                className={`campo ${claseCampo('CodigoPostal')}`}
                            >

                                <label>
                                    Código postal
                                </label>

                                <input
                                    type="text"
                                    name="CodigoPostal"
                                    value={formulario.CodigoPostal}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('CodigoPostal')
                                    }
                                    required
                                    maxLength={10}
                                />

                            </div>

                            {/* DIRECCIÓN POSTAL */}

                            <div
                                className={`campo ${claseCampo('DireccionPostal1')}`}
                            >

                                <label>
                                    Dirección postal
                                </label>

                                <input
                                    type="text"
                                    name="DireccionPostal1"
                                    value={formulario.DireccionPostal1}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('DireccionPostal1')
                                    }
                                    required
                                    maxLength={60}
                                />

                            </div>

                            {/* DIRECCIÓN POSTAL 2 */}

                            <div
                                className={`campo campo-completo ${claseCampo('DireccionPostal2')}`}
                            >

                                <label>
                                    Dirección postal adicional
                                </label>

                                <input
                                    type="text"
                                    name="DireccionPostal2"
                                    value={formulario.DireccionPostal2}
                                    onChange={cambiarCampo}
                                    onFocus={() =>
                                        seleccionarCampo('DireccionPostal2')
                                    }
                                    maxLength={60}
                                />

                            </div>

                        </div>

                    </div>

                    {/* ==================================================
                        BOTONES
                    ================================================== */}

                    <div className="modal-footer">

                        <button
                            type="button"
                            className="btn btn-claro"
                            onClick={onCerrar}
                            disabled={guardando}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="btn btn-azul"
                            disabled={
                                guardando ||
                                cargandoOpciones ||
                                cargandoCliente
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

                                    Guardar cambios

                                </>

                            )}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );
}

export default ClienteEditarModal;
