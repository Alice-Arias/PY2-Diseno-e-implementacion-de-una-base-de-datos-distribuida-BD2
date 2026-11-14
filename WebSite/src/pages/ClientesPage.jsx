/*---------------------------------------------------------------------------------------*
* NOMBRE: ClientesPage.jsx
*
* DESCRIPCION: Página de Clientes (rol Administrador, solo consulta). Usa la página
* compartida PaginaConsulta con la configuración de este módulo.
*
* ENTRADA: Ninguna.
*
* SALIDA: La página de Clientes.
*
* OBJETIVO: Consultar los clientes de la sucursal.
*-----------------------------------------------------------------------------------------*/

import { Users } from 'lucide-react';
import PaginaConsulta from '../components/catalogo/PaginaConsulta';
import ClienteDetalleModal from '../components/clientes/ClienteDetalleModal';
import { clientesApi } from '../services/catalogoApi';

const CONFIGURACION = {
    icono: Users,
    titulo: 'Clientes',
    descripcion: 'Consulta y busca clientes registrados en Wide World Importers.',
    api: clientesApi,
    nombreSingular: 'cliente',
    nombrePlural: 'clientes',
    etiquetaTotal: 'Total de clientes',
    campoTotal: 'Total_Clientes',
    tabla: {
        campos: { id: 'CustomerID', nombre: 'Nombre_Cliente', categoria: 'Categoria_Cliente' },
        titulo: 'Nombre Cliente',
        textoVacio: 'No se encontraron clientes.'
    },
    VentanaDetalle: ClienteDetalleModal
};

function ClientesPage() {
    return <PaginaConsulta configuracion={CONFIGURACION} />;
}

export default ClientesPage;
