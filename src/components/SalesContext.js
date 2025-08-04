// BONITO_AMOR/frontend/src/components/SalesContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';

const SalesContext = createContext(null);

export const SalesProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const [discountPercentage, setDiscountPercentage] = useState(0);

    // Función para añadir productos al carrito
    const addToCart = useCallback((product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                // Si el producto ya está en el carrito, incrementa la cantidad
                return prevCart.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                // Si el producto no está, añádelo con cantidad 1
                // CAMBIO CLAVE AQUÍ: Asegurarse de que precio_venta sea un número flotante
                const priceAsNumber = parseFloat(product.precio_venta);
                if (isNaN(priceAsNumber)) {
                    console.error("Error: precio_venta no es un número válido:", product.precio_venta);
                    // Opcional: manejar el error, por ejemplo, no añadir el producto o usar un valor por defecto
                    return prevCart; 
                }
                return [...prevCart, { ...product, quantity: 1, precio_venta: priceAsNumber }];
            }
        });
    }, []);

    // Función para eliminar productos del carrito
    const removeFromCart = useCallback((productId) => {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    }, []);

    // Función para actualizar la cantidad de un producto en el carrito
    const updateQuantity = useCallback((productId, newQuantity) => {
        setCart(prevCart => {
            return prevCart.map(item =>
                item.id === productId
                    ? { ...item, quantity: Math.max(1, Math.min(item.stock, newQuantity)) }
                    : item
            );
        });
    }, []);

    // Función para vaciar el carrito
    const clearCart = useCallback(() => {
        setCart([]);
        setDiscountPercentage(0); // Resetear descuento al vaciar carrito
    }, []);

    // Función para calcular el total sin descuento
    const calculateTotal = useCallback(() => {
        return cart.reduce((sum, item) => sum + (item.quantity * item.precio_venta), 0);
    }, [cart]);

    // Función para aplicar descuento
    const applyDiscount = useCallback((percentage) => {
        const parsedPercentage = parseFloat(percentage);
        if (!isNaN(parsedPercentage) && parsedPercentage >= 0 && parsedPercentage <= 100) {
            setDiscountPercentage(parsedPercentage);
        } else {
            setDiscountPercentage(0); // Si el valor no es válido, resetear a 0
        }
    }, []);

    // Calcular el total final con descuento
    const finalTotal = calculateTotal() * (1 - discountPercentage / 100);

    const contextValue = {
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        calculateTotal,
        applyDiscount,
        discountPercentage,
        finalTotal,
    };

    return (
        <SalesContext.Provider value={contextValue}>
            {children}
        </SalesContext.Provider>
    );
};

export const useSales = () => {
    const context = useContext(SalesContext);
    if (!context) {
        throw new Error('useSales must be used within a SalesProvider');
    }
    return context;
};
