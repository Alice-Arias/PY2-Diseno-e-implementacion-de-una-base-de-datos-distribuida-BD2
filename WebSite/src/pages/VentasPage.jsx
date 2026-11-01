/*---------------------------------------------------------------------------------------*
*
* NOMBRE: VentasPage (CORREGIDO PY2)
*
* POR QUÉ ESTABA LENTO: se descargaban ~70 000 facturas en cada carga y React las
* ordenaba (sort), sumaba (reduce), contaba (new Set) y cortaba (slice).
*
* AHORA:
*   - SP_Ventas_Listar filtra, ordena y devuelve solo 10 filas.
*   - Las tarjetas (ventas encontradas, monto total, clientes distintos) vienen
*     calculadas por SQL en el mismo llamado (resultado 2 del SP).
*   - Al crear una venta se muestra filtrada por su número de factura.
*
*-----------------------------------------------------------------------------------------*/

import { useEffect, useState } from 'react';
import { Receipt, DollarSign, FileText, Sun } from 'lucide-react';

import VentasFiltro from '../components/ventas/VentasFiltro';
import VentasTabla from '../components/ventas/VentasTabla';
import VentaDetalleModal from '../components/ventas/VentaDetalleModal';
import VentaNuevoModal from '../components/ventas/VentaNuevoModal';
import VentaEditarModal from '../components/ventas/VentaEditarModal';
import VentaEliminarModal from '../components/ventas/VentaEliminarModal';
import StatCard from '../components/StatCard';
import Paginacion from '../components/Paginacion';
import useListadoServidor from '../hooks/useListadoServidor';

import { listarVentas, obtenerDetalleVenta, obtenerOpcionesVentas } from '../services/api';

const POR_PAGINA = 10;

function VentasPage() {
    const listado = useListadoServidor(listarVentas, { porPagina: POR_PAGINA });

    const [metodosEntrega, setMetodosEntrega] = useState([]);
    const [ventaDetalle, setVentaDetalle] = useState(null);
    const [mostrarNuevo, setMostrarNuevo] = useState(false);
    const [ventaEditar, setVentaEditar] = useState(null);
    const [ventaEliminar, setVentaEliminar] = useState(null);
    const [mensaje, setMensaje] = useState(null);

    useEffect(() => {
        obtenerOpcionesVentas()
            .then((data) => setMetodosEntrega(data.metodosEntrega || []))
            .catch((err) => console.error(err));
    }, []);

    useEffect(() => {
        if (listado.error) {
            setMensaje({ tipo: 'error', titulo: 'Error', mensaje: 'Ocurrió un error al buscar las ventas.' });
        }
    }, [listado.error]);

    const verDetalle = async (invoiceId) => {
        try {
            setVentaDetalle(await obtenerDetalleVenta(invoiceId));
        } catch (err) {
            console.error(err);
            setMensaje({ tipo: 'error', titulo: 'Error', mensaje: 'No se pudo cargar el detalle de la venta.' });
        }
    };

    const ventaCreada = async (data) => {
        setMostrarNuevo(false);
        const id = data?.venta?.InvoiceID;

        if (id) {
            listado.reemplazarFiltros({ numeroFactura: id });
        } else {
            listado.recargar();
        }

        setMensaje({
            tipo: 'exito',
            titulo: 'Venta creada',
            mensaje: id
                ? `La factura #${id} se creó correctamente. Se muestra filtrada; use "Restaurar" para ver todas.`
                : 'La venta se creó correctamente.'
        });
    };

    const ventaActualizada = async () => {
        setVentaEditar(null);
        listado.recargar(); // misma página, mismos filtros
        setMensaje({ tipo: 'exito', titulo: 'Venta actualizada', mensaje: 'La venta se actualizó correctamente.' });
    };

    const ventaEliminada = async () => {
        setVentaEliminar(null);
        listado.recargar();
        setMensaje({ tipo: 'exito', titulo: 'Venta eliminada', mensaje: 'La venta se eliminó correctamente.' });
    };

    const info = listado.paginacion;
    const montoTotal = Number(info.Monto_Total || 0).toLocaleString('es-CR', {
        style: 'currency',
        currency: 'USD'
    });

    const ahora = new Date();
    const fechaTexto = ahora.toLocaleDateString('es-CR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const horaTexto = ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <div>
            <div className="page-header">
                <div className="title-block">
                    <div className="icon-box"><Receipt size={22} /></div>
                    <div>
                        <h1>Ventas</h1>
                        <p>Gestiona las ventas registradas en Wide World Importers.</p>
                    </div>
                </div>
                <div className="header-right">
                    <span>{fechaTexto} | {horaTexto}</span>
                    <div className="sun-icon"><Sun size={16} /></div>
                </div>
            </div>

            <div className="stats-row">
                <StatCard icon={Receipt} color="blue" label="Ventas encontradas" value={info.Total_Registros ?? 0} />
                <StatCard icon={DollarSign} color="green" label="Monto total" value={montoTotal} />
                <StatCard icon={FileText} color="yellow" label="Clientes distintos" value={info.Clientes_Unicos ?? 0} />
            </div>

            <div className="table-card">
                <VentasFiltro
                    metodosEntrega={metodosEntrega}
                    onBuscar={(filtros) => listado.reemplazarFiltros(filtros)}
                    onRestaurar={() => listado.reemplazarFiltros({})}
                    onNuevo={() => setMostrarNuevo(true)}
                />

                <div style={{ opacity: listado.cargando ? 0.5 : 1, transition: 'opacity .15s' }}>
                    <VentasTabla
                        ventas={listado.filas}
                        onVerUna={verDetalle}
                        onEditar={setVentaEditar}
                        onEliminar={setVentaEliminar}
                    />
                </div>

                <Paginacion
                    pagina={listado.pagina}
                    totalPaginas={info.Total_Paginas}
                    totalRegistros={info.Total_Registros}
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

            {ventaEliminar && (
                <VentaEliminarModal
                    venta={ventaEliminar}
                    onCerrar={() => setVentaEliminar(null)}
                    onEliminado={ventaEliminada}
                />
            )}

            {mensaje && (
                <div className="modal-overlay">
                    <div className={`mensaje-modal ${mensaje.tipo}`}>
                        <h2>{mensaje.titulo}</h2>
                        <p>{mensaje.mensaje}</p>
                        <button className="btn-aceptar" onClick={() => setMensaje(null)}>Aceptar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VentasPage;
