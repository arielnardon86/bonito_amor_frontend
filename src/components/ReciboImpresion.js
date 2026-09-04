// BONITO_AMOR/frontend/src/components/ReciboImpresion.js
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../AuthContext';
import { formatearMonto } from '../utils/formatearMonto';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const normalizeApiUrl = (url) => {
    let u = url;
    if (u.endsWith('/api/') || u.endsWith('/api')) u = u.replace(/\/api\/?$/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
};
const BASE_API_ENDPOINT = normalizeApiUrl(API_BASE_URL);

const ReciboImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { venta, fromCambioDevolucion } = location.state || {};
    const reciboRef = useRef(null);
    const [enviandoEmail, setEnviandoEmail] = useState(false);
    const [compartiendo, setCompartiendo] = useState(false);

    useEffect(() => {
        const detalles = venta?.detalles;

        if (reciboRef.current && venta && detalles && detalles.length > 0) {
            reciboRef.current.innerHTML = '';

            // Función de formateo de fecha más segura
            const formatFecha = (fecha) => {
                const dateObj = new Date(fecha);
                return !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : fecha;
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
            
            const subtotal = detalles.reduce((acc, item) => {
                const cantidad = item.cantidad || item.quantity;
                const precio = item.precio_unitario || item.product?.precio;
                return acc + (cantidad * parseFloat(precio || 0));
            }, 0);

            const esNotaCredito = venta?.metodo_pago === 'Nota de Crédito' || venta?.metodo_pago_nombre === 'Nota de Crédito';
            const esDiferenciaPendiente = venta?.es_diferencia_pendiente || venta?.cambio_devolucion_diferencia;
            const tituloRecibo = esNotaCredito ? 'Nota de Crédito' : 'Comprobante de compra';
            
            // Calcular saldo a favor para mostrar en el recibo
            let saldoAFavorMonto = 0;
            if (venta.cambio_devolucion_info && parseFloat(venta.cambio_devolucion_info.saldo_a_favor || 0) > 0) {
                saldoAFavorMonto = parseFloat(venta.cambio_devolucion_info.saldo_a_favor);
            } else if (venta.cambio_devolucion_diferencia && parseFloat(venta.cambio_devolucion_diferencia.monto_devolucion || 0) > 0) {
                // Para diferencia pendiente, usar monto_devolucion como saldo a favor
                saldoAFavorMonto = parseFloat(venta.cambio_devolucion_diferencia.monto_devolucion);
            } else if (venta.cambio_devolucion_diferencia && venta.cambio_devolucion_diferencia.saldo_a_favor && parseFloat(venta.cambio_devolucion_diferencia.saldo_a_favor) > 0) {
                saldoAFavorMonto = parseFloat(venta.cambio_devolucion_diferencia.saldo_a_favor);
            }
            
            // Fecha límite de pago (solo Cuenta Corriente, cuando se cargó al procesar la venta)
            let fechaLimitePagoHtml = '';
            if (venta.metodo_pago === 'Cuenta Corriente' && venta.fecha_limite_pago) {
                const fechaLimite = new Date(venta.fecha_limite_pago + 'T00:00:00');
                const fechaLimiteTexto = !isNaN(fechaLimite.getTime()) ? fechaLimite.toLocaleDateString() : venta.fecha_limite_pago;
                fechaLimitePagoHtml = `<p style="font-weight: bold; color: #000; -webkit-font-smoothing: none;">Fecha límite de pago: ${fechaLimiteTexto}</p>`;
            }

            // Información adicional si viene de un cambio/devolución
            let infoCambioDevolucion = '';
            if (esDiferenciaPendiente && venta?.cambio_devolucion_diferencia) {
                const montoDevuelto = parseFloat(venta.cambio_devolucion_diferencia.monto_devolucion || 0);
                if (montoDevuelto > 0) {
                    infoCambioDevolucion = `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none; margin-top: 5px; padding: 5px; background-color: #e8f4f8; border-radius: 3px;"><strong>Nota:</strong> Esta venta corresponde a la diferencia de un cambio/devolución. Monto devuelto por cambio: ${formatearMonto(montoDevuelto)}</p>`;
                }
            }
            
            reciboRef.current.innerHTML = `
                <div class="receipt">
                    <div class="header">
                        ${venta.tienda_logo ? `<img src="${venta.tienda_logo}" alt="Logo" style="max-width: 25mm; max-height: 15mm; display: block; margin: 0 auto 2mm; object-fit: contain;" />` : ''}
                        <h2 style="font-size: 4mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">${tituloRecibo}</h2>
                        <p style="font-size: 2.8mm; font-weight: normal; text-align: center; color: #000; -webkit-font-smoothing: none;">Documento no válido como comprobante fiscal</p>
                        <p style="font-weight: bold; color: #000; -webkit-font-smoothing: none;">Tienda: ${venta.tienda_nombre || venta.tienda_slug || 'N/A'}</p>
                        ${venta.tienda_direccion ? `<p style="font-weight: bold; color: #000; -webkit-font-smoothing: none;">Dirección: ${venta.tienda_direccion}</p>` : ''}
                        <p style="font-weight: bold; color: #000; -webkit-font-smoothing: none;">Fecha: ${formatFecha(venta.fecha_venta) || 'N/A'}</p>
                        <p style="font-weight: bold; color: #000; -webkit-font-smoothing: none;">ID de Venta: ${codigoNumerico}</p>
                        ${fechaLimitePagoHtml}
                        ${infoCambioDevolucion}
                        <hr>
                    </div>
                    <div class="items">
                        <h3 style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Productos:</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Cant.</th>
                                    <th style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Descripción</th>
                                    <th style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Precio</th>
                                    <th style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detalles.map(item => {
                                    let nombre = item.producto_nombre || item.product?.nombre || 'N/A';
                                    // Si el método de pago es "Nota de Crédito" y no hay producto, mostrar "Nota de Crédito"
                                    if ((venta.metodo_pago === 'Nota de Crédito' || venta.metodo_pago_nombre === 'Nota de Crédito') && (!item.producto_nombre && !item.product?.nombre)) {
                                        nombre = 'Nota de Crédito';
                                    }
                                    const cantidad = item.cantidad || item.quantity;
                                    const precio = item.precio_unitario || item.product?.precio;
                                    const subtotal = cantidad * parseFloat(precio || 0);
                                    return `
                                    <tr>
                                        <td style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">${cantidad}</td>
                                        <td style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">${nombre}</td>
                                        <td style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">${formatearMonto(precio || 0)}</td>
                                        <td style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">${formatearMonto(subtotal)}</td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        <hr>
                    </div>
                    <div class="totals">
                        <p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Subtotal:</strong> ${formatearMonto(subtotal)}</p>
                        ${(venta.descuento_porcentaje || 0) > 0 ? `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Descuento:</strong> -${parseFloat(venta.descuento_porcentaje).toFixed(2)}%</p>` : ''}
                        ${(venta.descuento_monto || 0) > 0 ? `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Descuento:</strong> -${formatearMonto(venta.descuento_monto)}</p>` : ''}
                        ${saldoAFavorMonto > 0 ? `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Saldo a favor:</strong> -${formatearMonto(saldoAFavorMonto)}</p>` : ''}
                        
                        ${(venta.recargo_porcentaje || 0) > 0 ? `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Recargo:</strong> +${parseFloat(venta.recargo_porcentaje).toFixed(2)}%</p>` : ''}
                        ${(venta.recargo_monto || 0) > 0 ? `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Recargo:</strong> +${formatearMonto(venta.recargo_monto)}</p>` : ''}
                        
                        <p style="font-size: 4mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Total:</strong> ${formatearMonto(venta.total)}</p>
                        <p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Método de pago:</strong> ${venta.metodo_pago}</p>
                        <hr>
                    </div>
                    <div class="footer">
                        <p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">¡Gracias por su compra!</p>
                    </div>
                </div>
            `;
        } else {
            reciboRef.current.innerHTML = `
                 <div style="text-align: center;">
                     <h1 style="color: #e25252;">Error al generar el recibo.</h1>
                     <p>No se encontraron datos de venta válidos.</p>
                 </div>
            `;
        }
    }, [venta]);

    const handlePrint = () => {
        window.print();
    };

    const handleGoBack = () => {
        if (venta?.metodo_pago === 'Nota de Crédito' || venta?.es_diferencia_pendiente || fromCambioDevolucion) {
            navigate('/punto-venta');
        } else {
            navigate(-1);
        }
    };

    const handleTicketCambio = () => {
        if (!venta || !venta.id) {
            alert('Error: No se encontró información de la venta');
            return;
        }
        navigate('/ticket-cambio', { state: { venta } });
    };

    const enviarPorEmail = async () => {
        if (!venta || !venta.id) {
            Swal.fire('Error', 'No se encontró información de la venta.', 'error');
            return;
        }
        const { value: email } = await Swal.fire({
            title: 'Enviar recibo por mail',
            input: 'email',
            inputLabel: 'Email de destino',
            inputValue: venta.cliente_email || '',
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
        });
        if (!email) return;
        setEnviandoEmail(true);
        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/ventas/${venta.id}/enviar-recibo-email/`, { email }, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            Swal.fire('¡Enviado!', `El recibo se envió a ${email}.`, 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            Swal.fire('Error', msg, 'error');
        } finally {
            setEnviandoEmail(false);
        }
    };

    const compartirPorWhatsapp = async () => {
        if (!venta || !venta.id) {
            Swal.fire('Error', 'No se encontró información de la venta.', 'error');
            return;
        }
        setCompartiendo(true);
        try {
            const resp = await axios.get(`${BASE_API_ENDPOINT}/api/ventas/${venta.id}/pdf-recibo/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob',
            });
            const filename = `recibo_${venta.id}.pdf`;
            const mensaje = `Hola! Te comparto el comprobante de tu compra en ${venta.tienda_nombre || venta.tienda_slug || 'la tienda'}.`;

            // Celular/tablet: el selector nativo de apps ya adjunta el PDF real.
            let file = null;
            try { file = new File([resp.data], filename, { type: 'application/pdf' }); } catch { /* File no disponible */ }
            if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
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

            const telefonoLimpio = (venta.cliente_telefono || '').replace(/\D/g, '');
            const destino = telefonoLimpio.length >= 10 ? telefonoLimpio : '';
            const textoWa = `${mensaje} Te descargamos el PDF: adjuntalo en este chat.`;
            window.open(`https://wa.me/${destino}?text=${encodeURIComponent(textoWa)}`, '_blank');
        } catch (err) {
            if (err?.name === 'AbortError') return; // el usuario cerró el selector nativo sin elegir nada
            Swal.fire('Error', 'No se pudo compartir el recibo.', 'error');
        } finally {
            setCompartiendo(false);
        }
    };

    if (!venta) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>No hay datos de venta para mostrar en el recibo.</h1>
                <button onClick={handleGoBack} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f0f0f0', marginTop: '20px' }}>Volver</button>
            </div>
        );
    }

    return (
        <div className="receipt-page-container">
            <div className="no-print-controls">
                <button onClick={handleGoBack}>Volver</button>
                <button onClick={handlePrint}>Imprimir Recibo</button>
                <button onClick={enviarPorEmail} disabled={enviandoEmail} style={{ backgroundColor: '#3b9ede', color: 'white' }}>
                    {enviandoEmail ? 'Enviando...' : 'Enviar por mail'}
                </button>
                <button onClick={compartirPorWhatsapp} disabled={compartiendo} style={{ backgroundColor: '#25D366', color: 'white' }}>
                    {compartiendo ? 'Preparando...' : 'Compartir por WhatsApp'}
                </button>
                {!(venta?.metodo_pago === 'Nota de Crédito' || venta?.metodo_pago_nombre === 'Nota de Crédito') && (
                    <button onClick={handleTicketCambio} style={{ backgroundColor: '#17a2b8', color: 'white' }}>Ticket de cambio</button>
                )}
            </div>
            <div className="receipt-printable-area" ref={reciboRef}>
                {/* El recibo se renderizará aquí */}
            </div>

            <style>
                {`
                    @page {
                        size: 72mm auto;
                        margin: 0;
                    }
                    .receipt-page-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        font-family: Arial, sans-serif;
                    }
                    .no-print-controls button {
                        padding: 10px 20px;
                        cursor: pointer;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        background-color: #f0f0f0;
                        margin: 0 5px;
                    }
                    .no-print-controls button:last-child {
                        background-color: #5dc87a;
                        color: white;
                        border: none;
                    }
                    .receipt-printable-area {
                        width: 72mm;
                        padding: 5mm;
                        background: #fff;
                        border: 1px solid #000;
                    }
                    .receipt {
                        font-size: 10px;
                        line-height: 1.2;
                    }
                    .receipt h2, .receipt h3 {
                        text-align: center;
                        margin: 0;
                        font-size: 14px;
                        font-weight: bold; /* Asegura que los títulos sean gruesos */
                        color: #000; /* Asegura el color negro */
                        -webkit-font-smoothing: none; /* Desactiva el suavizado de fuentes */
                    }
                    .receipt hr {
                        border-top: 1px dashed #000;
                        margin: 5px 0;
                    }
                    .receipt p {
                        margin: 2px 0;
                        font-weight: bold; /* Asegura que el texto normal sea grueso */
                        color: #000; /* Asegura el color negro */
                        -webkit-font-smoothing: none; /* Desactiva el suavizado de fuentes */
                    }
                    .receipt table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .receipt th, .receipt td {
                        padding: 1px;
                        text-align: left;
                        font-weight: bold; /* Asegura que los datos de la tabla sean gruesos */
                        color: #000; /* Asegura el color negro */
                        -webkit-font-smoothing: none; /* Desactiva el suavizado de fuentes */
                    }
                    .receipt th {
                        border-bottom: 1px solid #000;
                    }
                    .receipt .items {
                        margin-top: 5px;
                    }
                    .receipt .totals {
                        text-align: right;
                        margin-top: 5px;
                    }
                    .receipt .footer {
                        text-align: center;
                        margin-top: 10px;
                    }
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .receipt-printable-area,
                        .receipt-printable-area * {
                            visibility: visible;
                        }
                        .receipt-printable-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 72mm;
                            margin: 0;
                            padding: 0;
                            box-shadow: none;
                        }
                        .no-print-controls {
                            display: none !important;
                        }
                    }
                `}
            </style>
        </div>
    );
};

export default ReciboImpresion;