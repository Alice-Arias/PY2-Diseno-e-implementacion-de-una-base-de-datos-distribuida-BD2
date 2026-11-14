/*---------------------------------------------------------------------------------------*
* NOMBRE: useFormulario
*
* DESCRIPCION: Guarda los valores de un formulario y los actualiza cuando el usuario
* escribe. Las casillas (checkbox) guardan true/false; los demás campos, su texto.
*
* ENTRADA: valoresIniciales (objeto con un valor por campo).
*
* SALIDA: { formulario, setFormulario, cambiarCampo }
*   cambiarCampo se usa en el onChange de cada campo (usa el atributo "name").
*
* OBJETIVO: No repetir la misma función de cambio en cada formulario.
*-----------------------------------------------------------------------------------------*/

import { useState } from 'react';

export default function useFormulario(valoresIniciales) {
    const [formulario, setFormulario] = useState(valoresIniciales);

    const cambiarCampo = (evento) => {
        const { name, value, type, checked } = evento.target;
        setFormulario((anterior) => ({ ...anterior, [name]: type === 'checkbox' ? checked : value }));
    };

    return { formulario, setFormulario, cambiarCampo };
}
