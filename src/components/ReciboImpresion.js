// BONITO_AMOR/frontend/src/components/ReciboImpresion.js
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';

const ReciboImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { venta, items, descuento } = location.state || {};
    const labelsRef = React.useRef(null);

    useEffect(() => {
        if (labelsRef.current && venta && items) {
            labelsRef.current.innerHTML = '';
            
            const totalSinDescuento = items.reduce((acc, item) => acc + (item.quantity * parseFloat(item.product.precio)), 0);
            const totalConDescuento = venta.total;

            const printContent = `
                <div class="receipt">
                    <div class="header">
                        <h2>BONITO AMOR</h2>
                        <p>Tienda: ${venta.tienda_nombre}</p>
                        <p>Fecha: ${new Date(venta.fecha_venta).toLocaleString()}</p>
                        <p>Atendido por: ${venta.usuario.username}</p>
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
                                ${items.map(item => `
                                    <tr>
                                        <td>${item.quantity}</td>
                                        <td>${item.product.nombre} - ${item.product.talle}</td>
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
                        <p><strong>Descuento:</strong> ${parseFloat(descuento).toFixed(2)}%</p>
                        <p><strong>Total:</strong> $${parseFloat(totalConDescuento).toFixed(2)}</p>
                        <p><strong>Método de pago:</strong> ${venta.metodo_pago}</p>
                        <hr>
                    </div>
                    <div class="footer">
                        <p>¡Gracias por su compra!</p>
                    </div>
                </div>
            `;
            labelsRef.current.innerHTML = printContent;
        }
    }, [venta, items, descuento]);

    const handlePrint = () => {
        window.print();
    };

    const handleGoBack = () => {
        navigate('/punto-venta');
    };

    if (!venta || !items) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>No hay datos de venta para mostrar en el recibo.</h1>
                <button onClick={handleGoBack} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f0f0f0', marginTop: '20px' }}>Volver a Punto de Venta</button>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                <button onClick={handleGoBack} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f0f0f0' }}>Volver</button>
                <button onClick={handlePrint} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '5px', backgroundColor: '#28a745', color: 'white' }}>Imprimir Recibo</button>
            </div>

            <div className="receipt-container" ref={labelsRef}>
                {/* El recibo se renderizará aquí */}
            </div>

            <style>
                {`
                    @page {
                        size: 72mm auto;
                        margin: 0;
                    }
                    body {
                        font-family: 'Arial', sans-serif;
                        color: #000;
                    }
                    .receipt-container {
                        width: 72mm;
                        margin: 0 auto;
                        padding: 5mm;
                        background: #fff;
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
                        .receipt-container, .receipt-container * {
                            visibility: visible;
                        }
                        .receipt-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 72mm;
                            margin: 0;
                            padding: 0;
                            box-shadow: none;
                        }
                    }
                `}
            </style>
        </div>
    );
};

export default ReciboImpresion;