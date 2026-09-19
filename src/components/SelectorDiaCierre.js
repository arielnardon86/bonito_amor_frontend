// SelectorDiaCierre.js
// Selector de "día del mes" (1-31) con formato de calendario, sin mes: se usa para
// configurar el día de cierre de cuenta corriente de un cliente (Clientes.js y
// ClienteDetalle.js). value/onChange reciben y devuelven '' (sin configurar) o un
// número de 1 a 31.
import React from 'react';

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

const SelectorDiaCierre = ({ value, onChange }) => {
    const seleccionado = value ? Number(value) : null;

    return (
        <div>
            <div style={styles.grid}>
                {DIAS.map((dia) => {
                    const activo = seleccionado === dia;
                    return (
                        <button
                            key={dia}
                            type="button"
                            onClick={() => onChange(activo ? '' : String(dia))}
                            style={{ ...styles.celda, ...(activo ? styles.celdaActiva : {}) }}
                        >
                            {dia}
                        </button>
                    );
                })}
            </div>
            <p style={styles.nota}>
                {seleccionado
                    ? `Cierra el día ${seleccionado} de cada mes. Si algún mes no llega a tener ese día `
                      + `(ej. día 31 en un mes de 30), se toma el último día de ese mes.`
                    : 'Sin configurar: se pedirá la fecha de pago a mano en cada venta a Cuenta Corriente.'}
            </p>
        </div>
    );
};

const styles = {
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        maxWidth: 280,
    },
    celda: {
        padding: '6px 0',
        textAlign: 'center',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        background: '#fff',
        cursor: 'pointer',
        fontSize: 13,
        color: '#334155',
        lineHeight: 1.2,
    },
    celdaActiva: {
        background: '#1a6a40',
        borderColor: '#1a6a40',
        color: '#fff',
        fontWeight: 700,
    },
    nota: {
        fontSize: 11.5,
        color: '#64748b',
        marginTop: 8,
        maxWidth: 280,
        lineHeight: 1.4,
    },
};

export default SelectorDiaCierre;
