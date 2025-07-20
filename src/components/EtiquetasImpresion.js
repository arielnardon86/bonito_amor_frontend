// frontend/src/components/EtiquetasImpresion.js
import React from 'react';
import Barcode from 'react-barcode'; // Necesitamos Barcode aquí también

const EtiquetasImpresion = ({ productosParaImprimir }) => {
  // Estilos básicos para las etiquetas. ¡Personaliza esto!
  const etiquetaStyle = {
    border: '1px solid #ccc',
    padding: '5px',
    margin: '5px',
    display: 'inline-block', // Para que las etiquetas se coloquen una al lado de la otra
    width: '180px', // Ancho de la etiqueta, ajusta según tu impresora y tamaño deseado
    height: 'auto', // Alto automático
    textAlign: 'center',
    fontSize: '12px',
    pageBreakInside: 'avoid', // Evita que una etiqueta se corte entre páginas
    boxSizing: 'border-box' // Incluye padding y border en el width/height
  };

  const nombreProductoStyle = {
    fontWeight: 'bold',
    marginBottom: '2px',
    fontSize: '13px', // Ajusta el tamaño de la fuente para el nombre
    wordBreak: 'break-word' // Para nombres largos
  };

  const precioStyle = {
    marginTop: '2px',
    fontSize: '14px', // Ajusta el tamaño de la fuente para el precio
    fontWeight: 'bold'
  };

  // Estilos para el contenedor de la página de impresión
  const contenedorImpresionStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Alinea las etiquetas al principio
    width: '210mm', // Un ancho de página A4 para simular la vista de impresión
    margin: '0 auto', // Centra la página
    padding: '5mm', // Un poco de padding en la página
    // Estilos solo para la impresión
    '@media print': {
      width: 'auto',
      margin: 0,
      padding: 0,
      border: 'none',
    }
  };

  return (
    <div style={contenedorImpresionStyle} className="print-area">
      {productosParaImprimir.map((producto) => (
        <div key={producto.id} style={etiquetaStyle} className="etiqueta-producto">
          <div style={nombreProductoStyle}>{producto.nombre}</div>
          {producto.talle && <div>Talle: {producto.talle}</div>}
          {producto.codigo_barras ? (
            <Barcode
              value={String(producto.codigo_barras)}
              format="EAN13" // Usamos EAN13 ya que los generamos así
              width={1.2} // Ajusta el grosor de las barras
              height={40} // Ajusta la altura del código de barras
              displayValue={true} // Muestra el número debajo
              fontSize={11} // Tamaño de la fuente del número
              textMargin={3} // Margen entre el código y el texto
              background="#ffffff"
              lineColor="#000000"
            />
          ) : (
            <div style={{color: '#888'}}>Sin código de barras</div>
          )}
          <div style={precioStyle}>${parseFloat(producto.precio_venta).toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
};

export default EtiquetasImpresion;