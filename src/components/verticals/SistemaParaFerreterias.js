import React from 'react';
import {
    faBarcode, faBoxOpen, faFileInvoice, faWarehouse,
    faShoppingCart, faPrint,
} from '@fortawesome/free-solid-svg-icons';
import VerticalLanding from '../VerticalLanding';

const PAINS = [
    {
        icon: faBarcode,
        titulo: 'Buscar un producto a mano te hace perder tiempo y clientes',
        descripcion: 'Con miles de artículos distintos, encontrar el precio y el stock de algo a mano en el mostrador es lento y termina en errores.',
        solucion: 'Búsqueda instantánea por código de barras o nombre, con precio y stock actualizados.',
    },
    {
        icon: faBoxOpen,
        titulo: 'No sabés qué te falta pedir al proveedor',
        descripcion: 'Te das cuenta que te quedaste sin algo recién cuando el cliente ya está esperando en el mostrador.',
        solucion: 'Stock en tiempo real con alertas de bajo inventario.',
    },
    {
        icon: faWarehouse,
        titulo: 'No llevás un registro claro de las compras a proveedores',
        descripcion: 'Las compras quedan en remitos sueltos y no sabés cuánto compraste, a qué costo ni cómo impactó en el stock.',
        solucion: 'Registro de compras con actualización automática de costos y stock.',
    },
    {
        icon: faFileInvoice,
        titulo: 'Facturar cada venta del mostrador es lento',
        descripcion: 'Entre atender, cobrar y facturar a mano, perdés tiempo con cada cliente que pasa por caja.',
        solucion: 'Facturación electrónica integrada con ARCA en segundos.',
    },
];

const FEATURES = [
    { icon: faBarcode, titulo: 'Búsqueda por código de barras', desc: 'Encontrá cualquier producto al instante por código de barras o nombre, sin perder tiempo en el mostrador.' },
    { icon: faShoppingCart, titulo: 'Punto de venta ágil', desc: 'Cobrá rápido con múltiples métodos de pago y gestión de caja.' },
    { icon: faWarehouse, titulo: 'Control de stock con alertas', desc: 'Sabé qué tenés y qué te falta, con alertas de stock bajo por producto.' },
    { icon: faBoxOpen, titulo: 'Registro de compras a proveedores', desc: 'Cargá tus compras y actualizá costos y stock de forma automática.' },
    { icon: faFileInvoice, titulo: 'Factura electrónica ARCA', desc: 'Emití facturas A, B y C sin salir del sistema.' },
    { icon: faPrint, titulo: 'Etiquetas con código de barras', desc: 'Imprimí etiquetas de precio compatibles con impresoras térmicas.' },
];

const TESTIMONIOS = [
    { src: '/clientes/ferreteria-rioja.jpg', nombre: 'Ferretería Rioja' },
];

export default function SistemaParaFerreterias() {
    return (
        <VerticalLanding
            metaTitle="Sistema de gestión para ferreterías | Total Stock"
            metaDescription="Sistema de gestión para ferreterías: búsqueda por código de barras, control de stock con alertas, compras a proveedores, punto de venta y facturación electrónica ARCA."
            canonical="https://www.totalstock.com.ar/sistema-para-ferreterias/"
            h1="Gestioná tu ferretería sin perder tiempo buscando precio y stock"
            heroSub="Controlá miles de productos con código de barras, vendé rápido en el mostrador, facturá con ARCA y llevá un registro claro de tus compras a proveedores. Todo en un mismo sistema."
            painsTitle="Los problemas de todos los días en una ferretería"
            pains={PAINS}
            featuresTitle="Todo lo que necesita una ferretería"
            features={FEATURES}
            testimoniosTitle="Ferreterías que ya usan Total Stock"
            testimonios={TESTIMONIOS}
        />
    );
}
