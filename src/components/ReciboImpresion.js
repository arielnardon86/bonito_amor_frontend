// BONITO_AMOR/frontend/src/components/ReciboImpresion.js
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ReciboImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { venta, items, descuento } = location.state || {}; // <-- Modificación aquí
    const reciboRef = useRef(null);

    useEffect(() => {
        const datosDelRecibo = venta?.detalles || items; // <-- Modificación aquí
        if (reciboRef.current && venta && datosDelRecibo) {
            reciboRef.current.innerHTML = '';
            
            // Corrige la lógica para manejar el objeto venta.detalles
            const totalSinDescuento = datosDelRecibo.reduce((acc, item) => acc + (item.quantity * parseFloat(item.product.precio)), 0);

            reciboRef.current.innerHTML = `
                <div class="receipt">
                    <div class="header">
                        <h2>Comprobante de compra</h2>
                        <p>Tienda: ${venta.tienda_nombre || 'N/A'}</p>
                        <p>Fecha: ${new Date(venta.fecha_venta).toLocaleString() || 'N/A'}</p>
                        <hr>
                    </div>
                    <div class="items">
                        <h3>Productos:</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Cant.</th>
                                    <th>Descripción</th>
                                    <th>Precio</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${datosDelRecibo.map(item => `
                                    <tr>
                                        <td>${item.quantity}</td>
                                        <td>${item.product.nombre || 'N/A'}</td>
                                        <td>$${parseFloat(item.product.precio).toFixed(2)}</td>
                                        <td>$${(item.quantity * parseFloat(item.product.precio)).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <hr>
                    </div>
                    <div class="totals">
                        <p><strong>Subtotal:</strong> $${totalSinDescuento.toFixed(2)}</p>
                        ${descuento > 0 ? `<p><strong>Descuento:</strong> ${parseFloat(descuento).toFixed(2)}%</p>` : ''}
                        <p><strong>Total:</strong> $${parseFloat(venta.total).toFixed(2)}</p>
                        <p><strong>Método de pago:</strong> ${venta.metodo_pago}</p>
                        <hr>
                    </div>
                    <div class="footer">
                        <p>¡Gracias por su compra!</p>
                    </div>
                </div>
            `;
        }
    }, [venta, items, descuento]); // <-- Dependencias actualizadas aquí

    const handlePrint = () => {
        window.print();
    };

    const handleGoBack = () => {
        navigate('/punto-venta');
    };

    if (!venta) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>No hay datos de venta para mostrar en el recibo.</h1>
                <button onClick={handleGoBack} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f0f0f0', marginTop: '20px' }}>Volver a Punto de Venta</button>
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
                    .no-print-controls {
                        margin-bottom: 20px;
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
                    }
                    .receipt hr {
                        border-top: 1px dashed #000;
                        margin: 5px 0;
                    }
                    .receipt p {
                        margin: 2px 0;
                    }
                    .receipt table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .receipt th, .receipt td {
                        padding: 1px;
                        text-align: left;
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