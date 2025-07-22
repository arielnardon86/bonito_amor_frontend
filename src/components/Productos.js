// BONITO_AMOR/frontend/src/components/Productos.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';
import EtiquetasImpresion from './EtiquetasImpresion';

// Define TALLE_OPTIONS aquí o impórtalo desde un archivo de constantes si lo tienes
const TALLE_OPTIONS = [
    { value: 'XS', label: 'Extra Pequeño' },
    { value: 'S', label: 'Pequeño' },
    { value: 'M', label: 'Mediano' },
    { value: 'L', label: 'Grande' },
    { value: 'XL', label: 'Extra Grande' },
    { value: 'UNICA', label: 'Talla Única' },
    { value: 'NUM36', label: '36' },
    { value: 'NUM38', label: '38' },
    { value: 'NUM40', label: '40' },
    { value: 'NUM42', label: '42' },
    { value: 'NUM44', label: '44' },
];

// Usar la variable de entorno de Render para la URL base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL; 

function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioVenta, setPrecioVenta] = useState(''); // Estado para el formulario de añadir
  const [stock, setStock] = useState('');
  const [talle, setTalle] = useState('UNICA');

  const [successMessage, setSuccessMessage] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);

  // Estado para productos seleccionados para imprimir, ahora es un objeto { productId: { productData, quantityToPrint } }
  const [selectedProducts, setSelectedProducts] = useState({}); 
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // ESTADOS PARA LA EDICIÓN DE STOCK EN LÍNEA
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');

  // NUEVOS ESTADOS PARA LA EDICIÓN DE PRECIO EN LÍNEA
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [newPriceValue, setNewPriceValue] = useState('');


  const fetchProductos = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/productos/`);
      setProductos(response.data.results); // Acceder al array 'results' de la respuesta paginada
      setLoading(false);
      setError(null);
    } catch (err) {
      setError('Error al cargar los productos: ' + err.message);
      setLoading(false);
      console.error('Error fetching products:', err.response || err.message);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError(null);
    setSuccessMessage(null);

    // Validaciones del formulario de añadir producto
    if (!nombre || !precioCompra || !precioVenta || !stock || !talle) {
        setMensajeError('Por favor, completa todos los campos requeridos (Nombre, Precios, Stock, Talle).');
        return;
    }
    if (isNaN(parseFloat(precioCompra)) || parseFloat(precioCompra) < 0) {
        setMensajeError('El precio de compra debe ser un número válido y no negativo.');
        return;
    }
    if (isNaN(parseFloat(precioVenta)) || parseFloat(precioVenta) < 0) {
        setMensajeError('El precio de venta debe ser un número válido y no negativo.');
        return;
    }
    if (isNaN(parseInt(stock)) || parseInt(stock) < 0) {
        setMensajeError('El stock debe ser un número entero no negativo.');
        return;
    }

    const nuevoProducto = {
      nombre,
      descripcion: descripcion || null,
      codigo_barras: codigoBarras || null, // Se genera automáticamente si es null o vacío
      precio_compra: parseFloat(precioCompra),
      precio_venta: parseFloat(precioVenta),
      stock: parseInt(stock),
      talle,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/productos/`, nuevoProducto);
      console.log('Producto añadido:', response.data);
      setSuccessMessage('Producto añadido con éxito!');
      fetchProductos(); // Recargar la lista de productos
      // Limpia el formulario después de añadir
      setNombre('');
      setDescripcion('');
      setCodigoBarras('');
      setPrecioCompra('');
      setPrecioVenta('');
      setStock('');
      setTalle('UNICA');
    } catch (err) {
      setMensajeError('Error al añadir el producto: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
      console.error('Error adding product:', err.response || err);
    }
  };

  // --- Funciones para selección y impresión de códigos de barras ---
  const handleSelectProduct = (product) => {
    setSelectedProducts(prevSelected => {
      const newSelected = { ...prevSelected };
      if (newSelected[product.id]) {
        delete newSelected[product.id]; // Deseleccionar si ya estaba seleccionado
      } else {
        newSelected[product.id] = { ...product, quantityToPrint: 1 }; // Seleccionar con cantidad 1 por defecto
      }
      return newSelected;
    });
  };

  const handleQuantityChange = (productId, newQuantity) => {
    setSelectedProducts(prevSelected => {
      const updatedSelected = { ...prevSelected };
      const quantity = parseInt(newQuantity);

      if (updatedSelected[productId]) {
        // Validar que la cantidad sea un número positivo
        if (!isNaN(quantity) && quantity > 0) {
          updatedSelected[productId] = { ...updatedSelected[productId], quantityToPrint: quantity };
        } else if (newQuantity === '') { // Permitir vaciar el campo temporalmente
          updatedSelected[productId] = { ...updatedSelected[productId], quantityToPrint: '' };
        } else {
          // Opcional: mostrar un error o revertir a la última cantidad válida
          console.warn('Cantidad inválida:', newQuantity);
        }
      }
      return updatedSelected;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allProductsMap = {};
      productos.forEach(p => {
        allProductsMap[p.id] = { ...p, quantityToPrint: 1 }; // Seleccionar todos con cantidad 1
      });
      setSelectedProducts(allProductsMap);
    } else {
      setSelectedProducts({}); // Deseleccionar todos
    }
  };

  const handlePrintSelected = () => {
    if (Object.keys(selectedProducts).length === 0) {
      alert('Por favor, selecciona al menos un producto para imprimir.');
      return;
    }
    // Verificar que todas las cantidades sean válidas antes de imprimir
    const invalidQuantities = Object.values(selectedProducts).some(p => isNaN(parseInt(p.quantityToPrint)) || parseInt(p.quantityToPrint) <= 0);
    if (invalidQuantities) {
      alert('Por favor, asegúrate de que todas las cantidades a imprimir sean números enteros positivos.');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
  };

  // productosParaImprimir ahora es un array de los valores del objeto selectedProducts
  const productosParaImprimir = Object.values(selectedProducts);

  // --- FUNCIONES PARA MODIFICAR Y ELIMINAR PRODUCTOS ---

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción es irreversible.')) {
      try {
        await axios.delete(`${API_BASE_URL}/productos/${productId}/`);
        setSuccessMessage('Producto eliminado con éxito!');
        fetchProductos(); // Recargar la lista de productos
      } catch (err) {
        setMensajeError('Error al eliminar el producto: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
        console.error('Error deleting product:', err.response || err);
      }
    }
  };

  // --- Funciones para Edición de STOCK ---
  const handleEditStockClick = (productId, currentStock) => {
    setEditingStockId(productId);
    setNewStockValue(currentStock.toString()); // Convertir a string para el input
  };

  const handleSaveStock = async (productId) => {
    setMensajeError(null);
    setSuccessMessage(null);

    const stockInt = parseInt(newStockValue);

    if (isNaN(stockInt) || stockInt < 0) {
      setMensajeError('El stock debe ser un número entero no negativo.');
      return;
    }

    try {
      // Usamos PATCH para actualizar solo el campo 'stock'
      await axios.patch(`${API_BASE_URL}/productos/${productId}/`, { stock: stockInt });
      setSuccessMessage('Stock actualizado con éxito!');
      setEditingStockId(null); // Salir del modo edición
      setNewStockValue(''); // Limpiar el valor temporal
      fetchProductos(); // Recargar la lista para mostrar el stock actualizado
    } catch (err) {
      setMensajeError('Error al actualizar el stock: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
      console.error('Error updating stock:', err.response || err);
    }
  };

  const handleCancelEditStock = () => {
    setEditingStockId(null);
    setNewStockValue('');
  };

  // --- NUEVAS FUNCIONES para Edición de PRECIO ---
  const handleEditPriceClick = (productId, currentPrice) => {
    setEditingPriceId(productId);
    setNewPriceValue(currentPrice.toString()); // Convertir a string para el input
  };

  const handleSavePrice = async (productId) => {
    setMensajeError(null);
    setSuccessMessage(null);

    const priceFloat = parseFloat(newPriceValue);

    if (isNaN(priceFloat) || priceFloat < 0) {
      setMensajeError('El precio de venta debe ser un número válido y no negativo.');
      return;
    }

    try {
      // Usamos PATCH para actualizar solo el campo 'precio_venta'
      await axios.patch(`${API_BASE_URL}/productos/${productId}/`, { precio_venta: priceFloat });
      setSuccessMessage('Precio de venta actualizado con éxito!');
      setEditingPriceId(null); // Salir del modo edición
      setNewPriceValue(''); // Limpiar el valor temporal
      fetchProductos(); // Recargar la lista para mostrar el precio actualizado
    } catch (err) {
      setMensajeError('Error al actualizar el precio de venta: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
      console.error('Error updating price:', err.response || err);
    }
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setNewPriceValue('');
  };


  // --- RENDERING ---
  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando productos...</div>;
  }

  if (error) {
    return <div style={{ color: 'red', marginBottom: '10px', padding: '20px', border: '1px solid red' }}>{error}</div>;
  }

  if (showPrintPreview) {
    return (
      <div style={{ padding: '20px' }}>
        <button onClick={handleClosePrintPreview} style={{ marginBottom: '10px', padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Volver a Gestión de Productos
        </button>
        <button onClick={() => window.print()} style={{ marginLeft: '10px', marginBottom: '10px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Imprimir Etiquetas
        </button>
        <EtiquetasImpresion productosParaImprimir={productosParaImprimir} />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: 'auto' }}>
      <h1>Gestión de Productos</h1>

      {mensajeError && <div style={{ color: 'red', marginBottom: '10px', border: '1px solid red', padding: '10px' }}>{mensajeError}</div>}
      {successMessage && <div style={{ color: 'green', marginBottom: '10px', border: '1px solid green', padding: '10px' }}>{successMessage}</div>}

      <h2>Añadir Nuevo Producto</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '20px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Nombre:</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Descripción:</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Código de Barras (Opcional - se genera automáticamente si está vacío):</label>
          <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Talle:</label>
          <select value={talle} onChange={(e) => setTalle(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
            {TALLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Precio Compra:</label>
          <input type="number" step="0.01" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} required style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Precio Venta:</label>
          <input type="number" step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} required style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Stock:</label>
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
          Añadir Producto
        </button>
      </form>

      <h2>Lista de Productos Existentes</h2>
      {productos.length === 0 ? (
        <p>No hay productos disponibles.</p>
      ) : (
        <>
          <div style={{ marginBottom: '15px' }}>
            <button onClick={handlePrintSelected} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Imprimir Códigos de Barras Seleccionados ({Object.keys(selectedProducts).length})
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    // Marca el checkbox "Seleccionar Todo" si todos los productos están en selectedProducts
                    checked={Object.keys(selectedProducts).length === productos.length && productos.length > 0}
                  />
                </th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>ID</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Nombre</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Talle</th>
               
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>P. Venta</th> {/* Columna de Precio de Venta */}
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Stock</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Descripción</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Código</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Imagen Código</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cantidad a Imprimir</th> {/* Nueva columna */}
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(producto => (
                <tr key={producto.id}>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedProducts[producto.id]} // Verifica si el producto está en el objeto
                      onChange={() => handleSelectProduct(producto)} // Pasa el objeto producto completo
                    />
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{producto.id}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{producto.nombre}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{producto.talle || 'N/A'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{producto.codigo_barras || 'N/A'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {producto.codigo_barras ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: '150px' }}>
                          <Barcode
                              value={String(producto.codigo_barras)}
                              format="EAN13"
                              width={1.2}
                              height={50}
                              displayValue={true}
                              fontSize={11}
                              textMargin={3}
                              background="#ffffff"
                              lineColor="#000000"
                          />
                      </div>
                    ) : (
                      <span style={{ color: '#888' }}>Sin código</span>
                    )}
                  </td>
                  {/* Celda para Precio de Venta con edición en línea */}
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {editingPriceId === producto.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={newPriceValue}
                          onChange={(e) => setNewPriceValue(e.target.value)}
                          min="0"
                          style={{ width: '80px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
                        />
                        <button onClick={() => handleSavePrice(producto.id)} style={{ padding: '5px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Guardar
                        </button>
                        <button onClick={handleCancelEditPrice} style={{ padding: '5px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>${parseFloat(producto.precio_venta).toFixed(2)}</span>
                        <button onClick={() => handleEditPriceClick(producto.id, producto.precio_venta)} style={{ padding: '5px 8px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Editar
                        </button>
                      </div>
                    )}
                  </td>
                  {/* Celda para Stock con edición en línea (ya existente) */}
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {editingStockId === producto.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="number"
                          value={newStockValue}
                          onChange={(e) => setNewStockValue(e.target.value)}
                          min="0"
                          style={{ width: '60px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
                        />
                        <button onClick={() => handleSaveStock(producto.id)} style={{ padding: '5px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Guardar
                        </button>
                        <button onClick={handleCancelEditStock} style={{ padding: '5px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>{producto.stock}</span>
                        <button onClick={() => handleEditStockClick(producto.id, producto.stock)} style={{ padding: '5px 8px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Editar
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{producto.descripcion || 'Sin descripción'}</td>
                  {/* Nueva celda para la cantidad a imprimir */}
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {selectedProducts[producto.id] ? (
                      <input
                        type="number"
                        min="1"
                        value={selectedProducts[producto.id].quantityToPrint}
                        onChange={(e) => handleQuantityChange(producto.id, e.target.value)}
                        style={{ width: '60px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
                      />
                    ) : (
                      <span style={{ color: '#888' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <button
                      onClick={() => handleDeleteProduct(producto.id)}
                      style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default Productos;