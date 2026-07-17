// ReciboCobroCuentaCorriente.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatearMonto } from '../utils/formatearMonto';

const ReciboCobroCuentaCorriente = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { movimiento, cliente, tienda_nombre, metodo_pago, saldo_pendiente } = location.state || {};

    const handlePrint = () => window.print();
    const handleGoBack = () => navigate(-1);

    if (!movimiento || !cliente) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>No hay datos del cobro para mostrar en el recibo.</h1>
                <button onClick={handleGoBack} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f0f0f0', marginTop: '20px' }}>Volver</button>
            </div>
        );
    }

    const formatFecha = (fecha) => {
        const dateObj = new Date(fecha);
        return !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : fecha;
    };

    return (
        <div className="receipt-page-container">
            <div className="no-print-controls">
                <button onClick={handleGoBack}>Volver</button>
                <button onClick={handlePrint}>Imprimir Recibo</button>
            </div>
            <div className="receipt-printable-area">
                <div className="receipt">
                    <div className="header">
                        <h2>Recibo de Cobro — Cuenta Corriente</h2>
                        <p><strong>Tienda:</strong> {tienda_nombre || 'N/A'}</p>
                        <p><strong>Fecha:</strong> {formatFecha(movimiento.fecha)}</p>
                        <hr />
                    </div>
                    <div className="items">
                        <p><strong>Cliente:</strong> {cliente.nombre_razon_social}</p>
                        <p><strong>CUIT/CUIL:</strong> {cliente.cuit_cuil}</p>
                        <hr />
                    </div>
                    <div className="totals">
                        <p><strong>Concepto:</strong> {movimiento.concepto}</p>
                        <p style={{ fontSize: '4mm' }}><strong>Monto cobrado:</strong> {formatearMonto(movimiento.monto)}</p>
                        {metodo_pago && <p><strong>Método de pago:</strong> {metodo_pago}</p>}
                        {saldo_pendiente !== undefined && saldo_pendiente !== null && (
                            <p><strong>Saldo pendiente actual:</strong> {formatearMonto(saldo_pendiente)}</p>
                        )}
                        <hr />
                    </div>
                    <div className="footer">
                        <p>¡Gracias por su pago!</p>
                    </div>
                </div>
            </div>

            <style>
                {`
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
                    .receipt h2 {
                        text-align: center;
                        margin: 0;
                        font-size: 13px;
                        font-weight: bold;
                        color: #000;
                    }
                    .receipt hr {
                        border-top: 1px dashed #000;
                        margin: 5px 0;
                    }
                    .receipt p {
                        margin: 2px 0;
                        font-weight: bold;
                        color: #000;
                    }
                    .receipt .totals {
                        margin-top: 5px;
                    }
                    .receipt .footer {
                        text-align: center;
                        margin-top: 10px;
                    }
                    @page {
                        size: 72mm auto;
                        margin: 0;
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

export default ReciboCobroCuentaCorriente;
