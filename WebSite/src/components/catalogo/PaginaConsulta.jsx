/*---------------------------------------------------------------------------------------*
* NOMBRE: PaginaConsulta.jsx
*
* DESCRIPCION: Página de consulta que comparten Clientes y Proveedores:
*   - encabezado y tres tarjetas (total, categorías y resultados actuales);
*   - buscador por nombre con sugerencias, filtro por categoría y por método;
*   - tabla paginada con casillas y botón "Ver seleccionados";
*   - ventana de detalle de uno o varios registros.
*
* ENTRADA: configuracion (ver pages/ClientesPage.jsx y pages/ProveedoresPage.jsx)
*   icono, titulo, descripcion     encabezado.
*   api                            clientesApi o proveedoresApi.
*   nombreSingular, nombrePlural   "cliente" / "clientes" para los mensajes.
*   etiquetaTotal, campoTotal      primera tarjeta ("Total de clientes", Total_Clientes).
*   tabla                          { campos, titulo, textoVacio } (ver TablaConsulta).
*   VentanaDetalle                 componente del detalle (recibe registros y onCerrar).
*
* SALIDA: La página completa.
*
* OBJETIVO: Escribir una sola vez la página que antes estaba copiada en los dos módulos.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { CheckCircle2, Tag } from 'lucide-react';
import EncabezadoPagina from '../common/EncabezadoPagina';
import StatCard from '../common/StatCard';
import BuscadorSugerencias from '../common/BuscadorSugerencias';
import BotonVerSeleccionados from '../common/BotonVerSeleccionados';
import Paginacion from '../common/Paginacion';
import VentanaMensaje from '../common/VentanaMensaje';
import TablaConsulta from './TablaConsulta';
import useListadoServidor from '../../hooks/useListadoServidor';
import useSeleccion from '../../hooks/useSeleccion';

const POR_PAGINA = 10;
const FILTROS_VACIOS = { nombre: '', categoria: '', metodoEntrega: '' };
const RESUMEN_VACIO = { totales: {}, categorias: [], metodos: [] };

const mensajeError = (texto) => ({ tipo: 'error', titulo: 'Error', mensaje: texto });

function PaginaConsulta({ configuracion }) {
    const {
        icono, titulo, descripcion, api, nombreSingular, nombrePlural,
        etiquetaTotal, campoTotal, tabla, VentanaDetalle
    } = configuracion;

    const [mensaje, setMensaje] = useState(null);
    const [nombreEscrito, setNombreEscrito] = useState('');
    const [resumen, setResumen] = useState(RESUMEN_VACIO);
    const [registrosDetalle, setRegistrosDetalle] = useState(null);
    const seleccion = useSeleccion();

    const listado = useListadoServidor(api.listar, {
        porPagina: POR_PAGINA,
        filtrosIniciales: FILTROS_VACIOS,
        alFallar: () => setMensaje(mensajeError(`Ocurrió un error al buscar los ${nombrePlural}.`))
    });

    useEffect(() => {
        api.resumen()
            .then(setResumen)
            .catch((error) => console.error(error));
    }, [api]);

    const filtrar = (cambios) => {
        seleccion.limpiar();
        listado.aplicarFiltros(cambios);
    };

    const restaurarFiltros = () => {
        setNombreEscrito('');
        seleccion.limpiar();
        listado.reemplazarFiltros(FILTROS_VACIOS);
    };

    const abrirDetalle = async (ids) => {
        try {
            setRegistrosDetalle(await api.detalle(ids));
        } catch (error) {
            console.error(error);
            setMensaje(mensajeError(`No se pudo cargar el detalle del ${nombreSingular}.`));
        }
    };

    return (
        <div>
            <EncabezadoPagina icono={icono} titulo={titulo} descripcion={descripcion} />

            <div className="stats-row">
                <StatCard icon={icono} color="blue" label={etiquetaTotal} value={resumen.totales?.[campoTotal] ?? 0} />
                <StatCard icon={Tag} color="green" label="Categorías" value={resumen.totales?.Total_Categorias ?? 0} />
                <StatCard icon={CheckCircle2} color="yellow" label="Resultados actuales" value={listado.paginacion.Total_Registros} />
            </div>

            <div className="table-card">
                <div className="toolbar">
                    <BuscadorSugerencias
                        valor={nombreEscrito}
                        onCambiar={setNombreEscrito}
                        onBuscar={(texto) => filtrar({ nombre: texto })}
                        cargarSugerencias={api.sugerir}
                        placeholder={`Nombre del ${nombreSingular}`}
                        etiqueta={`Buscar por nombre del ${nombreSingular}`}
                    />
                    <select value={listado.filtros.categoria} onChange={(evento) => filtrar({ categoria: evento.target.value })}>
                        <option value="">Categorías</option>
                        {resumen.categorias.map((categoria) => (
                            <option key={categoria.Nombre} value={categoria.Nombre}>{categoria.Nombre}</option>
                        ))}
                    </select>
                    <select value={listado.filtros.metodoEntrega} onChange={(evento) => filtrar({ metodoEntrega: evento.target.value })}>
                        <option value="">Métodos</option>
                        {resumen.metodos.map((metodo) => (
                            <option key={metodo.Nombre} value={metodo.Nombre}>{metodo.Nombre}</option>
                        ))}
                    </select>
                    <button className="btn-restaurar" onClick={restaurarFiltros}>Restaurar filtros</button>
                    <BotonVerSeleccionados
                        cantidad={seleccion.seleccionados.length}
                        onClick={() => abrirDetalle(seleccion.seleccionados)}
                    />
                </div>

                <div style={{ opacity: listado.cargando ? 0.5 : 1, transition: 'opacity .15s' }}>
                    <TablaConsulta
                        filas={listado.filas}
                        campos={tabla.campos}
                        titulo={tabla.titulo}
                        textoVacio={tabla.textoVacio}
                        seleccionados={seleccion.seleccionados}
                        onAlternar={seleccion.alternar}
                        onVer={abrirDetalle}
                    />
                </div>

                <Paginacion
                    pagina={listado.pagina}
                    totalPaginas={listado.paginacion.Total_Paginas}
                    totalRegistros={listado.paginacion.Total_Registros}
                    porPagina={POR_PAGINA}
                    cargando={listado.cargando}
                    onCambiar={listado.cambiarPagina}
                />
            </div>

            <VentanaDetalle registros={registrosDetalle} onCerrar={() => setRegistrosDetalle(null)} />
            <VentanaMensaje mensaje={mensaje} onCerrar={() => setMensaje(null)} />
        </div>
    );
}

export default PaginaConsulta;
