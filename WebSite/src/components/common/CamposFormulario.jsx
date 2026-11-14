/*---------------------------------------------------------------------------------------*
* NOMBRE: CamposFormulario.jsx
*
* DESCRIPCION: Campos que usan todos los formularios, con su etiqueta y la marca de
* obligatorio (*) u opcional:
*   CampoEntrada   <input>     (texto, número, fecha...)
*   CampoSelector  <select>    con una lista { ID, Nombre }
*   CampoArea      <textarea>
*   LeyendaObligatorios        texto que explica el asterisco.
*
* ENTRADA (props comunes):
*   nombre       atributo "name" (el campo del formulario).
*   etiqueta     texto de la etiqueta.
*   valor        valor actual.
*   onCambiar    función del onChange.
*   requerido    true si es obligatorio.
*   completo     true para que ocupe las dos columnas.
*   editando     true para resaltar el campo que se está editando.
*   onEnfocar    función al entrar al campo (opcional).
*
* SALIDA: El campo dentro de un <div class="campo">.
*
* OBJETIVO: Escribir una sola vez cómo se dibuja un campo de formulario.
*-----------------------------------------------------------------------------------------*/

/* Clases del contenedor: campo [campo-completo] [campo-editando] */
const clasesCampo = (completo, editando) =>
    ['campo', completo && 'campo-completo', editando && 'campo-editando'].filter(Boolean).join(' ');

export function MarcaCampo({ requerido }) {
    return requerido
        ? <span className="campo-req" title="Obligatorio" aria-label="obligatorio"> *</span>
        : <span className="campo-opc">(opcional)</span>;
}

export function LeyendaObligatorios() {
    return (
        <p className="leyenda-obligatorios">
            Los campos con <span className="campo-req">*</span> son obligatorios. Los demás se pueden dejar vacíos.
        </p>
    );
}

export function CampoEntrada({
    nombre, etiqueta, valor, onCambiar, onEnfocar,
    tipo = 'text', requerido = false, completo = false, editando = false, max, placeholder = '', ...atributos
}) {
    return (
        <div className={clasesCampo(completo, editando)}>
            <label>{etiqueta}<MarcaCampo requerido={requerido} /></label>
            <input
                type={tipo}
                name={nombre}
                value={valor ?? ''}
                onChange={onCambiar}
                onFocus={onEnfocar}
                required={requerido}
                maxLength={max}
                placeholder={placeholder}
                {...atributos}
            />
        </div>
    );
}

/*---------------------------------------------------------------------------------------*
* CampoSelector: además recibe
*   lista       [{ ID, Nombre }] (en los pedidos, Numero_Orden en lugar de Nombre).
*   textoVacio  primera opción ("Seleccione una opción").
*   cargando    mientras cargan las listas: deshabilitado y dice "Cargando...".
*   bloqueado   deshabilitado aunque ya haya cargado.
*-----------------------------------------------------------------------------------------*/
export function CampoSelector({
    nombre, etiqueta, valor, onCambiar, onEnfocar, lista = [],
    requerido = false, editando = false, cargando = false, bloqueado = false, textoVacio = 'Seleccione una opción'
}) {
    return (
        <div className={clasesCampo(false, editando)}>
            <label>{etiqueta}<MarcaCampo requerido={requerido} /></label>
            <select
                name={nombre}
                value={valor ?? ''}
                onChange={onCambiar}
                onFocus={onEnfocar}
                required={requerido}
                disabled={cargando || bloqueado}
            >
                <option value="">{cargando ? 'Cargando...' : textoVacio}</option>
                {(lista || []).map((opcion) => (
                    <option key={opcion.ID} value={String(opcion.ID)}>
                        {opcion.Nombre || opcion.Numero_Orden}
                    </option>
                ))}
            </select>
        </div>
    );
}

/* CampoArea: con marcarOpcional = false no muestra "(opcional)" en la etiqueta. */
export function CampoArea({
    nombre, etiqueta, valor, onCambiar, onEnfocar,
    editando = false, placeholder = '', filas = 3, marcarOpcional = true
}) {
    return (
        <div className={clasesCampo(true, editando)}>
            <label>{etiqueta}{marcarOpcional && <MarcaCampo requerido={false} />}</label>
            <textarea
                name={nombre}
                rows={filas}
                value={valor ?? ''}
                onChange={onCambiar}
                onFocus={onEnfocar}
                placeholder={placeholder}
            />
        </div>
    );
}
