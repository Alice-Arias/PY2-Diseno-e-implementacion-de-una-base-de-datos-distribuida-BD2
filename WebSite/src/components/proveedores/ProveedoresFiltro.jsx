import { useState } from 'react';



function ProveedoresFiltro({ onBuscar, onRestaurar }) {

  // Variables de estado
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [metodoEntrega, setMetodoEntrega] = useState('');


  // buscar
  // Toma los tres filtros y los envía al componente padre.

  const buscar = () => {
    onBuscar({
      nombre,
      categoria,
      metodoEntrega
    });
  };


  // restaurar
  // 1. Limpia los tres campos.
  // 2. Avisa al padre que debe restaurar los resultados.

  const restaurar = () => {
    setNombre('');
    setCategoria('');
    setMetodoEntrega('');

    onRestaurar();
  };


  return (
    <div className="filtro">

      <input
        placeholder="Buscar por nombre..."
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && buscar()}
      />

      <input
        placeholder="Categoría..."
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && buscar()}
      />

      <input
        placeholder="Método de entrega..."
        value={metodoEntrega}
        onChange={(e) => setMetodoEntrega(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && buscar()}
      />

      <button className="btn-buscar" onClick={buscar}>
        Buscar
      </button>

      <button className="btn-restaurar" onClick={restaurar}>
        Restaurar filtros
      </button>

    </div>
  );
}

export default ProveedoresFiltro;