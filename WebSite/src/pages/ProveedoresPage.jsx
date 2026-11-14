/*---------------------------------------------------------------------------------------*
* NOMBRE: ProveedoresPage.jsx
*
* DESCRIPCION: Página de Proveedores (rol Administrador, solo consulta). Usa la página
* compartida PaginaConsulta con la configuración de este módulo.
*
* ENTRADA: Ninguna.
*
* SALIDA: La página de Proveedores.
*
* OBJETIVO: Consultar los proveedores.
*-----------------------------------------------------------------------------------------*/

import { Truck } from 'lucide-react';
import PaginaConsulta from '../components/catalogo/PaginaConsulta';
import ProveedorDetalleModal from '../components/proveedores/ProveedorDetalleModal';
import { proveedoresApi } from '../services/catalogoApi';

const CONFIGURACION = {
    icono: Truck,
    titulo: 'Proveedores',
    descripcion: 'Consulta y busca proveedores registrados en Wide World Importers.',
    api: proveedoresApi,
    nombreSingular: 'proveedor',
    nombrePlural: 'proveedores',
    etiquetaTotal: 'Total de proveedores',
    campoTotal: 'Total_Proveedores',
    tabla: {
        campos: { id: 'SupplierID', nombre: 'Nombre_Proveedor', categoria: 'Categoria_Proveedor' },
        titulo: 'Nombre Proveedor',
        textoVacio: 'No se encontraron proveedores.'
    },
    VentanaDetalle: ProveedorDetalleModal
};

function ProveedoresPage() {
    return <PaginaConsulta configuracion={CONFIGURACION} />;
}

export default ProveedoresPage;
