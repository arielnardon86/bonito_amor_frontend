import React from 'react';
import {
    faBarcode, faBoxOpen, faClock, faFileInvoice,
    faShoppingCart, faWarehouse, faUsers, faPrint,
} from '@fortawesome/free-solid-svg-icons';
import VerticalLanding from '../VerticalLanding';

const PAINS = [
    {
        icon: faBarcode,
        titulo: 'Cada venta te lleva demasiado tiempo',
        descripcion: 'En un kiosco cada segundo cuenta: buscar un precio a mano hace que se forme cola en la caja.',
        solucion: 'Cobro rápido por código de barras, con precio y stock actualizados al instante.',
    },
    {
        icon: faBoxOpen,
        titulo: 'Con tantos productos chicos, perdés el control del stock',
        descripcion: 'Entre golosinas, cigarrillos, bebidas y decenas de artículos más, es imposible llevar la cuenta a mano de qué te queda.',
        solucion: 'Stock en tiempo real con alertas de bajo inventario.',
    },
    {
        icon: faClock,
        titulo: 'Cerrar la caja del día te lleva horas',
        descripcion: 'Cuadrar el efectivo, las tarjetas y los pagos con QR al final del día, a mano, es un lío.',
        solucion: 'Punto de venta con múltiples métodos de pago y cierre de caja automático.',
    },
    {
        icon: faFileInvoice,
        titulo: 'Facturar cada venta es una demora extra',
        descripcion: 'Con el volumen de ventas de un kiosco, perder tiempo facturando a mano no es una opción.',
        solucion: 'Facturación electrónica integrada con ARCA en segundos.',
    },
];

const FEATURES = [
    { icon: faBarcode, titulo: 'Cobro rápido por código de barras', desc: 'Escaneá y cobrá en segundos, sin perder tiempo buscando precios.' },
    { icon: faShoppingCart, titulo: 'Múltiples medios de pago', desc: 'Efectivo, tarjeta o QR: todo en el mismo carrito de venta.' },
    { icon: faWarehouse, titulo: 'Control de stock con alertas', desc: 'Sabé qué tenés y qué te falta reponer, con alertas de stock bajo.' },
    { icon: faFileInvoice, titulo: 'Factura electrónica ARCA', desc: 'Emití facturas A, B y C sin salir del sistema.' },
    { icon: faUsers, titulo: 'Control de usuarios', desc: 'Asigná roles con permisos diferenciados para cada turno: admin, supervisor o cajero.' },
    { icon: faPrint, titulo: 'Recibos y etiquetas', desc: 'Imprimí tickets y etiquetas compatibles con impresoras térmicas.' },
];

export default function SistemaParaKioscos() {
    return (
        <VerticalLanding
            metaTitle="Sistema de gestión para kioscos | Total Stock"
            metaDescription="Sistema de gestión para kioscos: punto de venta rápido por código de barras, control de stock con alertas, facturación electrónica ARCA y cierre de caja automático."
            canonical="https://www.totalstock.com.ar/sistema-para-kioscos/"
            h1="Gestioná tu kiosco sin perder tiempo en cada venta"
            heroSub="Cobrá en segundos con código de barras, controlá el stock de cientos de productos chicos y llevá la caja del día sin sorpresas. Todo en un mismo sistema."
            painsTitle="Los problemas de todos los días en un kiosco"
            pains={PAINS}
            featuresTitle="Todo lo que necesita un kiosco"
            features={FEATURES}
        />
    );
}
