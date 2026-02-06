// BONITO_AMOR/frontend/src/components/FacturaImpresion.js
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { formatearMonto } from '../utils/formatearMonto';

const FacturaImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { factura, venta, skipReciboPrompt } = location.state || {}; 
    const facturaRef = useRef(null);

    useEffect(() => {
        if (facturaRef.current && factura) {
            facturaRef.current.innerHTML = '';

            // Función de formateo de fecha más segura
            const formatFecha = (fecha) => {
                if (!fecha) return 'N/A';
                const dateObj = new Date(fecha);
                return !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : fecha;
            };

            // Función para generar código numérico de 13 dígitos desde el UUID de la venta (mismo que lee el código de barras)
            const generarCodigoNumerico13Digitos = (ventaId) => {
                // Generar un código numérico determinístico del UUID de la venta
                const ventaIdSinGuiones = String(ventaId).replace(/-/g, '');
                
                // Crear un hash numérico del UUID
                let hash = 0;
                for (let i = 0; i < ventaIdSinGuiones.length; i++) {
                    hash = (hash * 31 + ventaIdSinGuiones.charCodeAt(i)) % 1000000000;
                }
                
                // Generar código base: 779 (Argentina) + 9 dígitos del hash
                const hash9Digitos = String(Math.abs(hash)).padStart(9, '0').substring(0, 9);
                let code = '779' + hash9Digitos;
                
                // Calcular dígito de control para EAN13
                let sum = 0;
                for (let i = 0; i < 12; i++) {
                    sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
                }
                const checksum = (10 - (sum % 10)) % 10;
                return code + checksum.toString();
            };

            // Generar código numérico de 13 dígitos (mismo que lee el código de barras)
            const codigoNumerico = venta?.id ? generarCodigoNumerico13Digitos(venta.id) : 'N/A';

            // Formatear número de factura
            const formatearNumeroFactura = (puntoVenta, numero) => {
                const pv = String(puntoVenta || 0).padStart(4, '0');
                const num = String(numero || 0).padStart(8, '0');
                return `${pv}-${num}`;
            };

            const tipoFacturaText = {
                'A': 'Factura A',
                'B': 'Factura B',
                'C': 'Factura C'
            }[factura.tipo_comprobante] || factura.tipo_comprobante;

            const condicionIvaText = {
                'RI': 'Responsable Inscripto',
                'CF': 'Consumidor Final',
                'EX': 'Exento',
                'MT': 'Monotributo',
                'NR': 'No Responsable'
            }[factura.cliente_condicion_iva] || factura.cliente_condicion_iva;

            // Obtener detalles de la venta si están disponibles
            const detalles = venta?.detalles || [];
            
            // IMPORTANTE: Los precios ya tienen IVA incluido (21%)
            // Calcular subtotal sin IVA y IVA
            let subtotalSinIva = 0;
            let totalIva = 0;
            
            detalles.forEach(item => {
                if (!item.anulado_individualmente) {
                    const precioConIva = parseFloat(item.precio_unitario || 0);
                    const cantidad = item.cantidad || 0;
                    const subtotalItemConIva = precioConIva * cantidad;
                    // Calcular precio sin IVA: precio_con_iva / 1.21
                    const precioSinIva = precioConIva / 1.21;
                    const subtotalItemSinIva = precioSinIva * cantidad;
                    const ivaItem = subtotalItemSinIva * 0.21;
                    
                    subtotalSinIva += subtotalItemSinIva;
                    totalIva += ivaItem;
                }
            });
            
            // IMPORTANTE: El descuento/recargo se aplica sobre el TOTAL CON IVA, no sobre el subtotal sin IVA
            // Calcular el subtotal inicial con IVA (suma de todos los items con IVA incluido)
            let subtotalInicialConIva = 0;
            detalles.forEach(item => {
                if (!item.anulado_individualmente) {
                    const precioConIva = parseFloat(item.precio_unitario || 0);
                    const cantidad = item.cantidad || 0;
                    subtotalInicialConIva += precioConIva * cantidad;
                }
            });
            
            // Calcular descuento/recargo aplicado sobre el total con IVA
            let descuentoMonto = 0;
            let recargoMonto = 0;
            
            // Descuentos (aplicados sobre el total con IVA)
            if (venta?.descuento_porcentaje && venta.descuento_porcentaje > 0) {
                descuentoMonto = subtotalInicialConIva * (venta.descuento_porcentaje / 100);
            } else if (venta?.descuento_monto && venta.descuento_monto > 0) {
                descuentoMonto = parseFloat(venta.descuento_monto);
            }
            
            // Recargos (aplicados sobre el total con IVA después del descuento)
            if (venta?.recargo_porcentaje && venta.recargo_porcentaje > 0) {
                const baseRecargo = subtotalInicialConIva - descuentoMonto;
                recargoMonto = baseRecargo * (venta.recargo_porcentaje / 100);
            } else if (venta?.recargo_monto && venta.recargo_monto > 0) {
                recargoMonto = parseFloat(venta.recargo_monto);
            }
            
            // El total final ya tiene descuentos/recargos aplicados (viene de venta.total)
            const totalFinal = parseFloat(venta?.total || factura.total);
            // Calcular subtotal sin IVA y IVA a partir del total final
            const subtotalFinalSinIva = totalFinal / 1.21;
            const ivaFinal = totalFinal - subtotalFinalSinIva;

            facturaRef.current.innerHTML = `
                <div class="invoice" style="font-family: Arial, sans-serif; max-width: 80mm; margin: 0 auto; padding: 5mm;">
                    <div class="header" style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5mm; margin-bottom: 5mm;">
                        <h1 style="font-size: 5mm; font-weight: bold; color: #000; margin: 0; -webkit-font-smoothing: none;">${factura.tienda_nombre || factura.tienda?.nombre || 'N/A'}</h1>
                        <p style="font-size: 4mm; font-weight: bold; color: #000; margin: 2mm 0; -webkit-font-smoothing: none;">${tipoFacturaText}</p>
                        ${factura.tienda?.cuit ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;">CUIT: ${factura.tienda.cuit}</p>` : ''}
                        ${factura.tienda?.direccion ? `<p style="font-size: 2.5mm; color: #000; margin: 1mm 0; -webkit-font-smoothing: none;">${factura.tienda.direccion}</p>` : ''}
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
                                    </tr>
                                    `;
                                }).join('') : '<tr><td colspan="4" style="text-align: center; padding: 2mm; color: #000;">No hay detalles disponibles</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="totals" style="border-top: 2px solid #000; padding-top: 3mm;">
                        <p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Subtotal:</strong> ${formatearMonto(subtotalInicialConIva)}</p>
                        ${descuentoMonto > 0 ? `<p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Descuento${(venta?.descuento_porcentaje && venta.descuento_porcentaje > 0) ? ` (${venta.descuento_porcentaje}%)` : ''}:</strong> -${formatearMonto(descuentoMonto)}</p>` : ''}
                        ${recargoMonto > 0 ? `<p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Recargo${(venta?.recargo_porcentaje && venta.recargo_porcentaje > 0) ? ` (${venta.recargo_porcentaje}%)` : ''}:</strong> +${formatearMonto(recargoMonto)}</p>` : ''}
                        <p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>Subtotal (sin IVA):</strong> ${formatearMonto(subtotalFinalSinIva)}</p>
                        ${ivaFinal > 0 ? `<p style="font-size: 3mm; color: #000; margin: 1mm 0; text-align: right; -webkit-font-smoothing: none;"><strong>IVA 21%:</strong> ${formatearMonto(ivaFinal)}</p>` : ''}
                        <p style="font-size: 4mm; font-weight: bold; color: #000; margin: 2mm 0; text-align: right; -webkit-font-smoothing: none; border-top: 1px solid #000; padding-top: 2mm;"><strong>TOTAL: ${formatearMonto(totalFinal)}</strong></p>
                    </div>
                    
                    <div class="footer" style="text-align: center; margin-top: 5mm; padding-top: 3mm; border-top: 1px solid #000;">
                        <p style="font-size: 2.5mm; color: #000; -webkit-font-smoothing: none;"><i>¡Gracias por su compra!</i></p>
                    </div>
                </div>
            `;
        } else {
            if (facturaRef.current) {
                facturaRef.current.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <h1 style="color: #dc3545;">Error al generar la factura.</h1>
                        <p>No se encontraron datos de factura válidos.</p>
                    </div>
                `;
            }
        }
    }, [factura, venta]);

    const [hasPrinted, setHasPrinted] = useState(false);

    const handlePrint = () => {
        window.print();
        setHasPrinted(true);
        
        // Solo preguntar por recibo si NO viene del flujo de facturación (skipReciboPrompt)
        if (!skipReciboPrompt) {
            // Después de imprimir, preguntar si quiere imprimir el recibo
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
                        // Si no quiere imprimir recibo, volver al punto de venta
                        navigate('/punto-venta');
                    }
                });
            }, 1000);
        } else {
            // Si viene del flujo de facturación, solo volver al punto de venta
            setTimeout(() => {
                navigate('/punto-venta');
            }, 500);
        }
    };

    const handleGoBack = () => {
        // Siempre volver al punto de venta sin preguntar nada
        navigate('/punto-venta');
    };

    const handleTicketCambio = () => {
        if (!venta || !venta.id) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se encontró información de la venta'
            });
            return;
        }
        navigate('/ticket-cambio', { state: { venta } });
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                    onClick={handlePrint}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Imprimir Factura
                </button>
                <button 
                    onClick={handleTicketCambio}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Ticket de cambio
                </button>
                <button 
                    onClick={handleGoBack}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Volver
                </button>
            </div>
            
            <div ref={facturaRef} id="factura-content"></div>

            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #factura-content, #factura-content * {
                        visibility: visible;
                    }
                    #factura-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    button {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default FacturaImpresion;

