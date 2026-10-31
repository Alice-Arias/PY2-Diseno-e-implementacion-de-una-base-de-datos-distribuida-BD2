/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Tarjeta de estadistica (StatCard)
*
* DESCRIPCION: Componente que crea una tarjeta para mostrar una estadistica. La tarjeta
* muestra un icono con color, una etiqueta, un valor principal y, en la parte inferior,
* una barra de progreso o informacion adicional. Si recibe la propiedad progress muestra
* la barra de progreso (verde si el color es green y amarilla en cualquier otro caso);
* si no la recibe, muestra el cambio (delta) y el texto adicional (sub).
*
* ENTRADA: icon - componente de icono que se dibuja en la tarjeta (se recibe como Icon).
* color - nombre del color del icono (por ejemplo blue, green o yellow).
* label - titulo o etiqueta de la estadistica.
* value - valor principal que se muestra.
* delta - cambio que se muestra junto al texto adicional (opcional).
* sub - texto adicional que se muestra debajo (opcional).
* progress - porcentaje de la barra de progreso de 0 a 100 (opcional).
*
* SALIDA: Elemento JSX con la tarjeta de estadistica.
*
* RESTRICCIONES: Requiere que existan los estilos de las clases stat-card, stat-top,
* stat-icon, stat-label, stat-value, stat-progress, stat-progress-fill, stat-sub y
* stat-delta, y las variables CSS --green y --yellow. La propiedad icon es obligatoria,
* ya que se usa como componente. La propiedad progress debe ser un numero; si es
* undefined se muestra la informacion adicional en lugar de la barra.
*
* OBJETIVO: Mostrar de forma resumida y reutilizable los datos estadisticos en las
* paginas de la aplicacion.
*
*---------------------------------------------------------------------------------------*/

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  delta,
  sub,
  progress
}) {



  return (

    <div className="stat-card">



      <div className="stat-top">



        <div className={`stat-icon ${color}`}>


          <Icon size={20} />

        </div>



        <div>


          <div className="stat-label">
            {label}
          </div>


          <div className="stat-value">
            {value}
          </div>

        </div>

      </div>



      {progress !== undefined ? (



        <div className="stat-progress">


          <div


            className="stat-progress-fill"



            style={{
              width: `${progress}%`,


              background:
                color === 'green'
                  ? 'var(--green)'
                  : 'var(--yellow)'
            }}

          />

        </div>

      ) : (


        <div className="stat-sub">


          {delta && (
            <span className="stat-delta">
              {delta}
            </span>
          )}


          {sub}


        </div>

      )}

    </div>
  );
}


export default StatCard;