// BONITO_AMOR/frontend/src/components/PuntoVenta.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Função para normalizar a URL base, eliminando qualquer /api/ ou barra final
const normalizeApiUrl = (url) => {
    let normalizedUrl = url;
    if (normalizedUrl.endsWith('/api/') || normalizedUrl.endsWith('/api')) {
        normalizedUrl = normalizedUrl.replace(/\/api\/?$/, '');
    }
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    return normalizedUrl;
};

const BASE_API_ENDPOINT = normalizeApiUrl(API_BASE_URL);

const PuntoVenta = () => {
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth();

    const [productos, setProductos] = useState([]); // Lista de todos os produtos disponíveis
    const [categorias, setCategorias] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [productosEnVenta, setProductosEnVenta] = useState([]); // Produtos adicionados à venda atual (o carrinho)
    const [totalVenta, setTotalVenta] = useState(0);
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState('');
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [productoSeleccionado, setProductoSeleccionado] = useState(null); // Produto selecionado por pesquisa
    const [cantidadProducto, setCantidadProducto] = useState(1);
    const [error, setError] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});

    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success'); // 'success', 'error', 'info'

    // Paginação para a tabela 'Produtos no Carrinho'
    const [currentPageCart, setCurrentPageCart] = useState(1);
    const itemsPerPageCart = 10;

    // Paginação para a seção 'Produtos Disponíveis'
    const [currentPageAvailable, setCurrentPageAvailable] = useState(1);
    const itemsPerPageAvailable = 10;

    // Função para exibir alertas personalizados na UI
    const showCustomAlert = (message, type = 'success') => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlertMessage(true);
        setTimeout(() => {
            setShowAlertMessage(false);
            setAlertMessage('');
            setAlertType('success'); // Redefinir para o padrão
        }, 3000);
    };

    // Carregar todos os produtos disponíveis para a loja selecionada
    const fetchProductos = useCallback(async () => {
        if (!token || !selectedStoreSlug) {
            setLoadingData(false);
            return;
        }
        setLoadingData(true);
        setError(null);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug }
            });
            console.log("Resposta de produtos:", response.data);
            console.log("Selected Store Slug:", selectedStoreSlug);
            setProductos(response.data.results || response.data);
            setError(null);
        } catch (err) {
            console.error("Erro ao carregar produtos:", err.response || err.message);
            setError("Erro ao carregar produtos: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoadingData(false);
        }
    }, [token, selectedStoreSlug]);

    // Carregar categorias
    const fetchCategorias = useCallback(async () => {
        console.log("fetchCategorias: Chamado.");
        if (!token) {
            console.log("fetchCategorias: Token não presente, retornando.");
            return;
        }
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/categorias/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("Resposta de categorias:", response.data);
            setCategorias(response.data.results || response.data);
        } catch (err) {
            console.error("Erro ao carregar categorias:", err.response ? err.response.data : err.message);
        }
    }, [token]);

    // Carregar métodos de pagamento
    const fetchMetodosPago = useCallback(async () => {
        console.log("fetchMetodosPago: Chamado.");
        console.log("fetchMetodosPago: Token atual:", token ? token.substring(0, 10) + '...' : 'null');
        if (!token) {
            console.log("fetchMetodosPago: Token não presente, retornando.");
            return;
        }
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("fetchMetodosPago: Resposta da API de métodos de pagamento:", response.data);
            setMetodosPago(response.data);
            if (response.data.length > 0) {
                setMetodoPagoSeleccionado(response.data[0].nombre);
                console.log("fetchMetodosPago: Método de pagamento selecionado:", response.data[0].nombre);
            } else {
                console.log("fetchMetodosPago: Nenhuma forma de pagamento retornada.");
            }
        } catch (err) {
            console.error("fetchMetodosPago: Erro ao carregar métodos de pagamento:", err.response ? err.response.data : err.message);
            showCustomAlert("Erro ao carregar métodos de pagamento.", 'error');
        }
    }, [token]);

    // Efeito para carregar dados iniciais quando o usuário está autenticado e a loja selecionada
    useEffect(() => {
        console.log("useEffect principal: Estado de autenticação e loja:", { isAuthenticated, user, selectedStoreSlug, authLoading });
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
            setLoadingData(true);
            fetchProductos();
            fetchCategorias();
            fetchMetodosPago();
        } else if (!authLoading && (!isAuthenticated || !user || (!user.is_superuser && !user.is_staff))) {
            setError("Acesso negado. Não tens permissões para usar o ponto de venda.");
            setLoadingData(false);
        } else if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && !selectedStoreSlug) {
            setLoadingData(false);
            setProductos([]);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchProductos, fetchCategorias, fetchMetodosPago]);

    // Efeito para recalcular o total da venda quando os produtos em venda mudam
    useEffect(() => {
        const calcularTotal = productosEnVenta.reduce((acc, item) => acc + (parseFloat(item.precio) * item.cantidad), 0);
        setTotalVenta(calcularTotal);
        const totalPagesCart = Math.ceil(productosEnVenta.length / itemsPerPageCart);
        if (currentPageCart > totalPagesCart && totalPagesCart > 0) {
            setCurrentPageCart(totalPagesCart);
        } else if (productosEnVenta.length === 0) {
            setCurrentPageCart(1);
        }
    }, [productosEnVenta, currentPageCart]);

    // Lidar com a pesquisa de um produto por código de barras/nome
    const handleBuscarProducto = async (e) => {
        e.preventDefault();
        setError(null);
        if (!busquedaProducto) {
            showCustomAlert("Por favor, introduza um nome ou código de barras para pesquisar.", 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert("Por favor, selecione uma loja antes de pesquisar produtos.", 'error');
            return;
        }

        try {
            let response;
            try {
                response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/buscar_por_barcode/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { barcode: busquedaProducto, tienda_slug: selectedStoreSlug }
                });
            } catch (barcodeErr) {
                console.warn("Não encontrado por código de barras, tentando por nome...", barcodeErr);
                response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { search: busquedaProducto, tienda_slug: selectedStoreSlug }
                });
                if (response.data.results && response.data.results.length > 0) {
                    response.data = response.data.results[0];
                } else if (response.data.length > 0) {
                    response.data = response.data[0];
                } else {
                    throw new Error("Produto não encontrado por nome.");
                }
            }

            console.log("Resposta de pesquisa de produto:", response.data);
            setProductoSeleccionado(response.data);
            setCantidadProducto(1);
            setBusquedaProducto('');
        } catch (err) {
            console.error("Erro ao pesquisar produto:", err.response ? err.response.data : err.message);
            setProductoSeleccionado(null);
            showCustomAlert("Produto não encontrado ou erro na pesquisa: " + (err.response?.data?.error || err.message), 'error');
        }
    };

    // Função para adicionar um produto à lista de venda, seja da pesquisa ou da lista de disponíveis
    const handleAgregarProducto = (productToAdd, quantity = 1) => {
        if (!productToAdd) {
            showCustomAlert("Nenhum produto selecionado para adicionar.", 'error');
            return;
        }
        if (quantity <= 0) {
            showCustomAlert("A quantidade deve ser maior que 0.", 'error');
            return;
        }
        if (quantity > productToAdd.stock) {
            showCustomAlert(`Não há stock suficiente. Stock disponível: ${productToAdd.stock}.`, 'error');
            return;
        }

        const productoExistenteIndex = productosEnVenta.findIndex(item => item.id === productToAdd.id);

        if (productoExistenteIndex > -1) {
            const nuevosProductosEnVenta = [...productosEnVenta];
            const nuevaCantidad = nuevosProductosEnVenta[productoExistenteIndex].cantidad + quantity;

            if (nuevaCantidad > productToAdd.stock) {
                showCustomAlert(`Não é possível adicionar mais. A quantidade total excede o stock disponível (${productToAdd.stock}).`, 'error');
                return;
            }
            nuevosProductosEnVenta[productoExistenteIndex].cantidad = nuevaCantidad;
            setProductosEnVenta(nuevosProductosEnVenta);
        } else {
            setProductosEnVenta([...productosEnVenta, { ...productToAdd, cantidad: quantity }]);
        }
        if (productToAdd.id === productoSeleccionado?.id) {
            setProductoSeleccionado(null);
            setCantidadProducto(1);
            setBusquedaProducto('');
        }
        showCustomAlert(`${productToAdd.nombre} adicionado à venda.`, 'success');
    };

    // Aumentar quantidade de um produto no carrinho
    const handleIncreaseQuantity = (id) => {
        setProductosEnVenta(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const productInStock = productos.find(p => p.id === id);
                if (productInStock && item.cantidad < productInStock.stock) {
                    return { ...item, cantidad: item.cantidad + 1 };
                } else {
                    showCustomAlert(`Não há mais stock disponível para ${item.nombre}.`, 'error');
                }
            }
            return item;
        }));
    };

    // Diminuir quantidade de um produto no carrinho
    const handleDecreaseQuantity = (id) => {
        setProductosEnVenta(prevItems => prevItems.map(item => {
            if (item.id === id && item.cantidad > 1) {
                return { ...item, cantidad: item.cantidad - 1 };
            }
            return item;
        }));
    };

    // Eliminar um produto da lista de venda
    const handleEliminarProductoDeVenta = (id) => {
        setProductosEnVenta(productosEnVenta.filter(item => item.id !== id));
        showCustomAlert("Produto removido da venda.", 'info');
    };

    // Realizar a venda
    const handleRealizarVenta = async () => {
        if (productosEnVenta.length === 0) {
            showCustomAlert("Nenhum produto no carrinho.", 'error');
            return;
        }
        if (!metodoPagoSeleccionado) {
            showCustomAlert("Por favor, selecione um método de pagamento.", 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert("Por favor, selecione uma loja para registar a venda.", 'error');
            return;
        }

        setConfirmMessage(`Confirma a venda por um total de $${totalVenta.toFixed(2)} com ${metodoPagoSeleccionado}?`);
        setConfirmAction(() => async () => {
            setShowConfirmModal(false);
            try {
                const detalles = productosEnVenta.map(item => ({
                    producto: item.id,
                    cantidad: item.cantidad,
                    precio_unitario: parseFloat(item.precio),
                }));

                const ventaData = {
                    tienda: selectedStoreSlug,
                    metodo_pago: metodoPagoSeleccionado,
                    detalles: detalles,
                };

                const response = await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, ventaData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log("Resposta de venda:", response.data);

                showCustomAlert(`Venda realizada com sucesso! ID: ${response.data.id}`, 'success');
                setProductosEnVenta([]);
                setTotalVenta(0);
                setProductoSeleccionado(null);
                setCantidadProducto(1);
                fetchProductos(); // Recarregar produtos para atualizar stock
            } catch (err) {
                console.error("Erro ao realizar venda:", err.response ? err.response.data : err.message);
                setError("Erro ao realizar venda: " + (err.response?.data?.detail || err.message));
                showCustomAlert("Erro ao realizar venda.", 'error');
            }
        });
        setShowConfirmModal(true);
    };

    // Obter produtos atuais para paginação do carrinho
    const indexOfLastItemCart = currentPageCart * itemsPerPageCart;
    const indexOfFirstItemCart = indexOfLastItemCart - itemsPerPageCart;
    const currentProductsInCart = productosEnVenta.slice(indexOfFirstItemCart, indexOfLastItemCart);
    const totalPagesCart = Math.ceil(productosEnVenta.length / itemsPerPageCart);

    const paginateCart = (pageNumber) => setCurrentPageCart(pageNumber);

    // Obter produtos atuais para paginação de produtos disponíveis
    const indexOfLastItemAvailable = currentPageAvailable * itemsPerPageAvailable;
    const indexOfFirstItemAvailable = indexOfLastItemAvailable - itemsPerPageAvailable;
    const currentAvailableProducts = productos.slice(indexOfFirstItemAvailable, indexOfLastItemAvailable);
    const totalPagesAvailable = Math.ceil(productos.length / itemsPerPageAvailable);

    const paginateAvailable = (pageNumber) => setCurrentPageAvailable(pageNumber);


    // Renderização condicional baseada no estado de carregamento e autenticação
    if (authLoading || (isAuthenticated && !user)) {
        return <p style={styles.loadingMessage}>A carregar dados do utilizador...</p>;
    }

    if (!isAuthenticated || !(user.is_superuser || user.is_staff)) {
        return <p style={styles.accessDeniedMessage}>Acesso negado. Não tem permissões para usar o ponto de venda.</p>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <h2>Por favor, selecione uma loja na barra de navegação para usar o ponto de venda.</h2>
            </div>
        );
    }

    if (loadingData) {
        return <p style={styles.loadingMessage}>A carregar dados do ponto de venda...</p>;
    }

    // Depuração para métodos de pagamento
    console.log("Estado de métodos de pagamento (antes do render):", { metodosPago, metodoPagoSeleccionado });

    return (
        <div style={styles.container}>
            <h1>Ponto de Venda ({selectedStoreSlug})</h1>

            {error && <p style={styles.errorMessage}>{error}</p>}

            {/* Seção de Pesquisa e Adicionar Produto */}
            <div style={styles.searchAddSection}>
                <h3>Pesquisar e Adicionar Produto</h3>
                <form onSubmit={handleBuscarProducto} style={styles.searchForm}>
                    <input
                        type="text"
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        placeholder="Pesquisar produto por nome ou código de barras"
                        style={styles.searchInput}
                    />
                    <button type="submit" style={styles.searchButton}>Pesquisar</button>
                </form>

                {productoSeleccionado && (
                    <div style={styles.selectedProductCard}>
                        <h4>Produto Selecionado:</h4>
                        <p><strong>Nome:</strong> {productoSeleccionado.nombre}</p>
                        <p><strong>Preço:</strong> ${parseFloat(productoSeleccionado.precio).toFixed(2)}</p>
                        <p><strong>Stock Disponível:</strong> {productoSeleccionado.stock}</p>
                        <div style={styles.quantityControls}>
                            <label>Quantidade:</label>
                            <input
                                type="number"
                                value={cantidadProducto}
                                onChange={(e) => setCantidadProducto(parseInt(e.target.value) || 1)}
                                min="1"
                                max={productoSeleccionado.stock}
                                style={styles.quantityInput}
                            />
                            <button onClick={() => handleAgregarProducto(productoSeleccionado, cantidadProducto)} style={styles.addButton}>Adicionar à Venda</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Seção de Resumo de Venda */}
            <div style={styles.summarySection}>
                <h2>Resumo de Venda</h2>
                <p style={styles.totalText}>Total: ${totalVenta.toFixed(2)}</p>
                <div style={styles.paymentMethodControls}>
                    <label htmlFor="metodoPago">Método de Pagamento:</label>
                    <select
                        id="metodoPago"
                        value={metodoPagoSeleccionado}
                        onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                        style={styles.paymentMethodSelect}
                    >
                        {metodosPago.length > 0 ? (
                            metodosPago.map(metodo => (
                                <option key={metodo.id} value={metodo.nombre}>{metodo.nombre}</option>
                            ))
                        ) : (
                            <option value="">A carregar métodos de pagamento...</option>
                        )}
                    </select>
                </div>
                <button onClick={handleRealizarVenta} style={styles.completeSaleButton}>Realizar Venda</button>
            </div>

            {/* Seção de Produtos em Venda (o carrinho) */}
            <div style={styles.saleListSection}>
                <h2>Produtos no Carrinho</h2>
                {productosEnVenta.length === 0 ? (
                    <p style={styles.noDataMessage}>Nenhum produto na venda atual.</p>
                ) : (
                    <>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Produto</th>
                                    <th style={styles.th}>Tamanho</th>
                                    <th style={styles.th}>Quantidade</th>
                                    <th style={styles.th}>Preço Unitário</th>
                                    <th style={styles.th}>Subtotal</th>
                                    <th style={styles.th}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentProductsInCart.map(item => (
                                    <tr key={item.id} style={styles.tableRow}>
                                        <td style={styles.td}>{item.nombre}</td>
                                        <td style={styles.td}>{item.talle}</td>
                                        <td style={styles.td}>
                                            <div style={styles.quantityControlButtons}>
                                                <button onClick={() => handleDecreaseQuantity(item.id)} style={styles.quantityButton}>-</button>
                                                <span>{item.cantidad}</span>
                                                <button onClick={() => handleIncreaseQuantity(item.id)} style={styles.quantityButton}>+</button>
                                            </div>
                                        </td>
                                        <td style={styles.td}>${parseFloat(item.precio).toFixed(2)}</td>
                                        <td style={styles.td}>${(parseFloat(item.precio) * item.cantidad).toFixed(2)}</td>
                                        <td style={styles.td}>
                                            <button onClick={() => handleEliminarProductoDeVenta(item.id)} style={styles.deleteItemButton}>Remover</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPagesCart > 1 && (
                            <div style={styles.paginationControls}>
                                <button
                                    onClick={() => paginateCart(currentPageCart - 1)}
                                    disabled={currentPageCart === 1}
                                    style={styles.paginationButton}
                                >
                                    Anterior
                                </button>
                                {Array.from({ length: totalPagesCart }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => paginateCart(i + 1)}
                                        style={currentPageCart === i + 1 ? { ...styles.paginationButton, ...styles.paginationButtonActive } : styles.paginationButton}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => paginateCart(currentPageCart + 1)}
                                    disabled={currentPageCart === totalPagesCart}
                                    style={styles.paginationButton}
                                >
                                    Próximo
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Nova Seção: Produtos Disponíveis */}
            <div style={styles.availableProductsSection}>
                <h2>Produtos Disponíveis</h2>
                {productos.length === 0 ? (
                    <p style={styles.noDataMessage}>Nenhum produto disponível nesta loja.</p>
                ) : (
                    <>
                        <div style={styles.productListGrid}>
                            {currentAvailableProducts.map(p => (
                                <div key={p.id} style={styles.productCard}>
                                    <h3>{p.nombre}</h3>
                                    <p>Tamanho: {p.talle}</p>
                                    <p>Preço: ${parseFloat(p.precio).toFixed(2)}</p>
                                    <p>Stock: {p.stock}</p>
                                    <button
                                        onClick={() => handleAgregarProducto(p, 1)}
                                        style={p.stock <= 0 ? { ...styles.addToSaleButton, ...styles.addToSaleButtonDisabled } : styles.addToSaleButton}
                                        disabled={p.stock <= 0}
                                    >
                                        {p.stock > 0 ? 'Adicionar (1)' : 'Sem Stock'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {totalPagesAvailable > 1 && (
                            <div style={styles.paginationControls}>
                                <button
                                    onClick={() => paginateAvailable(currentPageAvailable - 1)}
                                    disabled={currentPageAvailable === 1}
                                    style={styles.paginationButton}
                                >
                                    Anterior
                                </button>
                                {Array.from({ length: totalPagesAvailable }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => paginateAvailable(i + 1)}
                                        style={currentPageAvailable === i + 1 ? { ...styles.paginationButton, ...styles.paginationButtonActive } : styles.paginationButton}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => paginateAvailable(currentPageAvailable + 1)}
                                    disabled={currentPageAvailable === totalPagesAvailable}
                                    style={styles.paginationButton}
                                >
                                    Próximo
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal de Confirmação */}
            {showConfirmModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <p style={styles.modalMessage}>{confirmMessage}</p>
                        <div style={styles.modalActions}>
                            <button onClick={confirmAction} style={styles.modalConfirmButton}>Sim</button>
                            <button onClick={() => setShowConfirmModal(false)} style={styles.modalCancelButton}>Não</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Caixa de Mensagem de Alerta */}
            {showAlertMessage && (
                <div style={{ ...styles.alertBox, backgroundColor: alertType === 'error' ? '#dc3545' : (alertType === 'info' ? '#17a2b8' : '#28a745') }}>
                    <p>{alertMessage}</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
    },
    loadingMessage: {
        textAlign: 'center',
        marginTop: '50px',
        color: '#555',
    },
    accessDeniedMessage: {
        textAlign: 'center',
        marginTop: '50px',
        color: 'red',
        fontWeight: 'bold',
    },
    noStoreSelectedMessage: {
        padding: '50px',
        textAlign: 'center',
        color: '#777',
    },
    errorMessage: {
        color: 'red',
        backgroundColor: '#ffe3e6',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    searchAddSection: {
        marginBottom: '30px',
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    searchForm: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
    },
    searchInput: {
        flexGrow: 1,
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
    },
    searchButton: {
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    selectedProductCard: {
        border: '1px solid #d4edda',
        backgroundColor: '#d4edda',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '15px',
    },
    quantityControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '10px',
    },
    quantityInput: {
        width: '80px',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
    },
    addButton: {
        padding: '8px 15px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    availableProductsSection: {
        marginBottom: '30px',
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    productListGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px',
        marginTop: '15px',
    },
    productCard: {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        textAlign: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    addToSaleButton: {
        marginTop: '10px',
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
    },
    addToSaleButtonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
    },
    saleListSection: {
        marginBottom: '30px',
    },
    noDataMessage: {
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        borderRadius: '8px',
        overflow: 'hidden',
    },
    tableHeaderRow: {
        backgroundColor: '#f2f2f2',
    },
    th: {
        padding: '12px',
        border: '1px solid #ddd',
        textAlign: 'left',
        fontWeight: 'bold',
        color: '#333',
    },
    tableRow: {
        backgroundColor: 'inherit',
    },
    td: {
        padding: '10px',
        border: '1px solid #ddd',
        verticalAlign: 'top',
    },
    deleteItemButton: {
        padding: '5px 10px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    quantityControlButtons: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
    },
    quantityButton: {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        border: '1px solid #007bff',
        backgroundColor: '#007bff',
        color: 'white',
        fontSize: '1em',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s ease',
    },
    paginationControls: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '20px',
        gap: '10px',
    },
    paginationButton: {
        padding: '8px 15px',
        border: '1px solid #007bff',
        borderRadius: '5px',
        backgroundColor: 'white',
        color: '#007bff',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, color 0.2s ease',
    },
    paginationButtonActive: {
        backgroundColor: '#007bff',
        color: 'white',
    },
    summarySection: {
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        textAlign: 'right',
        marginBottom: '30px',
    },
    totalText: {
        fontSize: '1.8em',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '15px',
    },
    paymentMethodControls: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
    },
    paymentMethodSelect: {
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        minWidth: '150px',
    },
    completeSaleButton: {
        padding: '12px 25px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        maxWidth: '450px',
        width: '90%',
        animation: 'fadeIn 0.3s ease-out',
    },
    modalMessage: {
        fontSize: '1.1em',
        marginBottom: '25px',
        color: '#333',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
    },
    modalConfirmButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
    },
    modalConfirmButtonHover: {
        backgroundColor: '#c82333',
        transform: 'scale(1.02)',
    },
    modalCancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
    },
    modalCancelButtonHover: {
        backgroundColor: '#5a6268',
        transform: 'scale(1.02)',
    },
    alertBox: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1001,
        opacity: 0,
        animation: 'fadeInOut 3s forwards',
    },
    '@keyframes fadeInOut': {
        '0%': { opacity: 0, transform: 'translateY(-20px)' },
        '10%': { opacity: 1, transform: 'translateY(0)' },
        '90%': { opacity: 1, transform: 'translateY(0)' },
        '100%': { opacity: 0, transform: 'translateY(-20px)' },
    },
    '@keyframes fadeIn': {
        '0%': { opacity: 0, transform: 'scale(0.9)' },
        '100%': { opacity: 1, transform: 'scale(1)' },
    },
};

export default PuntoVenta;
