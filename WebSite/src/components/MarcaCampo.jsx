/*---------------------------------------------------------------------------------------*
* NOMBRE: MarcaCampo (PY2)
* DESCRIPCION: Indica junto a la etiqueta si el campo es obligatorio (*) u opcional.
*-----------------------------------------------------------------------------------------*/

export function MarcaCampo({ requerido }) {
  return requerido
    ? <span className="campo-req" title="Obligatorio" aria-label="obligatorio"> *</span>
    : <span className="campo-opc">(opcional)</span>;
}
