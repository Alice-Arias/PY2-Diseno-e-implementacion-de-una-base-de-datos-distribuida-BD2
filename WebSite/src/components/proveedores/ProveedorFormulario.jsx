
import { useState } from 'react';

import {
    User,
    Phone,
    Landmark,
    MapPin,
    FileText
} from 'lucide-react';


function ProveedorFormulario({
    formulario,
    onCambiar,
    opciones,
    cargandoOpciones,
    idProveedor,
    resaltar = false
}) {

    // Campo que el usuario está tocando en este momento.
    const [activo, setActivo] = useState(null);

    // Marca el campo como activo y avisa al padre.
    const cambiar = (e) => {
        setActivo(e.target.name);
        onCambiar(e);
    };

    // Clase del contenedor de cada campo.
    const clase = (nombre, extra = '') =>
        [
            'campo',
            extra,
            resaltar && activo === nombre ? 'campo-editando' : ''
        ]
            .filter(Boolean)
            .join(' ');


    // ========================================================
    // CAMPO DE TEXTO / NÚMERO
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

        <div className={clase(nombre, completo ? 'campo-completo' : '')}>

            <label>{etiqueta}</label>

            <input
                type={tipo}
                name={nombre}
                value={formulario[nombre]}
                onChange={cambiar}
                onFocus={() => setActivo(nombre)}
                required={requerido}
                maxLength={max}
                placeholder={placeholder}
                {...extra}
            />

        </div>

    );


    // ========================================================
    // CAMPO SELECT (lista que viene de la base de datos)
    // ========================================================

    const selector = (
        nombre,
        etiqueta,
        lista,
        { requerido = false, vacio = 'Seleccione una opción' } = {}
    ) => (

        <div className={clase(nombre)}>

            <label>{etiqueta}</label>

            <select
                name={nombre}
                value={formulario[nombre]}
                onChange={cambiar}
                onFocus={() => setActivo(nombre)}
                required={requerido}
                disabled={cargandoOpciones}
            >

                <option value="">
                    {cargandoOpciones ? 'Cargando...' : vacio}
                </option>

                {lista.map((opcion) => (
                    <option
                        key={opcion.ID}
                        value={String(opcion.ID)}
                    >
                        {opcion.Nombre}
                    </option>
                ))}

            </select>

        </div>

    );


    return (

        <>

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

                    {/* El ID solo aparece al editar */}

                    {idProveedor != null && (
                        <div className="campo">
                            <label>ID del proveedor</label>
                            <input
                                type="text"
                                value={idProveedor}
                                disabled
                            />
                        </div>
                    )}

                    {entrada('Nombre', 'Nombre del proveedor', {
                        max: 100,
                        requerido: true,
                        placeholder: 'Nombre del proveedor'
                    })}

                    {entrada('ReferenciaProveedor', 'Código del proveedor', {
                        max: 20,
                        placeholder: 'Ej: AA20384'
                    })}

                    {selector(
                        'CategoriaID',
                        'Categoría',
                        opciones.categorias,
                        {
                            requerido: true,
                            vacio: 'Seleccione una categoría'
                        }
                    )}

                    {selector(
                        'ContactoPrimarioID',
                        'Contacto principal',
                        opciones.contactos,
                        {
                            requerido: true,
                            vacio: 'Seleccione un contacto'
                        }
                    )}

                    {selector(
                        'ContactoAlternativoID',
                        'Contacto alternativo',
                        opciones.contactos,
                        { vacio: 'Sin contacto alternativo' }
                    )}

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

                    {selector(
                        'MetodoEntregaID',
                        'Método de entrega',
                        opciones.metodosEntrega,
                        {
                            requerido: true,
                            vacio: 'Seleccione un método'
                        }
                    )}

                    {selector(
                        'CiudadEntregaID',
                        'Ciudad de entrega',
                        opciones.ciudades,
                        {
                            requerido: true,
                            vacio: 'Seleccione una ciudad'
                        }
                    )}

                    {entrada('Telefono', 'Teléfono', {
                        max: 20,
                        requerido: true,
                        placeholder: 'Teléfono'
                    })}

                    {entrada('Fax', 'Fax', {
                        max: 20,
                        placeholder: 'Fax'
                    })}

                    {entrada('SitioWeb', 'Sitio web', {
                        tipo: 'url',
                        max: 256,
                        completo: true,
                        placeholder: 'https://...'
                    })}

                </div>

            </div>


            {/* ==================================================
                DATOS BANCARIOS Y DE PAGO
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">
                    <span className="cd-ico ambar">
                        <Landmark size={18} />
                    </span>
                    Datos bancarios y de pago
                </h3>

                <div className="form-grid">

                    {entrada('SucursalBancaria', 'Banco y sucursal', {
                        max: 50
                    })}

                    {entrada('NombreCuentaBancaria', 'Titular de la cuenta', {
                        max: 50
                    })}

                    {entrada('NumeroCuentaBancaria', 'Número de cuenta corriente', {
                        max: 50
                    })}

                    {entrada('CodigoBanco', 'Código del banco', {
                        max: 20
                    })}

                    {entrada('CodigoInternacionalBanco', 'Código internacional', {
                        max: 20
                    })}

                    {entrada('DiasPago', 'Días de gracia para pagar', {
                        tipo: 'number',
                        requerido: true,
                        min: 0,
                        max: 365
                    })}

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

                    {entrada('DireccionEntrega1', 'Dirección de entrega', {
                        max: 60,
                        requerido: true,
                        completo: true,
                        placeholder: 'Dirección principal'
                    })}

                    {entrada('DireccionEntrega2', 'Dirección de entrega adicional', {
                        max: 60,
                        completo: true,
                        placeholder: 'Información adicional'
                    })}

                    {entrada('CodigoPostalEntrega', 'Código postal de entrega', {
                        max: 10,
                        requerido: true
                    })}

                    {selector(
                        'CiudadPostalID',
                        'Ciudad de la dirección postal',
                        opciones.ciudades,
                        {
                            requerido: true,
                            vacio: 'Seleccione una ciudad'
                        }
                    )}

                    {entrada('DireccionPostal1', 'Dirección postal', {
                        max: 60,
                        requerido: true,
                        completo: true,
                        placeholder: 'Dirección postal'
                    })}

                    {entrada('DireccionPostal2', 'Dirección postal adicional', {
                        max: 60,
                        completo: true,
                        placeholder: 'Información adicional'
                    })}

                    {entrada('CodigoPostalPostal', 'Código postal de la dirección postal', {
                        max: 10,
                        requerido: true
                    })}

                </div>

            </div>


            {/* ==================================================
                COMENTARIOS INTERNOS
            ================================================== */}

            <div className="cd-panel">

                <h3 className="cd-panel-titulo">
                    <span className="cd-ico ambar">
                        <FileText size={18} />
                    </span>
                    Comentarios internos
                </h3>

                <div className="form-grid">

                    <div className={clase('ComentariosInternos', 'campo-completo')}>

                        <label>Comentarios</label>

                        <textarea
                            name="ComentariosInternos"
                            rows={3}
                            value={formulario.ComentariosInternos}
                            onChange={cambiar}
                            onFocus={() => setActivo('ComentariosInternos')}
                            placeholder="Notas internas sobre el proveedor (opcional)"
                        />

                    </div>

                </div>

            </div>

        </>

    );
}

export default ProveedorFormulario;