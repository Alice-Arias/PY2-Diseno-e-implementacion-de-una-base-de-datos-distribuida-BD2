/*---------------------------------------------------------------------------------------*
* NOMBRE: VentasPage.jsx
*
* DESCRIPCION: Página de Ventas (rol Administrador): tarjetas (ventas encontradas,
* monto total y clientes distintos), filtros, tabla paginada y las ventanas para ver,
* crear y modificar ventas.
*
* ENTRADA: Ninguna.
*
* SALIDA: La página de Ventas.
*
* OBJETIVO: Consultar y registrar las ventas de la sucursal.
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Receipt, DollarSign, FileText } from 'lucide-react';
import EncabezadoPagina from '../components/common/EncabezadoPagina';
import StatCard from '../components/common/StatCard';
import Paginacion from '../components/common/Paginacion';
import VentanaMensaje from '../components/common/VentanaMensaje';
import VentasFiltro from '../components/ventas/VentasFiltro';
import VentasTabla from '../components/ventas/VentasTabla';
import VentaDetalleModal from '../components/ventas/VentaDetalleModal';
import VentaNuevoModal from '../components/ventas/VentaNuevoModal';
import VentaEditarModal from '../components/ventas/VentaEditarModal';
import useListadoServidor from '../hooks/useListadoServidor';
import { ventasApi } from '../services/ventasApi';

const POR_PAGINA = 10;

const mensajeExito = (titulo, mensaje) => ({ tipo: 'exito', titulo, mensaje });
const mensajeError = (mensaje) => ({ tipo: 'error', titulo: 'Error', mensaje });

function VentasPage() {
    const [mensaje, setMensaje] = useState(null);
    const [metodosEntrega, setMetodosEntrega] = useState([]);
    const [ventaDetalle, setVentaDetalle] = useState(null);
    const [mostrarNuevo, setMostrarNuevo] = useState(false);
    const [ventaEditar, setVentaEditar] = useState(null);

    const listado = useListadoServidor(ventasApi.listar, {
        porPagina: POR_PAGINA,
        alFallar: () => setMensaje(mensajeError('Ocurrió un error al buscar las ventas.'))
    });

    /* Métodos de entrega para el filtro (vienen en las opciones del formulario). */
    useEffect(() => {
        ventasApi.opciones()
            .then((opciones) => setMetodosEntrega(opciones.metodosEntrega || []))
            .catch((error) => console.error(error));
    }, []);

    const verDetalle = async (numeroFactura) => {
        try {
            setVentaDetalle(await ventasApi.detalle(numeroFactura));
        } catch (error) {
            console.error(error);
            setMensaje(mensajeError('No se pudo cargar el detalle de la venta.'));
        }
    };

    /* Venta nueva: se filtra por su número para que se vea de una vez. */
    const ventaCreada = (respuesta) => {
        setMostrarNuevo(false);
        const numeroFactura = respuesta?.venta?.InvoiceID;
        if (numeroFactura) {
            listado.reemplazarFiltros({ numeroFactura });
        } else {
            listado.recargar();
        }
        setMensaje(mensajeExito('Venta creada', numeroFactura
            ? `La factura #${numeroFactura} se creó correctamente. Se muestra filtrada; use "Restaurar" para ver todas.`
            : 'La venta se creó correctamente.'));
    };

    const ventaActualizada = () => {
        setVentaEditar(null);
        listado.recargar();   // Misma página y mismos filtros.
        setMensaje(mensajeExito('Venta actualizada', 'La venta se actualizó correctamente.'));
    };

    const totales = listado.paginacion;
    const montoTotal = Number(totales.Monto_Total || 0).toLocaleString('es-CR', { style: 'currency', currency: 'USD' });

    return (
        <div>
            <EncabezadoPagina icono={Receipt} titulo="Ventas" descripcion="Gestiona las ventas registradas en Wide World Importers." />

            <div className="stats-row">
                <StatCard icon={Receipt} color="blue" label="Ventas encontradas" value={totales.Total_Registros ?? 0} />
                <StatCard icon={DollarSign} color="green" label="Monto total" value={montoTotal} />
                <StatCard icon={FileText} color="yellow" label="Clientes distintos" value={totales.Clientes_Unicos ?? 0} />
            </div>

            <div className="table-card">
                <VentasFiltro
                    metodosEntrega={metodosEntrega}
                    onBuscar={(filtros) => listado.reemplazarFiltros(filtros)}
                    onRestaurar={() => listado.reemplazarFiltros({})}
                    onNuevo={() => setMostrarNuevo(true)}
                />

                <div style={{ opacity: listado.cargando ? 0.5 : 1, transition: 'opacity .15s' }}>
                    <VentasTabla ventas={listado.filas} onVer={verDetalle} onEditar={setVentaEditar} />
                </div>

                <Paginacion
                    pagina={listado.pagina}
                    totalPaginas={totales.Total_Paginas}
                    totalRegistros={totales.Total_Registros}
                    porPagina={POR_PAGINA}
                    cargando={listado.cargando}
                    onCambiar={listado.cambiarPagina}
                />
            </div>

            <VentaDetalleModal venta={ventaDetalle} onCerrar={() => setVentaDetalle(null)} />

            {mostrarNuevo && (
                <VentaNuevoModal
                    onCerrar={() => setMostrarNuevo(false)}
                    onVentaCreada={ventaCreada}
                    onMostrarMensaje={setMensaje}
                />
            )}
            {ventaEditar && (
                <VentaEditarModal
                    venta={ventaEditar}
                    onCerrar={() => setVentaEditar(null)}
                    onVentaActualizada={ventaActualizada}
                    onMostrarMensaje={setMensaje}
                />
            )}

            <VentanaMensaje mensaje={mensaje} onCerrar={() => setMensaje(null)} />
        </div>
    );
}

export default VentasPage;
