/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Modal para crear un nuevo cliente (ClienteNuevoModal)
*
* DESCRIPCION: Componente que muestra una ventana modal con un formulario para registrar
* un nuevo cliente. El formulario esta dividido en cuatro paneles: Informacion
* principal (nombre, categoria, grupo de compra, contactos y cliente por facturar),
* Entrega y contacto (metodo de entrega, ciudad, telefono, fax y sitio web),
* Informacion de pago (limite de credito, descuento y dias de gracia) y Direcciones
* (direccion de entrega, direccion postal y codigo postal). Al abrirse carga desde la
* API las opciones de las listas desplegables (categorias, grupos de compra, contactos,
* clientes, metodos de entrega y ciudades). Al enviar el formulario convierte los campos
* numericos, guarda el cliente mediante la API y le avisa al componente padre. Mientras
* se cargan las opciones o se guarda el cliente, los controles se deshabilitan y se
* muestra un indicador de progreso.
*
* ENTRADA: onCerrar - funcion que cierra el modal. Se ejecuta al presionar la X, el
* boton Cancelar o al hacer clic en el fondo.
* onClienteCreado - funcion del componente padre que se ejecuta cuando el cliente se
* guarda correctamente y recibe la respuesta de la API.
* onMostrarMensaje - funcion del componente padre que muestra un mensaje de error
* (opcional) y recibe un objeto con las llaves tipo, titulo y mensaje.
* Tambien usa las funciones insertarCliente y obtenerOpcionesClientes del servicio api.
*
* SALIDA: Elemento JSX con el modal y el formulario de nuevo cliente.
*
* RESTRICCIONES: Requiere que el servicio api este disponible y que existan los estilos
* de las clases modal-fondo, modal-contenido, modal-cliente-form, cd-encabezado,
* cd-avatar, cd-titulo, cd-subtitulo, modal-cerrar, cd-panel, cd-panel-titulo, cd-ico,
* form-grid, campo, campo-completo, modal-footer, btn, btn-claro, btn-azul y girando.
* Los campos obligatorios son nombre, categoria, contacto principal, metodo de entrega,
* ciudad de entrega, telefono, direccion de entrega, codigo postal y direccion postal.
* El UsuarioID se envia con el valor fijo 1. Como onMostrarMensaje es una dependencia
* del useEffect, si el padre la crea de nuevo en cada renderizado las opciones se
* volveran a cargar cada vez; conviene que el padre la mantenga estable.
*
* OBJETIVO: Permitir registrar un nuevo cliente desde la pagina de clientes.
*
*---------------------------------------------------------------------------------------*/

import {
    X,
    UserPlus,
    User,
    Tag,
    Users,
    Phone,
    MapPin,
    Save,
    Loader2
} from 'lucide-react';


import { useEffect, useState } from 'react';


import {
    insertarCliente,
    obtenerOpcionesClientes
} from '../services/api';

function ClienteNuevoModal({
    onCerrar,
    onClienteCreado,
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
    // OPCIONES QUE VIENEN DE LA BASE DE DATOS
    // ========================================================

    const [opciones, setOpciones] = useState({
        categorias: [],
        gruposCompra: [],
        contactos: [],
        clientes: [],
        metodosEntrega: [],
        ciudades: []
    });

    // Indica si las opciones todavia estan cargando.
    const [cargandoOpciones, setCargandoOpciones] = useState(true);

    // Indica si se esta guardando el cliente.
    const [guardando, setGuardando] = useState(false);

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: useEffect de carga de opciones
    *
    * DESCRIPCION: Al abrirse el modal consulta a la API las opciones de las listas
    * desplegables (categorias, grupos de compra, contactos, clientes, metodos de
    * entrega y ciudades) y las guarda en el estado. Mientras responde mantiene activo
    * el indicador cargandoOpciones. Si ocurre un error lo registra en consola y, si
    * existe onMostrarMensaje, muestra un mensaje de error.
    *
    * ENTRADA: Dependencia onMostrarMensaje.
    *
    * SALIDA: Actualiza los estados opciones y cargandoOpciones.
    *
    * RESTRICCIONES: Requiere conexion con la API mediante obtenerOpcionesClientes. Si
    * alguna lista no viene en la respuesta se usa un arreglo vacio.
    *
    * OBJETIVO: Llenar las listas desplegables del formulario.
    *
    *-----------------------------------------------------------------------------------*/

    useEffect(() => {

        const cargarOpciones = async () => {

            try {

                setCargandoOpciones(true);

                const data = await obtenerOpcionesClientes();

                setOpciones({
                    categorias: data.categorias || [],
                    gruposCompra: data.gruposCompra || [],
                    contactos: data.contactos || [],
                    clientes: data.clientes || [],
                    metodosEntrega: data.metodosEntrega || [],
                    ciudades: data.ciudades || []
                });

            } catch (error) {

                console.error(error);

                if (onMostrarMensaje) {

                    onMostrarMensaje({
                        tipo: 'error',
                        titulo: 'No se pudieron cargar las opciones',
                        mensaje: error.message
                    });

                }

            } finally {

                setCargandoOpciones(false);

            }
        };

        cargarOpciones();

    }, [onMostrarMensaje]);

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: cambiarCampo
    *
    * DESCRIPCION: Actualiza en el estado formulario el campo que el usuario modifico.
    * Usa el atributo name del control para saber que campo cambiar y conserva el resto
    * de los valores.
    *
    * ENTRADA: e - evento de cambio del control (input o select).
    *
    * SALIDA: Actualiza el estado formulario.
    *
    * RESTRICCIONES: El atributo name del control debe coincidir con una llave del
    * estado formulario.
    *
    * OBJETIVO: Mantener sincronizados los controles con los datos del formulario.
    *
    *-----------------------------------------------------------------------------------*/

    const cambiarCampo = (e) => {

        const { name, value } = e.target;

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value
        }));

    };

    /*-----------------------------------------------------------------------------------*
    *
    * NOMBRE: guardarCliente
    *
    * DESCRIPCION: Se ejecuta al enviar el formulario. Evita el envio normal, convierte
    * los campos numericos (los campos opcionales vacios se envian como null), envia el
    * cliente a la API mediante insertarCliente y le avisa al componente padre con
    * onClienteCreado. Si ocurre un error muestra un mensaje. Al terminar desactiva el
    * indicador de guardado.
    *
    * ENTRADA: e - evento de envio del formulario.
    *
    * SALIDA: Actualiza el estado guardando y ejecuta onClienteCreado o
    * onMostrarMensaje.
    *
    * RESTRICCIONES: Requiere conexion con la API mediante insertarCliente. Los campos
    * obligatorios son validados por el propio formulario antes de llegar a esta funcion.
    *
    * OBJETIVO: Registrar el nuevo cliente en la base de datos.
    *
    *-----------------------------------------------------------------------------------*/

    const guardarCliente = async (e) => {

        e.preventDefault();

        setGuardando(true);

        try {

            // ==================================================
            // CONVERTIR LOS CAMPOS NUMERICOS
            // ==================================================

            const datos = {

                ...formulario,

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
                    Number(formulario.DiasGracia)
            };

            // ==================================================
            // ENVIAR CLIENTE A LA API
            // ==================================================

            const data = await insertarCliente(datos);

            // Avisamos al componente padre.
            await onClienteCreado(data);

        } catch (error) {

            console.error(error);

            if (onMostrarMensaje) {

                onMostrarMensaje({
                    tipo: 'error',
                    titulo: 'No se puede crear el cliente',
                    mensaje: error.message
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
                onClick={(e) => e.stopPropagation()}
            >

                {/* ==================================================
                    ENCABEZADO
                ================================================== */}

                <header className="cd-encabezado">

                    <div className="cd-avatar">
                        <UserPlus size={25} />
                    </div>

                    <div className="cd-titulo">

                        <h2>
                            Nuevo cliente
                        </h2>

                        <p className="cd-subtitulo">
                            Complete la información para registrar
                            un nuevo cliente.
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

                <form onSubmit={guardarCliente}>

                    {/* ==================================================
                        INFORMACION PRINCIPAL
                    ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico azul">
                                <User size={18} />
                            </span>

                            Información principal

                        </h3>

                        <div className="form-grid">

                            {/* Nombre */}

                            <div className="campo">

                                <label>
                                    Nombre del cliente
                                </label>

                                <input
                                    type="text"
                                    name="Nombre"
                                    value={formulario.Nombre}
                                    onChange={cambiarCampo}
                                    required
                                    maxLength={100}
                                    placeholder="Nombre del cliente"
                                />

                            </div>

                            {/* Categoria */}

                            <div className="campo">

                                <label>

                                    <Tag size={14} />

                                    Categoría

                                </label>

                                <select
                                    name="CategoriaID"
                                    value={formulario.CategoriaID}
                                    onChange={cambiarCampo}
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
                                                value={categoria.ID}
                                            >
                                                {categoria.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* Grupo de compra */}

                            <div className="campo">

                                <label>

                                    <Users size={14} />

                                    Grupo de compra

                                </label>

                                <select
                                    name="GrupoCompraID"
                                    value={formulario.GrupoCompraID}
                                    onChange={cambiarCampo}
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">
                                        Sin grupo de compra
                                    </option>

                                    {opciones.gruposCompra.map(
                                        (grupo) => (

                                            <option
                                                key={grupo.ID}
                                                value={grupo.ID}
                                            >
                                                {grupo.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* Contacto principal */}

                            <div className="campo">

                                <label>
                                    Contacto principal
                                </label>

                                <select
                                    name="ContactoPrimarioID"
                                    value={formulario.ContactoPrimarioID}
                                    onChange={cambiarCampo}
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
                                                value={contacto.ID}
                                            >
                                                {contacto.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* Contacto alternativo */}

                            <div className="campo">

                                <label>
                                    Contacto alternativo
                                </label>

                                <select
                                    name="ContactoAlternativoID"
                                    value={formulario.ContactoAlternativoID}
                                    onChange={cambiarCampo}
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">
                                        Sin contacto alternativo
                                    </option>

                                    {opciones.contactos.map(
                                        (contacto) => (

                                            <option
                                                key={contacto.ID}
                                                value={contacto.ID}
                                            >
                                                {contacto.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* Cliente por facturar */}

                            <div className="campo">

                                <label>
                                    Cliente por facturar
                                </label>

                                <select
                                    name="ClienteFacturarID"
                                    value={formulario.ClienteFacturarID}
                                    onChange={cambiarCampo}
                                    disabled={cargandoOpciones}
                                >

                                    <option value="">
                                        El mismo cliente
                                    </option>

                                    {opciones.clientes.map(
                                        (cliente) => (

                                            <option
                                                key={cliente.ID}
                                                value={cliente.ID}
                                            >
                                                {cliente.Nombre}
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

                            {/* Metodo de entrega */}

                            <div className="campo">

                                <label>
                                    Método de entrega
                                </label>

                                <select
                                    name="MetodoEntregaID"
                                    value={formulario.MetodoEntregaID}
                                    onChange={cambiarCampo}
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
                                                value={metodo.ID}
                                            >
                                                {metodo.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* Ciudad */}

                            <div className="campo">

                                <label>
                                    Ciudad de entrega
                                </label>

                                <select
                                    name="CiudadEntregaID"
                                    value={formulario.CiudadEntregaID}
                                    onChange={cambiarCampo}
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
                                                value={ciudad.ID}
                                            >
                                                {ciudad.Nombre}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* Telefono */}

                            <div className="campo">

                                <label>

                                    <Phone size={14} />

                                    Teléfono

                                </label>

                                <input
                                    type="text"
                                    name="Telefono"
                                    value={formulario.Telefono}
                                    onChange={cambiarCampo}
                                    required
                                    maxLength={20}
                                    placeholder="Teléfono"
                                />

                            </div>

                            {/* Fax */}

                            <div className="campo">

                                <label>
                                    Fax
                                </label>

                                <input
                                    type="text"
                                    name="Fax"
                                    value={formulario.Fax}
                                    onChange={cambiarCampo}
                                    maxLength={20}
                                    placeholder="Fax"
                                />

                            </div>

                            {/* Sitio web */}

                            <div className="campo campo-completo">

                                <label>
                                    Sitio web
                                </label>

                                <input
                                    type="url"
                                    name="SitioWeb"
                                    value={formulario.SitioWeb}
                                    onChange={cambiarCampo}
                                    maxLength={256}
                                    placeholder="https://..."
                                />

                            </div>

                        </div>

                    </div>

                    {/* ==================================================
                        INFORMACION DE PAGO
                    ================================================== */}

                    <div className="cd-panel">

                        <h3 className="cd-panel-titulo">

                            <span className="cd-ico ambar">
                                📄
                            </span>

                            Información de pago

                        </h3>

                        <div className="form-grid">

                            {/* Limite de credito */}

                            <div className="campo">

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
                                    placeholder="0.00"
                                />

                            </div>

                            {/* Descuento */}

                            <div className="campo">

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
                                />

                            </div>

                            {/* Dias de gracia */}

                            <div className="campo">

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

                            {/* Direccion de entrega */}

                            <div className="campo campo-completo">

                                <label>
                                    Dirección de entrega
                                </label>

                                <input
                                    type="text"
                                    name="DireccionEntrega1"
                                    value={formulario.DireccionEntrega1}
                                    onChange={cambiarCampo}
                                    required
                                    maxLength={60}
                                    placeholder="Dirección principal"
                                />

                            </div>

                            {/* Direccion de entrega adicional */}

                            <div className="campo campo-completo">

                                <label>
                                    Dirección de entrega adicional
                                </label>

                                <input
                                    type="text"
                                    name="DireccionEntrega2"
                                    value={formulario.DireccionEntrega2}
                                    onChange={cambiarCampo}
                                    maxLength={60}
                                    placeholder="Información adicional"
                                />

                            </div>

                            {/* Codigo postal */}

                            <div className="campo">

                                <label>
                                    Código postal
                                </label>

                                <input
                                    type="text"
                                    name="CodigoPostal"
                                    value={formulario.CodigoPostal}
                                    onChange={cambiarCampo}
                                    required
                                    maxLength={10}
                                    placeholder="Código postal"
                                />

                            </div>

                            {/* Direccion postal */}

                            <div className="campo">

                                <label>
                                    Dirección postal
                                </label>

                                <input
                                    type="text"
                                    name="DireccionPostal1"
                                    value={formulario.DireccionPostal1}
                                    onChange={cambiarCampo}
                                    required
                                    maxLength={60}
                                    placeholder="Dirección postal"
                                />

                            </div>

                            {/* Direccion postal adicional */}

                            <div className="campo campo-completo">

                                <label>
                                    Dirección postal adicional
                                </label>

                                <input
                                    type="text"
                                    name="DireccionPostal2"
                                    value={formulario.DireccionPostal2}
                                    onChange={cambiarCampo}
                                    maxLength={60}
                                    placeholder="Información adicional"
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

                                    Crear cliente
                                </>

                            )}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );
}

export default ClienteNuevoModal;