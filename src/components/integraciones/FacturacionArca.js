import React from 'react';
import {
    faFileInvoice, faExchangeAlt, faGlobe, faPrint,
    faSync, faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';
import VerticalLanding from '../VerticalLanding';

const PAINS = [
    {
        icon: faFileInvoice,
        titulo: 'Facturar cada venta a mano en el portal de ARCA',
        descripcion: 'Entrás al portal, cargás los datos de nuevo, esperás el CAE y volvés a tu sistema para registrar la venta.',
        solucion: 'Facturación integrada: emitís la factura con CAE real de ARCA sin salir de Total Stock.',
    },
    {
        icon: faExchangeAlt,
        titulo: 'Armar una nota de crédito por un cambio o devolución',
        descripcion: 'Un cambio o una devolución implica volver a entrar al portal de ARCA y armar la nota de crédito a mano.',
        solucion: 'Notas de crédito integradas, vinculadas automáticamente al cambio o devolución.',
    },
    {
        icon: faGlobe,
        titulo: 'Facturar tus ventas online por separado',
        descripcion: 'Vendés por Mercado Libre o Tienda Nube y tenés que facturar cada pedido aparte.',
        solucion: 'Facturación automática opcional para las ventas de Mercado Libre y Tienda Nube.',
    },
    {
        icon: faPrint,
        titulo: 'Perder el PDF de una factura vieja',
        descripcion: 'Un cliente pide de nuevo una factura de hace semanas y no la encontrás.',
        solucion: 'Cada factura queda guardada y podés volver a descargarla en PDF cuando la necesites.',
    },
];

const FEATURES = [
    { icon: faFileInvoice, titulo: 'Facturas A, B y C', desc: 'El sistema decide automáticamente qué tipo de factura corresponde según tu condición de IVA y la del cliente.' },
    { icon: faSync, titulo: 'CAE real de ARCA', desc: 'Integración directa con el webservice oficial de ARCA (WSFE): el CAE se obtiene en segundos, no es una simulación.' },
    { icon: faExchangeAlt, titulo: 'Notas de crédito', desc: 'Emití notas de crédito A, B o C vinculadas a cambios y devoluciones.' },
    { icon: faPrint, titulo: 'PDF reimprimible', desc: 'Cada factura se guarda en el sistema y podés volver a descargar el PDF cuando lo necesites.' },
    { icon: faGlobe, titulo: 'Facturación automática de ventas online', desc: 'Activá la facturación automática para que cada venta de Mercado Libre o Tienda Nube se facture sola.' },
    { icon: faShieldAlt, titulo: 'Homologación y producción', desc: 'Probá la integración en el ambiente de homologación de ARCA antes de pasar a producción, con un asistente para cargar tu certificado.' },
];

const ACLARACION = {
    titulo: '¿Qué no incluye la facturación con ARCA?',
    texto: 'Hoy el sistema emite facturas A, B y C y sus notas de crédito. No emite notas de débito ni facturas de exportación. La facturación del punto de venta (mostrador) es manual, por venta; la automática aplica a los pedidos que llegan de Mercado Libre y Tienda Nube.',
};

export default function FacturacionArca() {
    return (
        <VerticalLanding
            metaTitle="Facturación electrónica ARCA para comercios | Total Stock"
            metaDescription="Facturación electrónica integrada con ARCA (ex AFIP): facturas A, B y C, notas de crédito y CAE real en segundos, sin salir del sistema. Disponible desde el plan Pro."
            canonical="https://www.totalstock.com.ar/facturacion-arca/"
            h1="Facturá con ARCA sin salir de tu sistema de gestión"
            heroSub="Emití facturas A, B y C con CAE real de ARCA, notas de crédito y PDF reimprimible, directo desde cada venta. Sin portales externos ni carga doble."
            painsTitle="Los problemas de facturar sin integración"
            pains={PAINS}
            featuresTitle="Cómo funciona la facturación con ARCA"
            features={FEATURES}
            aclaracion={ACLARACION}
            minPlanId="pro"
            minPlanNote="No incluye facturación ARCA"
        />
    );
}
