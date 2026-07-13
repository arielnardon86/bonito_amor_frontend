// BONITO_AMOR/frontend/src/components/FacturaImpresion.js
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import QRCode from 'qrcode';
import { formatearMonto } from '../utils/formatearMonto';

const FacturaImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { factura, venta, skipReciboPrompt } = location.state || {};
    const facturaRef = useRef(null);

    // Tipo de comprobante → código numérico ARCA/AFIP
    const TIPO_CMP_CODIGO = { 'A': 1, 'B': 6, 'C': 11 };

    // Tipo de documento receptor → código numérico ARCA/AFIP
    const TIPO_DOC_CODIGO = { 'CUIT': 80, 'DNI': 96 };

    /**
     * Construye el JSON ARCA/AFIP y retorna la URL de validación:
     * https://www.afip.gob.ar/fe/qr/?p=<base64url>
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

        // Base64url (sin padding, + → -, / → _)
        const base64url = btoa(JSON.stringify(payload))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        return `https://www.afip.gob.ar/fe/qr/?p=${base64url}`;
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

            const detalles = venta?.detalles || [];

            let subtotalInicialConIva = 0;
            detalles.forEach(item => {
                if (!item.anulado_individualmente) {
                    subtotalInicialConIva += parseFloat(item.precio_unitario || 0) * (item.cantidad || 0);
                }
            });

            let descuentoMonto = 0;
            let recargoMonto = 0;
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

            const totalFinal = parseFloat(venta?.total || factura.total);
            const subtotalFinalSinIva = totalFinal / 1.21;
            const ivaFinal = totalFinal - subtotalFinalSinIva;

            // --- QR ARCA ---
            let qrImgTag = '';
            const arcaUrl = buildArcaUrl(factura);
            if (arcaUrl) {
                try {
                    const qrDataUrl = await QRCode.toDataURL(arcaUrl, {
                        width: 150,
                        margin: 1,
                        color: { dark: '#000000', light: '#ffffff' },
                    });
                    qrImgTag = `
                        <div style="text-align:center; margin-top:4mm;">
                            <img src="${qrDataUrl}" alt="QR ARCA" style="width:28mm; height:28mm; display:block; margin:0 auto 1mm;" />
                            <p style="font-size:2mm; color:#000; margin:0; -webkit-font-smoothing:none;">Verificá en <strong>afip.gob.ar/fe/qr</strong></p>
                        </div>
                    `;
                } catch (e) {
                    // Si falla la generación del QR, no lo mostramos
                }
            }

            facturaRef.current.innerHTML = `
                <div class="invoice" style="font-family: Arial, sans-serif; max-width: 80mm; margin: 0 auto; padding: 5mm;">
                    <div class="header" style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5mm; margin-bottom: 5mm;">
                        <div style="display:flex;justify-content:center;margin-bottom:2mm;">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 130" width="28mm" style="display:block;">
                                <circle cx="110" cy="65" r="58" fill="none" stroke="#000" stroke-width="2.5"/>
                                <circle cx="52" cy="65" r="7" fill="#000"/>
                                <circle cx="168" cy="65" r="7" fill="#000"/>
                                <text x="110" y="85" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="52" font-weight="900" fill="#000" letter-spacing="1">ARCA</text>
                            </svg>
                        </div>
                        <h1 style="font-size: 5mm; font-weight: bold; color: #000; margin: 0; -webkit-font-smoothing: none;">${factura.tienda_nombre || 'N/A'}</h1>
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
                    </div>

                    <div class="client-info" style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3mm 0; margin-bottom: 5mm;">
                        <p style="font-size: 2.5mm; font-weight: bold; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;">DATOS DEL CLIENTE</p>
                        <p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Nombre:</strong> ${factura.cliente_nombre || 'Consumidor Final'}</p>
                        ${factura.cliente_cuit ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>CUIT/DNI:</strong> ${factura.cliente_cuit}</p>` : ''}
                        ${factura.cliente_domicilio ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Domicilio:</strong> ${factura.cliente_domicilio}</p>` : ''}
                        <p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;"><strong>Condición IVA:</strong> ${condicionIvaText}</p>
                    </div>

                    <div class="items" style="margin-bottom: 5mm;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 2.5mm;">
                            <thead>
                                <tr style="background-color: #f0f0f0; border-bottom: 1px solid #000;">
                                    <th style="text-align: left; padding: 1mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Cant.</th>
                                    <th style="text-align: left; padding: 1mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Descripción</th>
                                    <th style="text-align: right; padding: 1mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Precio</th>
                                    <th style="text-align: right; padding: 1mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detalles.length > 0 ? detalles.map(item => {
                                    if (item.anulado_individualmente) return '';
                                    const nombre = item.producto?.nombre || item.producto_nombre || 'Producto eliminado';
                                    const cantidad = item.cantidad || 0;
                                    const precio = item.precio_unitario || 0;
                                    const subtotal = cantidad * parseFloat(precio);
                                    return `
                                    <tr style="border-bottom: 1px dashed #ccc;">
                                        <td style="padding: 1mm; color: #000; -webkit-font-smoothing: none;">${cantidad}</td>
                                        <td style="padding: 1mm; color: #000; -webkit-font-smoothing: none;">${nombre}</td>
                                        <td style="text-align: right; padding: 1mm; color: #000; -webkit-font-smoothing: none;">${formatearMonto(precio)}</td>
                                        <td style="text-align: right; padding: 1mm; color: #000; -webkit-font-smoothing: none;">${formatearMonto(subtotal)}</td>
                                    </tr>`;
                                }).join('') : '<tr><td colspan="4" style="text-align: center; padding: 2mm; color: #000;">No hay detalles disponibles</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <div class="totals" style="border-top: 2px solid #000; padding-top: 3mm;">
                        <p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Subtotal:</strong> ${formatearMonto(subtotalInicialConIva)}</p>
                        ${descuentoMonto > 0 ? `<p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Descuento${venta?.descuento_porcentaje > 0 ? ` (${venta.descuento_porcentaje}%)` : ''}:</strong> -${formatearMonto(descuentoMonto)}</p>` : ''}
                        ${recargoMonto > 0 ? `<p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Recargo${venta?.recargo_porcentaje > 0 ? ` (${venta.recargo_porcentaje}%)` : ''}:</strong> +${formatearMonto(recargoMonto)}</p>` : ''}
                        <p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Subtotal (sin IVA):</strong> ${formatearMonto(subtotalFinalSinIva)}</p>
                        ${ivaFinal > 0 ? `<p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>IVA 21%:</strong> ${formatearMonto(ivaFinal)}</p>` : ''}
                        <p style="font-size: 4mm; font-weight: bold; color: #000; margin: 2mm 0; text-align: right; -webkit-font-smoothing: none; border-top: 1px solid #000; padding-top: 2mm;"><strong>TOTAL: ${formatearMonto(totalFinal)}</strong></p>
                    </div>

                    <div class="footer" style="text-align: center; margin-top: 5mm; padding-top: 3mm; border-top: 1px solid #000;">
                        <p style="font-size: 2.5mm; color: #000; -webkit-font-smoothing: none;"><i>¡Gracias por su compra!</i></p>
                        ${qrImgTag}
                    </div>
                </div>
            `;
        };

        renderFactura();
    }, [factura, venta]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePrint = () => {
        window.print();

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

    const handleGoBack = () => navigate('/punto-venta');

    const handleTicketCambio = () => {
        if (!venta?.id) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se encontró información de la venta' });
            return;
        }
        navigate('/ticket-cambio', { state: { venta } });
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                    onClick={handlePrint}
                    style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Imprimir Factura
                </button>
                <button
                    onClick={handleTicketCambio}
                    style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Ticket de cambio
                </button>
                <button
                    onClick={handleGoBack}
                    style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Volver
                </button>
            </div>

            <div ref={facturaRef} id="factura-content"></div>

            <style>{`
                @page { margin: 0; }
                @media print {
                    body * { visibility: hidden; }
                    #factura-content, #factura-content * { visibility: visible; }
                    #factura-content { position: absolute; left: 0; top: 0; width: 100%; }
                    button { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default FacturaImpresion;
