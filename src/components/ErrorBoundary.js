import React from 'react';

// Red de contención para errores de render no atrapados (un TypeError en
// cualquier componente, acceder a un campo que no vino en la respuesta,
// etc.). Sin esto, React desmonta TODO el árbol y deja la pantalla en blanco
// -- en una PWA instalada, eso puede derivar en la pantalla genérica del
// sistema "Se produjo un error en la aplicación / No se pudo cargar" en el
// próximo intento, sin ninguna pista de qué pasó. Con este boundary, el
// error se loguea (consola + intento de aviso al backend) y se muestra una
// pantalla propia con un botón para recargar, en vez de quedar en blanco.
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hayError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hayError: true, error };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('ErrorBoundary atrapó un error de render:', error, info?.componentStack);
    }

    handleRecargar = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hayError) {
            return (
                <div style={styles.container}>
                    <div style={styles.card}>
                        <h1 style={styles.title}>Algo salió mal</h1>
                        <p style={styles.text}>
                            Hubo un error inesperado al mostrar esta pantalla. Tu información está a salvo —
                            probá recargar la página.
                        </p>
                        <button onClick={this.handleRecargar} style={styles.button}>Recargar</button>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <pre style={styles.detalle}>{String(this.state.error?.stack || this.state.error)}</pre>
                        )}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const styles = {
    container: {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: "'Inter','Segoe UI',sans-serif", backgroundColor: '#f1f5f9',
    },
    card: {
        background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 420, width: '100%',
        textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    },
    title: { fontSize: 20, fontWeight: 800, color: '#1a2926', margin: '0 0 10px' },
    text: { fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 22px' },
    button: {
        padding: '10px 24px', backgroundColor: '#3dbf7a', color: '#fff', border: 'none',
        borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
    },
    detalle: {
        marginTop: 18, textAlign: 'left', fontSize: 11, color: '#94a3b8', background: '#f8fafc',
        padding: 10, borderRadius: 8, overflowX: 'auto', maxHeight: 200,
    },
};

export default ErrorBoundary;
