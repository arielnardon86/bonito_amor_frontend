// BONITO_AMOR/frontend/src/components/ReciboImpresion.js
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ReciboImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { venta } = location.state || {}; 
    const reciboRef = useRef(null);

    useEffect(() => {
        const detalles = venta?.detalles;

        if (reciboRef.current && venta && detalles && detalles.length > 0) {
            reciboRef.current.innerHTML = '';

            // Función de formateo de fecha más segura
            const formatFecha = (fecha) => {
                const dateObj = new Date(fecha);
                return !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : fecha;
            };
            
            const subtotal = detalles.reduce((acc, item) => {
                const cantidad = item.cantidad || item.quantity;
                const precio = item.precio_unitario || item.product?.precio;
                return acc + (cantidad * parseFloat(precio || 0));
            }, 0);

            reciboRef.current.innerHTML = `
                <div class="receipt">
                    <div class="header">
                        <h2 style="font-size: 4mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">Comprobante de compra</h2>
                        <p style="font-weight: bold; color: #000; -webkit-font-smoothing: none;">Tienda: ${venta.tienda_nombre || venta.tienda_slug || 'N/A'}</p>
                        <p style="font-weight: bold; color: #000; -webkit-font-smoothing: none;">Fecha: ${formatFecha(venta.fecha_venta) || 'N/A'}</p>
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
                                    const nombre = item.producto_nombre || item.product?.nombre || 'N/A';
                                    const cantidad = item.cantidad || item.quantity;
                                    const precio = item.precio_unitario || item.product?.precio;
                                    const subtotal = cantidad * parseFloat(precio || 0);
                                    return `
                                    <tr>
                                        <td style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">${cantidad}</td>
                                        <td style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">${nombre}</td>
                                        <td style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">$${parseFloat(precio).toFixed(2)}</td>
                                        <td style="font-size: 2.5mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;">$${subtotal.toFixed(2)}</td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        <hr>
                    </div>
                    <div class="totals">
                        <p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
                        ${(venta.descuento_porcentaje || 0) > 0 ? `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Descuento por porcentaje:</strong> -${parseFloat(venta.descuento_porcentaje).toFixed(2)}%</p>` : ''}
                        ${(venta.descuento_monto || 0) > 0 ? `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Descuento por monto:</strong> -$${parseFloat(venta.descuento_monto).toFixed(2)}</p>` : ''}
                        
                        ${(venta.recargo_porcentaje || 0) > 0 ? `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Recargo por porcentaje:</strong> +${parseFloat(venta.recargo_porcentaje).toFixed(2)}%</p>` : ''}
                        ${(venta.recargo_monto || 0) > 0 ? `<p style="font-size: 3mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Recargo por monto:</strong> +$${parseFloat(venta.recargo_monto).toFixed(2)}</p>` : ''}
                        
                        <p style="font-size: 4mm; font-weight: bold; color: #000; -webkit-font-smoothing: none;"><strong>Total:</strong> $${parseFloat(venta.total).toFixed(2)}</p>
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
                     <h1 style="color: #dc3545;">Error al generar el recibo.</h1>
                     <p>No se encontraron datos de venta válidos.</p>
                 </div>
            `;
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
                        background-color: #28a745;
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
                        .receipt-printable-area, .receipt-printable-area * {
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