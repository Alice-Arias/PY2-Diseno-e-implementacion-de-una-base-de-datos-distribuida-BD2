/*---------------------------------------------------------------------------------------*
*
* NOMBRE: RelojTema (PY2)
*
* DESCRIPCION: Fecha y hora en vivo (se actualiza cada segundo) y botón para cambiar
* entre modo claro y modo oscuro. La preferencia se guarda en el navegador y App.jsx
* la aplica a toda la aplicación (evento "wwi-tema").
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const CLAVE_TEMA = 'wwi_tema';

export function temaGuardado() {
  try {
    return localStorage.getItem(CLAVE_TEMA) === 'oscuro' ? 'oscuro' : 'claro';
  } catch {
    return 'claro';
  }
}

function RelojTema() {
  const [ahora, setAhora] = useState(() => new Date());
  const [tema, setTema] = useState(temaGuardado);

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const cambiarTema = () => {
    const nuevo = tema === 'oscuro' ? 'claro' : 'oscuro';
    setTema(nuevo);
    try { localStorage.setItem(CLAVE_TEMA, nuevo); } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new CustomEvent('wwi-tema', { detail: nuevo }));
  };

  const fecha = ahora.toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const hora = ahora.toLocaleTimeString('es-CR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  return (
    <div className="reloj-tema">
      <div className="reloj" aria-live="off">
        <span className="reloj-hora">{hora}</span>
        <span className="reloj-fecha">{fecha.charAt(0).toUpperCase() + fecha.slice(1)}</span>
      </div>
      <button
        type="button"
        className="btn-tema"
        onClick={cambiarTema}
        title={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {tema === 'oscuro' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}

export default RelojTema;
