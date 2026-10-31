/*---------------------------------------------------------------------------------------*
*
* NOMBRE: Filtro de clientes (ClientesFiltro)
*
* DESCRIPCION: Componente que muestra un formulario de filtros para buscar clientes.
* Permite escribir el nombre de un cliente, una categoria y un metodo de entrega, buscar
* clientes con esos filtros y restaurar todos los filtros. Cada campo mantiene su propio
* valor mediante estado local. Al presionar "Buscar" envia los tres filtros al componente
* padre y al presionar "Restaurar filtros" limpia los tres campos y le avisa al padre que
* debe restaurar los resultados originales.
*
* ENTRADA: onBuscar - funcion del componente padre que se ejecuta al presionar "Buscar" y
* recibe un objeto con las llaves nombre, categoria y metodoEntrega.
* onRestaurar - funcion del componente padre que se ejecuta al presionar "Restaurar
* filtros" y no recibe parametros.
*
* SALIDA: Elemento JSX con tres campos de texto y los botones Buscar y Restaurar
* filtros.
*
* RESTRICCIONES: Requiere que existan los estilos de las clases filtro, btn-buscar y
* btn-restaurar. Ambas propiedades son obligatorias y deben ser funciones, de lo
* contrario ocurre un error al hacer clic en los botones. Los valores de los filtros se
* guardan como texto libre y no se validan.
*
* OBJETIVO: Permitir al usuario filtrar la lista de clientes por nombre, categoria y
* metodo de entrega.
*
*---------------------------------------------------------------------------------------*/

import { useState } from 'react';


function ClientesFiltro({ onBuscar, onRestaurar }) {


  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [metodoEntrega, setMetodoEntrega] = useState('');



  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: buscar
  *
  * DESCRIPCION: Toma los tres filtros (nombre, categoria y metodo de entrega) y los
  * envia al componente padre mediante la funcion onBuscar.
  *
  * ENTRADA: Ninguna (usa los estados nombre, categoria y metodoEntrega).
  *
  * SALIDA: Ejecucion de onBuscar con un objeto que contiene los tres filtros.
  *
  * RESTRICCIONES: onBuscar debe ser una funcion.
  *
  * OBJETIVO: Iniciar la busqueda de clientes con los filtros escritos.
  *
  *-----------------------------------------------------------------------------------*/

  const buscar = () => {
    onBuscar({
      nombre,
      categoria,
      metodoEntrega
    });
  };


  /*-----------------------------------------------------------------------------------*
  *
  * NOMBRE: restaurar
  *
  * DESCRIPCION: Limpia los tres campos del formulario y le avisa al componente padre
  * que debe restaurar los resultados originales mediante la funcion onRestaurar.
  *
  * ENTRADA: Ninguna.
  *
  * SALIDA: Actualiza los estados nombre, categoria y metodoEntrega a texto vacio y
  * ejecuta onRestaurar.
  *
  * RESTRICCIONES: onRestaurar debe ser una funcion.
  *
  * OBJETIVO: Volver a la vista sin filtros.
  *
  *-----------------------------------------------------------------------------------*/

  const restaurar = () => {
    setNombre('');
    setCategoria('');
    setMetodoEntrega('');

    onRestaurar();
  };



  return (
    <div className="filtro">

      {/* Campo para buscar por nombre */}
      <input
        placeholder="Buscar por nombre..."
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />


      {/* Campo para buscar por categoria */}
      <input
        placeholder="Categoría..."
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
      />


      {/* Campo para buscar por metodo de entrega */}
      <input
        placeholder="Método de entrega..."
        value={metodoEntrega}
        onChange={(e) => setMetodoEntrega(e.target.value)}
      />


      {/* Boton que ejecuta la busqueda */}
      <button
        className="btn-buscar"
        onClick={buscar}
      >
        Buscar
      </button>


      {/* Boton que limpia los filtros */}
      <button
        className="btn-restaurar"
        onClick={restaurar}
      >
        Restaurar filtros
      </button>

    </div>
  );
}

export default ClientesFiltro;