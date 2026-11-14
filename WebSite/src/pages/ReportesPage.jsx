/*---------------------------------------------------------------------------------------*
* NOMBRE: ReportesPage.jsx
*
* DESCRIPCION: Página de Reportes (rol Corporativo):
*   - resumen y comparativo de las sucursales (ResumenSucursales);
*   - selector de reporte con sus filtros;
*   - tabla paginada del resultado y descarga en Excel.
* La sucursal elegida arriba se aplica también al reporte.
*
* ENTRADA: Ninguna.
*
* SALIDA: La página de Reportes.
*
* OBJETIVO: Consultar las estadísticas de una sucursal o de las dos.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { BarChart3, Database, Rows3 } from 'lucide-react';
import EncabezadoPagina from '../components/common/EncabezadoPagina';
import StatCard from '../components/common/StatCard';
import ResumenSucursales from '../components/reportes/ResumenSucursales';
import ReportesFiltro from '../components/reportes/ReportesFiltro';
import ReportesTabla from '../components/reportes/ReportesTabla';
import { REPORTES, OPCIONES_VACIAS } from '../components/reportes/catalogoReportes';
import useListadoServidor from '../hooks/useListadoServidor';
import { reportesApi } from '../services/reportesApi';
import { obtenerUsuario } from '../services/sesion';
import { descargarExcel } from '../utils/exportarExcel';

const POR_PAGINA = 10;
const NOMBRES_SUCURSAL = { '': 'Consolidado', 1: 'San José', 2: 'Limón' };

/* El listado guarda el reporte elegido junto con sus filtros. */
const listarReporte = ({ reporte, ...filtros }) => reportesApi.ejecutar(reporte, filtros);

function ReportesPage() {
    const [reporteId, setReporteId] = useState(REPORTES[0].id);
    const [filtros, setFiltros] = useState({});
    const [opciones, setOpciones] = useState(OPCIONES_VACIAS);
    const [errorOpciones, setErrorOpciones] = useState('');
    const [exportando, setExportando] = useState(false);
    const [sucursal, setSucursal] = useState('');

    const listado = useListadoServidor(listarReporte, {
        porPagina: POR_PAGINA,
        filtrosIniciales: { reporte: REPORTES[0].id }
    });

    const reporte = REPORTES.find((item) => item.id === reporteId);
    const paginacion = listado.paginacion;

    useEffect(() => {
        reportesApi.opciones()
            .then(setOpciones)
            .catch((error) => setErrorOpciones(error.message || 'No se pudieron cargar las opciones.'));
    }, []);

    const cambiarReporte = (id) => {
        setReporteId(id);
        setFiltros({});
        listado.reemplazarFiltros({ reporte: id, sucursal });
    };

    const verReporte = () => listado.reemplazarFiltros({ reporte: reporteId, ...filtros, sucursal });

    const restaurarFiltros = () => {
        setFiltros({});
        listado.reemplazarFiltros({ reporte: reporteId, sucursal });
    };

    const cambiarSucursal = (valor) => {
        setSucursal(valor);
        listado.reemplazarFiltros({ ...listado.filtros, sucursal: valor });
    };

    /* Descarga en Excel el reporte con los filtros aplicados (todas las filas). */
    const exportar = async () => {
        setExportando(true);
        try {
            const { reporte: id, ...aplicados } = listado.filtros;
            const respuesta = await reportesApi.ejecutar(id, { ...aplicados, exportar: 1 });
            const filtrosTexto = reporte.filtros
                .filter((filtro) => aplicados[filtro.id])
                .map((filtro) => `${filtro.etiqueta}: ${aplicados[filtro.id]}`)
                .join(' | ');

            descargarExcel(respuesta.datos || [], {
                titulo: reporte.titulo,
                sucursal: NOMBRES_SUCURSAL[aplicados.sucursal ?? ''] ?? 'Consolidado',
                filtrosTexto,
                usuario: obtenerUsuario()?.fullname ?? ''
            });
        } catch (error) {
            console.error(error);
        } finally {
            setExportando(false);
        }
    };

    return (
        <div>
            <EncabezadoPagina
                icono={BarChart3}
                titulo="Reportes"
                descripcion="Estadísticas de cada sucursal o consolidadas: ventas, compras e inventario."
            />

            <ResumenSucursales sucursal={sucursal} onCambiarSucursal={cambiarSucursal} />

            <div className="stats-row">
                <StatCard icon={BarChart3} color="blue" label="Reportes disponibles" value={REPORTES.length} sub="Consultas estadísticas" />
                <StatCard icon={Database} color="green" label="Resultados" value={paginacion.Total_Registros ?? 0} sub={reporte.titulo} />
                <StatCard icon={Rows3} color="yellow" label="Página actual" value={`${listado.pagina} / ${paginacion.Total_Paginas ?? 1}`}
                          sub={`Filas por página: ${POR_PAGINA}`} />
            </div>

            <div className="table-card">
                <ReportesFiltro
                    reportes={REPORTES}
                    reporteId={reporteId}
                    filtros={filtros}
                    opciones={opciones}
                    cargando={listado.cargando || exportando}
                    hayResultados={(paginacion.Total_Registros ?? 0) > 0}
                    onCambiarReporte={cambiarReporte}
                    onCambiarFiltro={(nombre, valor) => setFiltros((actuales) => ({ ...actuales, [nombre]: valor }))}
                    onBuscar={verReporte}
                    onRestaurar={restaurarFiltros}
                    onExportar={exportar}
                />
                <ReportesTabla
                    filas={listado.filas}
                    cargando={listado.cargando}
                    error={listado.error || errorOpciones}
                    pagina={listado.pagina}
                    totalPaginas={paginacion.Total_Paginas ?? 1}
                    totalRegistros={paginacion.Total_Registros ?? 0}
                    onCambiarPagina={listado.cambiarPagina}
                />
            </div>
        </div>
    );
}

export default ReportesPage;
