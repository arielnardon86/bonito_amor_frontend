// BarcodeScannerModal.js
import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

// Formatos de código de barras que se usan en retail (1D: EAN/UPC en productos
// envasados, Code128/Code39 en etiquetas propias) -- restringir a estos en vez de
// probar también los 2D (QR, Data Matrix, etc.) hace cada intento de decodificación
// más rápido y más preciso.
const FORMATOS_RETAIL = [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF,
];

// Modal a pantalla completa que usa la cámara para leer códigos de barras.
// Usa @zxing/library (vía @zxing/browser) en vez de la BarcodeDetector nativa
// del navegador porque esa todavía no anda en Safari/iOS -- y buena parte de
// los comercios usan iPhone.
const BarcodeScannerModal = ({ onDetected, onClose }) => {
    const videoRef = useRef(null);
    const controlsRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelado = false;
        // Sin estos hints, el lector prueba TODOS los formatos (incluidos QR/Data
        // Matrix) sin darle prioridad a hacer bien el trabajo -- en la práctica casi
        // no llega a leer códigos EAN/UPC reales de producto (borrosos, con brillo,
        // o el enfoque automático del celular todavía ajustando). TRY_HARDER + acotar
        // a los formatos de retail es la combinación recomendada por la propia
        // librería para este caso.
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATOS_RETAIL);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });

        reader.decodeFromConstraints(
            { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
            videoRef.current,
            (result) => {
                if (cancelado || !result) return;
                if (controlsRef.current) controlsRef.current.stop();
                onDetected(result.getText());
            }
        ).then((controls) => {
            if (cancelado) {
                controls.stop();
                return;
            }
            controlsRef.current = controls;
        }).catch((err) => {
            if (cancelado) return;
            const nombre = err && err.name;
            setError(
                nombre === 'NotAllowedError'
                    ? 'Se necesita permiso de cámara para escanear. Habilitalo en la configuración del navegador e intentá de nuevo.'
                    : nombre === 'NotFoundError'
                        ? 'No se encontró ninguna cámara en este dispositivo.'
                        : nombre === 'NotReadableError'
                            ? 'La cámara está siendo usada por otra aplicación.'
                            : 'No se pudo iniciar la cámara. Probá de nuevo o buscá el producto manualmente.'
            );
        });

        return () => {
            cancelado = true;
            if (controlsRef.current) controlsRef.current.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={styles.overlay}>
            <div style={styles.panel}>
                <div style={styles.header}>
                    <span style={styles.title}>Escanear código de barras</span>
                    <button onClick={onClose} style={styles.closeButton} aria-label="Cerrar">✕</button>
                </div>

                {error ? (
                    <div style={styles.errorBox}>{error}</div>
                ) : (
                    <div style={styles.videoWrap}>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video ref={videoRef} style={styles.video} muted playsInline />
                        <div style={styles.guideBox} />
                    </div>
                )}

                <p style={styles.hint}>Apuntá la cámara al código de barras del producto.</p>
                <button onClick={onClose} style={styles.cancelButton}>Cancelar</button>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(15,30,58,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
    },
    panel: {
        width: '100%', maxWidth: 420,
        background: '#0f1e3a', borderRadius: 16,
        padding: 16, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 12,
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: '#fff', fontWeight: 700, fontSize: 16 },
    closeButton: {
        width: 32, height: 32, borderRadius: '50%', border: 'none',
        background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, cursor: 'pointer',
    },
    videoWrap: {
        position: 'relative', width: '100%', aspectRatio: '3 / 4',
        borderRadius: 12, overflow: 'hidden', background: '#000',
    },
    video: { width: '100%', height: '100%', objectFit: 'cover' },
    guideBox: {
        position: 'absolute', left: '10%', right: '10%', top: '38%', height: '24%',
        border: '2px solid #5dc87a', borderRadius: 10,
        boxShadow: '0 0 0 999px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
    },
    errorBox: {
        background: 'rgba(226,82,82,0.15)', border: '1px solid rgba(226,82,82,0.4)',
        color: '#fca5a5', borderRadius: 10, padding: '14px 16px', fontSize: 14,
    },
    hint: { color: '#a8bdd8', fontSize: 13, textAlign: 'center', margin: 0 },
    cancelButton: {
        padding: '12px', borderRadius: 10, border: 'none',
        background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
    },
};

export default BarcodeScannerModal;
