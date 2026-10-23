// BONITO_AMOR/frontend/src/components/FacturaImpresion.js
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import QRCode from 'qrcode';
import { useAuth } from '../AuthContext';
import { formatearMonto } from '../utils/formatearMonto';
import { esDispositivoMovil } from '../utils/esDispositivoMovil';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import WhatsappIcon from './icons/WhatsappIcon';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const normalizeApiUrl = (url) => {
    let u = url;
    if (u.endsWith('/api/') || u.endsWith('/api')) u = u.replace(/\/api\/?$/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
};
const BASE_API_ENDPOINT = normalizeApiUrl(API_BASE_URL);

const btnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    fontSize: 15,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
};
const styles = {
    btnPrint: { ...btnBase, backgroundColor: '#007bff', color: 'white' },
    btnNeutralDark: { ...btnBase, backgroundColor: '#6c757d', color: 'white' },
    btnMail: { ...btnBase, backgroundColor: '#3b9ede', color: 'white' },
    btnWhatsapp: { ...btnBase, backgroundColor: '#25D366', color: 'white' },
    btnTicket: { ...btnBase, backgroundColor: '#17a2b8', color: 'white' },
    btnDisabled: { opacity: 0.65, cursor: 'not-allowed' },
};

const FacturaImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { factura, venta, skipReciboPrompt, ventasLote } = location.state || {};
    // Factura de "consumos del mes" consolidada (ver ClienteDetalle.js ->
    // facturarConsumosMes): `venta` es solo la "representativa" del lote, con
    // detalles/total de ESA venta puntual, no del comprobante entero. Cuando
    // viene `ventasLote` con más de un elemento, se itemiza una línea por
    // venta del lote en vez de los detalles de productos (mismo criterio que
    // el PDF del backend, ver FacturaViewSet._construir_pdf_factura).
    const esConsolidada = Array.isArray(ventasLote) && ventasLote.length > 1;
    // Una Factura en estado 'ERROR' (intento de emisión que ARCA rechazó, ver
    // ProductoViewSet.emitir_factura) no tiene CAE y nunca fue autorizada -- no debe
    // poder imprimirse/enviarse como si fuera un comprobante válido.
    const facturaNoAutorizada = !!(factura && factura.estado && factura.estado !== 'EMITIDA');
    const facturaRef = useRef(null);
    const [enviandoEmail, setEnviandoEmail] = useState(false);
    const [compartiendo, setCompartiendo] = useState(false);
    const [imprimiendoA4, setImprimiendoA4] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    // Formato de impresión FÍSICA configurado por la tienda (Panel de Administración).
    // No afecta el PDF de mail/WhatsApp, que siempre es A4 (ver /pdf/).
    const formatoImpresion = factura?.tienda_formato_factura || 'termico';
    // Ancho real de impresión del ticket térmico -- 'termico' (papel de
    // 80mm) o 'termico_58' (papel de 58mm, imprime a 48mm, ancho típico de
    // cabezal para ese tamaño de rollo).
    const anchoTermico = formatoImpresion === 'termico_58' ? '48mm' : '80mm';
    // A 48mm "Cant."/"Subtotal" no entraban en una sola línea con el mismo
    // tamaño de letra que a 80mm -- quedaban partidos y feos.
    const fuenteGrid = formatoImpresion === 'termico_58' ? '2mm' : '2.5mm';

    // En formato A4 la vista previa en pantalla es el PDF real (el mismo que
    // se imprime y se manda por mail), no el layout térmico armado a mano.
    useEffect(() => {
        if (formatoImpresion !== 'A4' || !factura?.id) return;
        let urlActual = null;
        axios.get(`${BASE_API_ENDPOINT}/api/facturas/${factura.id}/pdf/`, {
            headers: { 'Authorization': `Bearer ${token}` },
            responseType: 'blob',
        }).then(resp => {
            urlActual = URL.createObjectURL(resp.data);
            setPdfPreviewUrl(urlActual);
        }).catch(() => {});
        return () => {
            if (urlActual) URL.revokeObjectURL(urlActual);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formatoImpresion, factura?.id, token]);

    // Tipo de comprobante → código numérico ARCA
    const TIPO_CMP_CODIGO = { 'A': 1, 'B': 6, 'C': 11 };

    // Tipo de documento receptor → código numérico ARCA
    const TIPO_DOC_CODIGO = { 'CUIT': 80, 'DNI': 96 };

    /**
     * Construye el JSON ARCA y retorna la URL de validación:
     * https://www.afip.gob.ar/fe/qr/?p=<base64>
     */
    const buildArcaUrl = (factura) => {
        if (!factura.cae) return null;

        const fecha = factura.fecha_emision
            ? factura.fecha_emision.substring(0, 10)
            : new Date().toISOString().substring(0, 10);

        const cuitEmisor = parseInt(
            String(factura.tienda_cuit || '').replace(/\D/g, ''), 10
        ) || 0;

        const tipoDocRec = TIPO_DOC_CODIGO[factura.cliente_tipo_documento] ?? 99;
        const nroDocRec = tipoDocRec !== 99
            ? parseInt(String(factura.cliente_cuit || '').replace(/\D/g, ''), 10) || 0
            : 0;

        const payload = {
            ver: 1,
            fecha,
            cuit: cuitEmisor,
            ptoVta: parseInt(factura.punto_venta, 10) || 0,
            tipoCmp: TIPO_CMP_CODIGO[factura.tipo_comprobante] ?? 11,
            nroCmp: parseInt(factura.numero_comprobante, 10) || 0,
            importe: parseFloat(factura.total) || 0,
            moneda: 'PES',
            ctz: 1,
            tipoDocRec,
            nroDocRec,
            tipoCodAut: 'E',
            codAut: parseInt(factura.cae, 10) || 0,
        };

        // Base64 estándar (con +, / y padding =), sin transformar a base64url -- es
        // literalmente lo que espera decodificar el validador de ARCA/AFIP. Referencia:
        // pyafipws/pyqr.py (misma librería que ya usa este backend para facturar), que
        // hace exactamente `base64.b64encode(json.dumps(datos).encode()).decode()` y
        // arma la URL sin ningún reemplazo de caracteres. La versión anterior de este
        // código convertía a base64url (+/ → -_, sin padding), lo que rompe el decoder
        // estándar de ARCA apenas el payload trae un '+', un '/' o necesita padding --
        // el celular abre el link pero la página no puede decodificar el JSON y no
        // muestra la factura.
        const base64 = btoa(JSON.stringify(payload));

        return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
    };

    useEffect(() => {
        if (!facturaRef.current || !factura) {
            if (facturaRef.current) {
                facturaRef.current.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <h1 style="color: #e25252;">Error al generar la factura.</h1>
                        <p>No se encontraron datos de factura válidos.</p>
                    </div>
                `;
            }
            return;
        }

        if (facturaNoAutorizada) {
            facturaRef.current.innerHTML = `
                <div style="text-align: center; padding: 20px; max-width: 420px; margin: 0 auto;">
                    <h1 style="color: #e25252;">Esta factura no fue autorizada por ARCA</h1>
                    <p>El intento de emisión falló${factura.error_mensaje ? `: "${factura.error_mensaje}"` : '.'} No tiene CAE ni QR, y no es un comprobante fiscal válido -- no se puede imprimir ni enviar.</p>
                    <p>Volvé a intentar emitirla desde <strong>Listado de Ventas</strong> con el botón "Facturar".</p>
                </div>
            `;
            return;
        }

        const renderFactura = async () => {
            facturaRef.current.innerHTML = '';

            const formatFecha = (fecha) => {
                if (!fecha) return 'N/A';
                const d = new Date(fecha);
                return !isNaN(d.getTime()) ? d.toLocaleString('es-AR', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                }) : fecha;
            };

            const generarCodigoNumerico13Digitos = (ventaId) => {
                const ventaIdSinGuiones = String(ventaId).replace(/-/g, '');
                let hash = 0;
                for (let i = 0; i < ventaIdSinGuiones.length; i++) {
                    hash = (hash * 31 + ventaIdSinGuiones.charCodeAt(i)) % 1000000000;
                }
                const hash9Digitos = String(Math.abs(hash)).padStart(9, '0').substring(0, 9);
                let code = '779' + hash9Digitos;
                let sum = 0;
                for (let i = 0; i < 12; i++) {
                    sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
                }
                return code + ((10 - (sum % 10)) % 10).toString();
            };

            const codigoNumerico = venta?.id ? generarCodigoNumerico13Digitos(venta.id) : 'N/A';

            const tipoFacturaText = {
                'A': 'Factura A', 'B': 'Factura B', 'C': 'Factura C'
            }[factura.tipo_comprobante] || factura.tipo_comprobante;

            const condicionIvaText = {
                'RI': 'Responsable Inscripto', 'CF': 'Consumidor Final',
                'EX': 'Exento', 'MT': 'Monotributo', 'NR': 'No Responsable'
            }[factura.cliente_condicion_iva] || factura.cliente_condicion_iva;

            // Marca y últimos 4 dígitos de la tarjeta (si se cargaron al procesar la venta)
            const marcaTarjetaText = venta?.tipo_tarjeta
                ? ({ VISA: 'Visa', MASTERCARD: 'Mastercard', NARANJA_X: 'Naranja X', AMEX: 'Amex' }[venta.tipo_tarjeta] || venta.tipo_tarjeta)
                : '';
            const numeroTarjetaText = venta?.numero_tarjeta ? `**** ${venta.numero_tarjeta}` : '';
            const tarjetaText = [marcaTarjetaText, numeroTarjetaText].filter(Boolean).join(' ');

            const detalles = esConsolidada ? [] : (venta?.detalles || []);

            // Consolidada: no hay descuento/recargo de producto que calcular
            // (cada venta del lote ya tiene su propio total cerrado) -- el
            // subtotal con IVA es directamente el total facturado.
            let subtotalInicialConIva = esConsolidada ? parseFloat(factura.total) : 0;
            if (!esConsolidada) {
                detalles.forEach(item => {
                    if (!item.anulado_individualmente) {
                        subtotalInicialConIva += parseFloat(item.precio_unitario || 0) * (item.cantidad || 0);
                    }
                });
            }

            let descuentoMonto = 0;
            let recargoMonto = 0;
            if (!esConsolidada) {
                if (venta?.descuento_porcentaje > 0) {
                    descuentoMonto = subtotalInicialConIva * (venta.descuento_porcentaje / 100);
                } else if (venta?.descuento_monto > 0) {
                    descuentoMonto = parseFloat(venta.descuento_monto);
                }
                if (venta?.recargo_porcentaje > 0) {
                    recargoMonto = (subtotalInicialConIva - descuentoMonto) * (venta.recargo_porcentaje / 100);
                } else if (venta?.recargo_monto > 0) {
                    recargoMonto = parseFloat(venta.recargo_monto);
                }
            }

            const totalFinal = esConsolidada ? parseFloat(factura.total) : parseFloat(venta?.total || factura.total);
            const subtotalFinalSinIva = totalFinal / 1.21;
            const ivaFinal = totalFinal - subtotalFinalSinIva;

            // --- QR ARCA ---
            let qrImgTag = '';
            const arcaUrl = buildArcaUrl(factura);
            if (arcaUrl) {
                try {
                    const qrDataUrl = await QRCode.toDataURL(arcaUrl, {
                        width: 120,
                        margin: 1,
                        color: { dark: '#000000', light: '#ffffff' },
                    });
                    qrImgTag = `
                        <div style="text-align:center; margin-top:2mm;">
                            <img src="${qrDataUrl}" alt="QR ARCA" style="width:22mm; height:22mm; display:block; margin:0 auto 1mm;" />
                            <p style="font-size:2mm; color:#000; margin:0; -webkit-font-smoothing:none;">Verificá en <strong>afip.gob.ar/fe/qr</strong></p>
                        </div>
                    `;
                } catch (e) {
                    // Si falla la generación del QR, no lo mostramos
                }
            }

            const facturaLogo = factura.tienda_logo || venta?.tienda_logo;
            // Con logo, el nombre de la tienda pasa a un segundo plano (el logo ya la identifica)
            const tiendaNombreStyle = facturaLogo
                ? 'font-size: 3mm; font-weight: normal; color: #555;'
                : 'font-size: 5mm; font-weight: bold; color: #000;';
            facturaRef.current.innerHTML = `
                <div class="invoice" style="font-family: Arial, sans-serif; max-width: ${anchoTermico}; margin: 0 auto; padding: 5mm;">
                    <div class="header" style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5mm; margin-bottom: 5mm;">
                        ${facturaLogo
                            ? `<img src="${facturaLogo}" alt="Logo" style="max-width: 25mm; max-height: 15mm; display: block; margin: 0 auto 2mm; object-fit: contain;" />`
                            : `<div style="display:flex;justify-content:center;margin-bottom:2mm;">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 130" width="28mm" style="display:block;">
                                    <circle cx="110" cy="65" r="58" fill="none" stroke="#000" stroke-width="2.5"/>
                                    <circle cx="52" cy="65" r="7" fill="#000"/>
                                    <circle cx="168" cy="65" r="7" fill="#000"/>
                                    <text x="110" y="85" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="52" font-weight="900" fill="#000" letter-spacing="1">ARCA</text>
                                </svg>
                            </div>`
                        }
                        <h1 style="${tiendaNombreStyle} margin: 0; -webkit-font-smoothing: none;">${factura.tienda_nombre || 'N/A'}</h1>
                        <p style="font-size: 4mm; font-weight: bold; color: #000; margin: 2mm 0; -webkit-font-smoothing: none;">${tipoFacturaText}</p>
                        ${factura.tienda_cuit ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;">CUIT: ${factura.tienda_cuit}</p>` : ''}
                        ${factura.tienda_direccion ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;">${factura.tienda_direccion}</p>` : ''}
                    </div>

                    <div class="invoice-info" style="margin-bottom: 5mm;">
                        <p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Fecha:</strong> ${formatFecha(factura.fecha_emision)}</p>
                        <p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>ID de Venta:</strong> ${codigoNumerico}</p>
                        <p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Comprobante:</strong> ${String(factura.punto_venta || 0).padStart(4, '0')}-${String(factura.numero_comprobante || 0).padStart(8, '0')}</p>
                        ${factura.cae ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>CAE:</strong> ${factura.cae}</p>` : ''}
                        ${factura.fecha_vencimiento_cae ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>CAE Vto:</strong> ${new Date(factura.fecha_vencimiento_cae).toLocaleDateString('es-AR')}</p>` : ''}
                        ${tarjetaText ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Tarjeta:</strong> ${tarjetaText}</p>` : ''}
                        ${venta?.observaciones ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Observaciones:</strong> ${String(venta.observaciones).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</p>` : ''}
                    </div>

                    <div class="client-info" style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3mm 0; margin-bottom: 5mm;">
                        <p style="font-size: 2.5mm; font-weight: bold; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;">DATOS DEL CLIENTE</p>
                        <p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Nombre:</strong> ${factura.cliente_nombre || 'Consumidor Final'}</p>
                        ${factura.cliente_cuit ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>CUIT/DNI:</strong> ${factura.cliente_cuit}</p>` : ''}
                        ${factura.cliente_domicilio ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Domicilio:</strong> ${factura.cliente_domicilio}</p>` : ''}
                        <p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Condición IVA:</strong> ${condicionIvaText}</p>
                    </div>

                    <div class="items" style="margin-bottom: 5mm;">
                        <div class="items-grid-header">
                            <div>Cant.</div>
                            <div>Descripción</div>
                            <div style="text-align: right;">Precio</div>
                            <div style="text-align: right;">Subtotal</div>
                        </div>
                        ${esConsolidada ? ventasLote.map(v => {
                            const fechaStr = v.fecha_venta ? new Date(v.fecha_venta).toLocaleDateString('es-AR') : 'N/A';
                            const total = parseFloat(v.total || 0);
                            return `
                            <div class="items-grid-row">
                                <div>1</div>
                                <div>Consumo Cuenta Corriente del ${fechaStr}</div>
                                <div style="text-align: right;">${formatearMonto(total)}</div>
                                <div style="text-align: right;">${formatearMonto(total)}</div>
                            </div>`;
                        }).join('') : (detalles.length > 0 ? detalles.map(item => {
                            if (item.anulado_individualmente) return '';
                            let nombre = item.producto?.nombre || item.producto_nombre || 'Producto eliminado';
                            const variante = [item.producto_talle, item.producto_variante2].filter(Boolean).join(', ');
                            if (variante) nombre += ` (${variante})`;
                            const cantidad = item.cantidad || 0;
                            const precio = item.precio_unitario || 0;
                            const subtotal = cantidad * parseFloat(precio);
                            return `
                            <div class="items-grid-row">
                                <div>${cantidad}</div>
                                <div>${nombre}</div>
                                <div style="text-align: right;">${formatearMonto(precio)}</div>
                                <div style="text-align: right;">${formatearMonto(subtotal)}</div>
                            </div>`;
                        }).join('') : '<div class="items-grid-row" style="text-align: center;">No hay detalles disponibles</div>')}
                    </div>

                    <div class="totals" style="border-top: 2px solid #000; padding-top: 3mm;">
                        <p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Subtotal:</strong> ${formatearMonto(subtotalInicialConIva)}</p>
                        ${descuentoMonto > 0 ? `<p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Descuento${venta?.descuento_porcentaje > 0 ? ` (${venta.descuento_porcentaje}%)` : ''}:</strong> -${formatearMonto(descuentoMonto)}</p>` : ''}
                        ${recargoMonto > 0 ? `<p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Recargo${venta?.recargo_porcentaje > 0 ? ` (${venta.recargo_porcentaje}%)` : ''}:</strong> +${formatearMonto(recargoMonto)}</p>` : ''}
                        <p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Subtotal (sin IVA):</strong> ${formatearMonto(subtotalFinalSinIva)}</p>
                        ${ivaFinal > 0 ? `<p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>IVA 21%:</strong> ${formatearMonto(ivaFinal)}</p>` : ''}
                        <p style="font-size: 4mm; font-weight: bold; color: #000; margin: 2mm 0; text-align: right; -webkit-font-smoothing: none; border-top: 1px solid #000; padding-top: 2mm;"><strong>TOTAL: ${formatearMonto(totalFinal)}</strong></p>
                    </div>

                    <div class="footer" style="text-align: center; margin-top: 3mm; padding-top: 2mm; border-top: 1px solid #000;">
                        <p style="font-size: 2.5mm; color: #000; -webkit-font-smoothing: none;"><i>¡Gracias por su compra!</i></p>
                        ${qrImgTag}
                    </div>
                </div>
            `;
        };

        renderFactura();
    }, [factura, venta, ventasLote]); // eslint-disable-line react-hooks/exhaustive-deps

    const preguntarPorRecibo = () => {
        if (!skipReciboPrompt) {
            setTimeout(() => {
                Swal.fire({
                    title: '¿Desea imprimir el recibo?',
                    text: 'El recibo contiene el detalle completo de la venta',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, imprimir recibo',
                    cancelButtonText: 'No, terminar',
                }).then((result) => {
                    if (result.isConfirmed && venta) {
                        navigate('/recibo', { state: { venta: venta } });
                    } else {
                        navigate('/punto-venta');
                    }
                });
            }, 1000);
        } else {
            setTimeout(() => {
                navigate('/punto-venta');
            }, 500);
        }
    };

    const handlePrint = () => {
        window.print();
        preguntarPorRecibo();
    };

    // Formato A4: en vez del layout térmico armado a mano, imprime el MISMO PDF
    // en A4 que ya se usa para mail/WhatsApp (/pdf/) -- evita mantener dos
    // layouts A4 distintos que podrían desalinearse entre sí.
    const handlePrintA4 = async () => {
        if (!factura || !factura.id) {
            Swal.fire('Error', 'No se encontró información de la factura.', 'error');
            return;
        }
        setImprimiendoA4(true);
        try {
            const resp = await axios.get(`${BASE_API_ENDPOINT}/api/facturas/${factura.id}/pdf/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(resp.data);
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            iframe.src = url;
            iframe.onload = () => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                } catch (e) {
                    Swal.fire('Error', 'No se pudo abrir el diálogo de impresión.', 'error');
                }
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                }, 60000);
            };
            document.body.appendChild(iframe);
            preguntarPorRecibo();
        } catch (err) {
            Swal.fire('Error', 'No se pudo generar el PDF para imprimir.', 'error');
        } finally {
            setImprimiendoA4(false);
        }
    };

    const handleGoBack = () => navigate('/punto-venta');

    const enviarPorEmail = async () => {
        if (!factura || !factura.id) {
            Swal.fire('Error', 'No se encontró información de la factura.', 'error');
            return;
        }
        const { value: email } = await Swal.fire({
            title: 'Enviar factura por mail',
            input: 'email',
            inputLabel: 'Email de destino',
            inputValue: venta?.cliente_email || '',
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
        });
        if (!email) return;
        setEnviandoEmail(true);
        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/facturas/${factura.id}/enviar-email/`, { email }, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            Swal.fire('¡Enviado!', `La factura se envió a ${email}.`, 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            Swal.fire('Error', msg, 'error');
        } finally {
            setEnviandoEmail(false);
        }
    };

    const compartirPorWhatsapp = async () => {
        if (!factura || !factura.id) {
            Swal.fire('Error', 'No se encontró información de la factura.', 'error');
            return;
        }
        setCompartiendo(true);
        try {
            const resp = await axios.get(`${BASE_API_ENDPOINT}/api/facturas/${factura.id}/pdf/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob',
            });
            const numeroStr = `${String(factura.punto_venta || 0).padStart(4, '0')}-${String(factura.numero_comprobante || 0).padStart(8, '0')}`;
            const filename = `factura_${numeroStr}.pdf`;
            const mensaje = `Hola! Te comparto la Factura ${factura.tipo_comprobante} ${numeroStr} de ${factura.tienda_nombre || 'la tienda'}.`;

            // Celular/tablet: el selector nativo de apps ya adjunta el PDF real.
            let file = null;
            try { file = new File([resp.data], filename, { type: 'application/pdf' }); } catch { /* File no disponible */ }
            if (file && esDispositivoMovil() && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], text: mensaje });
                return;
            }

            // Compu (o navegador sin soporte para compartir archivos): descargar el
            // PDF y abrir WhatsApp con el mensaje ya armado -- falta adjuntarlo a mano
            // en el chat que se abre (no hay forma de adjuntar un archivo por link).
            const url = URL.createObjectURL(resp.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);

            const telefonoLimpio = (venta?.cliente_telefono || '').replace(/\D/g, '');
            const destino = telefonoLimpio.length >= 10 ? telefonoLimpio : '';
            const textoWa = `${mensaje} Te descargamos el PDF: adjuntalo en este chat.`;
            window.open(`https://wa.me/${destino}?text=${encodeURIComponent(textoWa)}`, '_blank');
        } catch (err) {
            if (err?.name === 'AbortError') return; // el usuario cerró el selector nativo sin elegir nada
            Swal.fire('Error', 'No se pudo compartir la factura.', 'error');
        } finally {
            setCompartiendo(false);
        }
    };

    const handleTicketCambio = () => {
        if (!venta?.id) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se encontró información de la venta' });
            return;
        }
        navigate('/ticket-cambio', { state: { venta } });
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {!facturaNoAutorizada && (
                    <>
                        {formatoImpresion === 'A4' ? (
                            <button onClick={handlePrintA4} disabled={imprimiendoA4} style={{ ...styles.btnPrint, ...(imprimiendoA4 ? styles.btnDisabled : {}) }}>
                                {imprimiendoA4 ? 'Preparando...' : 'Imprimir Factura (A4)'}
                            </button>
                        ) : (
                            <button onClick={handlePrint} style={styles.btnPrint}>
                                Imprimir Factura
                            </button>
                        )}
                        <button onClick={enviarPorEmail} disabled={enviandoEmail} style={{ ...styles.btnMail, ...(enviandoEmail ? styles.btnDisabled : {}) }}>
                            <FontAwesomeIcon icon={faEnvelope} />
                            {enviandoEmail ? 'Enviando...' : 'Enviar por mail'}
                        </button>
                        <button onClick={compartirPorWhatsapp} disabled={compartiendo} style={{ ...styles.btnWhatsapp, ...(compartiendo ? styles.btnDisabled : {}) }}>
                            <WhatsappIcon />
                            {compartiendo ? 'Preparando...' : 'Compartir por WhatsApp'}
                        </button>
                    </>
                )}
                {!esConsolidada && (
                    <button onClick={handleTicketCambio} style={styles.btnTicket}>
                        Ticket de cambio
                    </button>
                )}
                <button onClick={handleGoBack} style={styles.btnNeutralDark}>
                    Volver
                </button>
            </div>

            {formatoImpresion === 'A4' && (
                pdfPreviewUrl ? (
                    <iframe
                        src={pdfPreviewUrl}
                        title="Vista previa de la factura (A4)"
                        style={{ width: '100%', maxWidth: 820, height: '80vh', border: '1px solid #e2e8f0', borderRadius: 8 }}
                    />
                ) : (
                    <p style={{ color: '#64748b' }}>Generando vista previa…</p>
                )
            )}
            {/* El layout térmico sigue montado (oculto si el formato es A4) -- el
                efecto de más arriba que arma facturaRef.current.innerHTML asume que
                la ref siempre está presente, no desmontar este div condicionalmente. */}
            <div
                ref={facturaRef}
                id="factura-content"
                style={formatoImpresion === 'A4' ? { display: 'none' } : undefined}
            ></div>

            <style>{`
                @page { size: ${anchoTermico} auto; margin: 0; }
                /* Grid de divs en vez de <table> para el listado de productos --
                   un <table> le exige al driver de la impresora térmica negociar
                   el alto de fila entre celdas, y terminaba superponiendo texto
                   cuando la Descripción bajaba de renglón (table-layout: fixed no
                   alcanzó). Con divs cada fila crece sola según su contenido. */
                .items-grid-header, .items-grid-row {
                    display: grid;
                    grid-template-columns: 10% 46% 22% 22%;
                    gap: 2px;
                    font-size: ${fuenteGrid};
                    color: #000;
                    -webkit-font-smoothing: none;
                    padding: 1mm 0;
                }
                /* Solo la columna Descripción (2da) baja de renglón -- Cant./
                   Precio/Subtotal son valores cortos que no deberían partirse
                   nunca (ej. "$20.000,00" cortado en "$20.00" / "0,00" queda
                   ilegible). */
                .items-grid-header > div:nth-child(2),
                .items-grid-row > div:nth-child(2) {
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
                .items-grid-header > div:not(:nth-child(2)),
                .items-grid-row > div:not(:nth-child(2)) {
                    white-space: nowrap;
                }
                .items-grid-header {
                    background-color: #f0f0f0;
                    border-bottom: 1px solid #000;
                    font-weight: bold;
                }
                .items-grid-row {
                    border-bottom: 1px dashed #ccc;
                }
                @media print {
                    body * { visibility: hidden; }
                    #factura-content, #factura-content * { visibility: visible; }
                    #factura-content { position: absolute; left: 0; top: 0; width: ${anchoTermico}; }
                    button { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default FacturaImpresion;
