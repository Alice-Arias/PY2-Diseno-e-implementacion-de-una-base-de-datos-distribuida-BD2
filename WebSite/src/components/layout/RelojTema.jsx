/*---------------------------------------------------------------------------------------*
* NOMBRE: RelojTema.jsx
*
* DESCRIPCION: Hora y fecha en vivo (cada segundo) y botón para cambiar entre modo
* claro y modo oscuro. La elección se guarda en el navegador y se avisa a App.jsx con
* el evento 'wwi-tema'.
*
* ENTRADA: Ninguna.
*
* SALIDA: El reloj y el botón de tema.
*
* OBJETIVO: Mostrar la hora y permitir elegir el modo de color.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { temaGuardado, guardarTema } from '../../services/tema';

const conMayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function RelojTema() {
    const [ahora, setAhora] = useState(() => new Date());
    const [tema, setTema] = useState(temaGuardado);
    const esOscuro = tema === 'oscuro';

    useEffect(() => {
        const intervalo = setInterval(() => setAhora(new Date()), 1000);
        return () => clearInterval(intervalo);
    }, []);

    const cambiarTema = () => {
        const nuevoTema = esOscuro ? 'claro' : 'oscuro';
        setTema(nuevoTema);
        guardarTema(nuevoTema);
        window.dispatchEvent(new CustomEvent('wwi-tema', { detail: nuevoTema }));
    };

    const fecha = ahora.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const hora = ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const textoBoton = esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

    return (
        <div className="reloj-tema">
            <div className="reloj" aria-live="off">
                <span className="reloj-hora">{hora}</span>
                <span className="reloj-fecha">{conMayuscula(fecha)}</span>
            </div>
            <button type="button" className="btn-tema" onClick={cambiarTema} title={textoBoton} aria-label={textoBoton}>
                {esOscuro ? <Sun size={18} /> : <Moon size={18} />}
            </button>
        </div>
    );
}

export default RelojTema;
