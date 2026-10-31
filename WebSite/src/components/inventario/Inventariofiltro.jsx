import { useState } from 'react';


function InventariosFiltro({
  grupos,
  onBuscar,
  onRestaurar
}) {

 
  const [nombre, setNombre] = useState('');

  const [grupo, setGrupo] = useState('');


  const buscar = () => {

    onBuscar({
      nombre,
      grupo
    });

  };


  const restaurar = () => {

    setNombre('');

    setGrupo('');

    onRestaurar();

  };


  return (

    <div className="filtro">


      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={nombre}
        onChange={(e) =>
          setNombre(e.target.value)
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter') buscar();
        }}
      />



      <select
        value={grupo}
        onChange={(e) =>
          setGrupo(e.target.value)
        }
      >

        <option value="">
          Todos los grupos
        </option>

        {grupos.map((grupoNombre) => (

          <option
            key={grupoNombre}
            value={grupoNombre}
          >
            {grupoNombre}
          </option>

        ))}

      </select>


      {/* BOTÓN BUSCAR */}
      <button
        type="button"
        className="btn-buscar"
        onClick={buscar}
      >
        Buscar
      </button>


      {/* BOTÓN RESTAURAR */}
      <button
        type="button"
        className="btn-restaurar"
        onClick={restaurar}
      >
        Restaurar filtros
      </button>

    </div>

  );

}

export default InventariosFiltro;