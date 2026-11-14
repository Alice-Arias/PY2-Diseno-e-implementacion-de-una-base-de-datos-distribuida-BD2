/*---------------------------------------------------------------------------------------*
* NOMBRE: StatCard.jsx
*
* DESCRIPCION: Tarjeta de resumen de la parte superior de cada página
* (ej. "Total de clientes 663").
*
* ENTRADA: icon (componente de lucide-react), color ('blue' | 'green' | 'yellow'),
*          label (título), value (número o texto) y sub (texto pequeño, opcional).
*
* SALIDA: La tarjeta.
*
* OBJETIVO: Mostrar los totales igual en todas las páginas.
*-----------------------------------------------------------------------------------------*/

function StatCard({ icon: Icono, color, label, value, sub }) {
    return (
        <div className="stat-card">
            <div className="stat-top">
                <div className={`stat-icon ${color}`}>
                    <Icono size={20} />
                </div>
                <div>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value">{value}</div>
                </div>
            </div>
            <div className="stat-sub">{sub}</div>
        </div>
    );
}

export default StatCard;
