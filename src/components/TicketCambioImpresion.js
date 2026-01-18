// BONITO_AMOR/frontend/src/components/TicketCambioImpresion.js
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';

const TicketCambioImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { venta } = location.state || {}; 
    const ticketRef = useRef(null);

    useEffect(() => {
        if (ticketRef.current && venta) {
            ticketRef.current.innerHTML = '';

            // Función de formateo de fecha más segura
            const formatFecha = (fecha) => {
                const dateObj = new Date(fecha);
                return !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : fecha;
            };

            // Crear contenedor del ticket
            const ticketDiv = document.createElement('div');
            ticketDiv.className = 'ticket';

            // Header
            const headerDiv = document.createElement('div');
            headerDiv.className = 'header';
            headerDiv.innerHTML = `
                <h2 style="font-size: 4mm; font-weight: bold; color: #000; -webkit-font-smoothing: none; text-align: center; margin: 0;">
                    ${venta.tienda_nombre || venta.tienda_slug || 'N/A'}
                </h2>
                <p style="font-size: 3.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none; text-align: center; margin: 5px 0;">
                    TICKET PARA CAMBIO
                </p>
                <hr style="border-top: 1px dashed #000; margin: 5px 0;">
            `;

            // Fecha de compra
            const fechaDiv = document.createElement('div');
            fechaDiv.className = 'fecha';
            fechaDiv.innerHTML = `
                <p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none; margin: 2px 0;">
                    <strong>Fecha de compra:</strong> ${formatFecha(venta.fecha_venta)}
                </p>
                <hr style="border-top: 1px dashed #000; margin: 5px 0;">
            `;

            // Contenedor para código de barras
            const barcodeWrapper = document.createElement('div');
            barcodeWrapper.className = 'barcode-wrapper';

            // Generar código de barras usando JsBarcode
            // Usamos exactamente la misma función que Productos.js para generar EAN13
            try {
                // Función para generar EAN13 (exactamente igual que en Productos.js)
                const generarCodigoDeBarrasEAN13 = () => {
                    // Generar un código numérico determinístico del UUID de la venta
                    const ventaIdSinGuiones = String(venta.id).replace(/-/g, '');
                    
                    // Crear un hash numérico del UUID
                    let hash = 0;
                    for (let i = 0; i < ventaIdSinGuiones.length; i++) {
                        hash = (hash * 31 + ventaIdSinGuiones.charCodeAt(i)) % 1000000000;
                    }
                    
                    // Generar código base: 779 (Argentina) + 9 dígitos del hash
                    const hash9Digitos = String(Math.abs(hash)).padStart(9, '0').substring(0, 9);
                    let code = '779' + hash9Digitos;
                    
                    // Calcular dígito de control para EAN13 (igual que en Productos.js)
                    let sum = 0;
                    for (let i = 0; i < 12; i++) {
                        sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
                    }
                    const checksum = (10 - (sum % 10)) % 10;
                    return code + checksum.toString();
                };
                
                const codigoEAN13 = generarCodigoDeBarrasEAN13();
                
                // Verificar que el código tenga exactamente 13 dígitos
                if (codigoEAN13.length !== 13 || !/^\d+$/.test(codigoEAN13)) {
                    throw new Error(`Código EAN13 inválido: ${codigoEAN13} (longitud: ${codigoEAN13.length})`);
                }
                
                // Almacenar el código EAN13 en el wrapper para búsqueda
                barcodeWrapper.setAttribute('data-ean13', codigoEAN13);
                barcodeWrapper.setAttribute('data-venta-id', venta.id);
                
                // Crear elemento SVG para el código de barras
                const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                
                // Generar código de barras EAN13 (exactamente igual que EtiquetasImpresion)
                JsBarcode(svgElement, codigoEAN13, {
                    format: 'EAN13',
                    displayValue: false,
                    fontSize: 8,
                    width: 3,
                    height: 60,
                    margin: 0,
                });

                barcodeWrapper.appendChild(svgElement);
                
                // Mostrar el código debajo para referencia (para debugging)
                const codigoTexto = document.createElement('p');
                codigoTexto.style.cssText = 'font-size: 8px; text-align: center; margin: 2px 0; color: #000; font-weight: bold;';
                codigoTexto.textContent = `Código: ${codigoEAN13}`;
                barcodeWrapper.appendChild(codigoTexto);
            } catch (e) {
                console.error('Error generando código de barras:', e);
                barcodeWrapper.innerHTML = `<p style="color: red;">Error en el código de barras: ${e.message}</p>`;
            }

            // Footer
            const footerDiv = document.createElement('div');
            footerDiv.className = 'footer';
            footerDiv.innerHTML = `
                <hr style="border-top: 1px dashed #000; margin: 5px 0;">
                <p style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none; text-align: center; margin: 5px 0;">
                    Presentar este ticket para realizar cambios
                </p>
            `;

            // Agregar todos los elementos al ticket
            ticketDiv.appendChild(headerDiv);
            ticketDiv.appendChild(fechaDiv);
            ticketDiv.appendChild(barcodeWrapper);
            ticketDiv.appendChild(footerDiv);

            ticketRef.current.appendChild(ticketDiv);
        } else {
            if (ticketRef.current) {
                ticketRef.current.innerHTML = `
                    <div style="text-align: center;">
                        <h1 style="color: #dc3545;">Error al generar el ticket de cambio.</h1>
                        <p>No se encontraron datos de venta válidos.</p>
                    </div>
                `;
            }
        }
    }, [venta, navigate]);

    const handlePrint = () => {
        window.print();
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    if (!venta) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>No hay datos de venta para mostrar en el ticket de cambio.</h1>
                <button onClick={handleGoBack} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f0f0f0', marginTop: '20px' }}>Volver</button>
            </div>
        );
    }

    return (
        <div className="ticket-page-container">
            <div className="no-print-controls">
                <button onClick={handleGoBack}>Volver</button>
                <button onClick={handlePrint}>Imprimir Ticket</button>
            </div>
            
            <div className="ticket-printable-area" ref={ticketRef}>
                {/* El ticket se renderizará aquí */}
            </div>

            <style>
                {`
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }
                    @page {
                        size: 72mm auto;
                        margin: 0;
                    }
                    .ticket-page-container {
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
                        background-color: #28a745;
                        color: white;
                        border: none;
                    }
                    .ticket-printable-area {
                        width: 72mm;
                        padding: 5mm;
                        background: #fff;
                        border: 1px solid #000;
                    }
                    .ticket {
                        font-size: 10px;
                        line-height: 1.2;
                    }
                    .ticket h2, .ticket h3 {
                        text-align: center;
                        margin: 0;
                        font-size: 14px;
                        font-weight: bold;
                        color: #000;
                        -webkit-font-smoothing: none;
                    }
                    .ticket hr {
                        border-top: 1px dashed #000;
                        margin: 5px 0;
                    }
                    .ticket p {
                        margin: 2px 0;
                        font-weight: bold;
                        color: #000;
                        -webkit-font-smoothing: none;
                    }
                    .barcode-wrapper {
                        margin-top: 2px;
                        margin-bottom: 2px;
                        padding: 0 1mm; /* Padding horizontal para la zona quieta (igual que en EtiquetasImpresion) */
                        text-align: center;
                    }
                    .barcode-wrapper svg {
                        max-width: 100%;
                        height: auto;
                        display: block; /* Para eliminar cualquier espacio extra debajo del SVG */
                        margin: 0 auto;
                    }
                    .ticket .footer {
                        text-align: center;
                        margin-top: 10px;
                    }
                    @media print {
                        .no-print-controls {
                            display: none !important;
                        }
                        body, html {
                            margin: 0;
                            padding: 0;
                        }
                        @page { 
                            margin: 0;
                            @top-left { content: none; }
                            @top-center { content: none; }
                            @top-right { content: none; }
                            @bottom-left { content: none; }
                            @bottom-center { content: none; }
                            @bottom-right { content: none; }
                        }
                        body * {
                            visibility: hidden;
                        }
                        .ticket-printable-area, .ticket-printable-area * {
                            visibility: visible;
                        }
                        .ticket-printable-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 72mm;
                            margin: 0;
                            padding: 5mm;
                            box-shadow: none;
                        }
                    }
                `}
            </style>
        </div>
    );
};

export default TicketCambioImpresion;

