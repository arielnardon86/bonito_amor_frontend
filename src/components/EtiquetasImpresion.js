// frontend/src/components/EtiquetasImpresion.js
import React from 'react';
import Barcode from 'react-barcode';

const EtiquetasImpresion = ({ productosParaImprimir }) => {
  // Estilos básicos para las etiquetas, optimizados para 72mm de ancho.
  // Es CRÍTICO que la impresora térmica esté configurada para un tamaño de papel
  // personalizado de 72mm de ancho en las propiedades del driver de impresión.
  const etiquetaStyle = {
    border: '0.5px solid #eee', // Borde muy sutil para visualización, se puede quitar en impresión final
    padding: '2mm',           // Pequeño padding interno
    margin: '0.5mm',          // Pequeño margen entre etiquetas
    display: 'inline-block',  // Para que las etiquetas se coloquen una al lado de la otra
    width: '72mm',            // Ancho del rollo de la impresora térmica (72mm)
    height: 'auto',           // Alto automático según el contenido
    textAlign: 'center',
    fontSize: '10px',         // Fuente más pequeña para etiquetas
    pageBreakInside: 'avoid', // Evita que una etiqueta se corte entre páginas
    boxSizing: 'border-box',  // Incluye padding y border en el width/height
    verticalAlign: 'top',     // Asegura que las etiquetas se alineen correctamente
    overflow: 'hidden',       // Oculta contenido que se desborde
  };

  const nombreProductoStyle = {
    fontWeight: 'bold',
    marginBottom: '1mm',
    fontSize: '11px', // Ajusta el tamaño de la fuente para el nombre
    wordBreak: 'break-word', // Para nombres largos
    lineHeight: '1.2',
  };

  const talleStyle = {
    fontSize: '9px',
    marginBottom: '1mm',
    color: '#555',
  };

  const precioStyle = {
    marginTop: '1mm',
    fontSize: '13px', // Ajusta el tamaño de la fuente para el precio
    fontWeight: 'bold',
  };

  // Estilos para el contenedor de la página de impresión
  const contenedorImpresionStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Alinea las etiquetas al principio
    // No se especifica un ancho fijo aquí para que se adapte al rollo de la impresora.
    // La impresora térmica determinará el ancho físico del "lienzo" de impresión.
    margin: '0',
    padding: '0',
    // Estilos solo para la impresión
    '@media print': {
      width: 'auto', // Deja que el navegador y la impresora manejen el ancho
      margin: 0,
      padding: 0,
      border: 'none',
      // Importante: para impresoras térmicas, a menudo se necesita configurar
      // los márgenes a cero en el cuadro de diálogo de impresión del navegador.
    }
  };

  return (
    <div style={contenedorImpresionStyle} className="print-area">
      {productosParaImprimir.map((producto) => {
        // Renderiza la etiqueta 'quantityToPrint' veces para cada producto
        const labelsToRender = [];
        for (let i = 0; i < (producto.quantityToPrint || 1); i++) { // Default a 1 si no se especifica
          labelsToRender.push(
            <div key={`${producto.id}-${i}`} style={etiquetaStyle} className="etiqueta-producto">
              <div style={nombreProductoStyle}>{producto.nombre}</div>
              {producto.talle && <div style={talleStyle}>Talle: {producto.talle}</div>}
              {producto.codigo_barras ? (
                <Barcode
                  value={String(producto.codigo_barras)}
                  format="EAN13" // Usamos EAN13 ya que los generamos así
                  width={1.2} // Ajusta el grosor de las barras
                  height={30} // Ajusta la altura del código de barras para ahorrar espacio
                  displayValue={true} // Muestra el número debajo
                  fontSize={9} // Tamaño de la fuente del número
                  textMargin={2} // Margen entre el código y el texto
                  background="#ffffff"
                  lineColor="#000000"
                />
              ) : (
                <div style={{color: '#888', fontSize: '9px'}}>Sin código de barras</div>
              )}
              <div style={precioStyle}>${parseFloat(producto.precio_venta).toFixed(2)}</div>
            </div>
          );
        }
        return labelsToRender;
      })}
    </div>
  );
};

export default EtiquetasImpresion;
