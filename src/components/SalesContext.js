// Store/frontend/src/components/SalesContext.js
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid'; 

const SalesContext = createContext();

// Venta fraccionada: 'precio' es por Kg o por Metro (unidad_fraccionada) y
// 'quantity' del ítem del carrito es la unidad "chica" cargada -- gramos para
// Kg, centímetros para Metro -- así que el subtotal es precio/divisor *
// cantidad, no precio * quantity directo como el resto de los productos.
export const DIVISOR_UNIDAD_FRACCIONADA = { KG: 1000, METRO: 100 };

// descuentoItemPorcentaje: % que se le resta al TOTAL de la línea (no por
// unidad, no importa la cantidad) -- ver setDescuentoItemEnCarrito. Clamp a
// 0-100 para que un valor fuera de rango no vuelva el subtotal negativo ni
// lo infle.
export const calcularSubtotalItem = (item) => {
  const precio = parseFloat(item.product.precio) || 0;
  const bruto = item.product.se_vende_por_peso
    ? (precio / (DIVISOR_UNIDAD_FRACCIONADA[item.product.unidad_fraccionada] || 1000)) * item.quantity
    : precio * item.quantity;
  const porcentaje = Math.min(100, Math.max(0, parseFloat(item.descuentoItemPorcentaje) || 0));
  return bruto * (1 - porcentaje / 100);
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
};

export const SalesProvider = ({ children }) => {
  const [carts, setCarts] = useState([]);
  const [activeCartId, setActiveCartId] = useState(null);

  // Memoizadas con useCallback: el value del provider (más abajo) se memoiza
  // con useMemo, y para que eso sirva de algo las funciones que contiene
  // tienen que tener una referencia estable -- si no, el objeto value sigue
  // siendo "nuevo" en cada render igual, y cada componente que usa
  // useSales() (todo Punto de Venta) se re-renderiza sin necesidad.
  const createNewCart = useCallback((initialAlias = '') => {
    const newCartId = uuidv4();
    const newCart = {
      id: newCartId,
      name: `Venta #${carts.length + 1}`, // Default name (e.g., "Sale #1", "Sale #2")
      alias: initialAlias,
      items: [],
      total: 0,
      createdAt: new Date(),
    };
    setCarts(prevCarts => [...prevCarts, newCart]);
    setActiveCartId(newCartId);
    return newCartId;
  }, [carts.length]);

  const selectCart = useCallback((id) => {
    if (carts.some(cart => cart.id === id)) {
      setActiveCartId(id);
    } else {
      console.warn("Cart not found:", id);
    }
  }, [carts]);

  const updateCartAlias = useCallback((cartId, newAlias) => {
    setCarts(prevCarts =>
      prevCarts.map(cart =>
        cart.id === cartId ? { ...cart, alias: newAlias } : cart
      )
    );
  }, []);

  // Ensures there is always at least one active cart on load/initialization
  useEffect(() => {
    if (carts.length === 0) { // Only if there are no carts, create a new one
      createNewCart('Venta #1');
    } else if (activeCartId === null && carts.length > 0) {
      // If there is no active cart but there are carts in the list, select the first one
      setActiveCartId(carts[0].id);
    } else if (activeCartId !== null && !carts.some(cart => cart.id === activeCartId)) {
      // If the activeCartId points to a cart that no longer exists, select the first one or create one
      if (carts.length > 0) {
        setActiveCartId(carts[0].id);
      } else {
        createNewCart('Venta #1');
      }
    }
  }, [carts, activeCartId, createNewCart]); // Dependencies to react to changes in carts or active ID

  const addProductToCart = useCallback((productToAdd, quantity = 1) => {
    if (!activeCartId) {
      console.warn("No active cart. Create one first.");
      return;
    }

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id === activeCartId) {
        const existingItemIndex = cart.items.findIndex(item => item.product.id === productToAdd.id);
        let updatedItems;
        let updatedTotal;

        // Ensure productToAdd.precio is a number before using it in calculations
        const productPrice = parseFloat(productToAdd.precio);
        if (isNaN(productPrice)) {
            console.error("Error: Product price is not a valid number:", productToAdd.precio);
            return cart; // Return current cart if price is invalid
        }

        if (existingItemIndex > -1) {
          const existingItem = cart.items[existingItemIndex];
          // "Precio variable" (ej. "Varios"): cada agregado puede traer un precio
          // distinto (se carga a mano en el POS), así que en vez de ignorarlo como
          // con el resto de los productos, se promedia contra la línea existente --
          // no hay otra forma de guardar dos precios distintos en una sola línea de
          // venta (precio_unitario es uno solo por detalle).
          const nuevoPrecio = productToAdd.precio_variable
            ? ((parseFloat(existingItem.product.precio) || 0) * existingItem.quantity + productPrice * quantity)
              / (existingItem.quantity + quantity)
            : existingItem.product.precio;
          updatedItems = cart.items.map((item, index) =>
            index === existingItemIndex
              ? { ...item, quantity: item.quantity + quantity, product: { ...item.product, precio: nuevoPrecio } }
              : item
          );
        } else {
          // Store the product with its price ensured as a number
          updatedItems = [...cart.items, { product: { ...productToAdd, precio: productPrice }, quantity: quantity, descuentoItemPorcentaje: 0 }];
        }
        
        // Recalculate total based on the numerical price
        updatedTotal = updatedItems.reduce((sum, item) => sum + calcularSubtotalItem(item), 0);

        return { ...cart, items: updatedItems, total: updatedTotal };
      }
      return cart;
    }));
  }, [activeCartId]);

  // KEY CHANGE HERE: Accept cartId as the first argument
  const removeProductFromCart = useCallback((cartId, productId) => {
    if (!cartId) return; // Ensure cartId is valid

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id === cartId) { // Use cartId to find the correct cart
        const updatedItems = cart.items.filter(item => item.product.id !== productId);
        const updatedTotal = updatedItems.reduce((sum, item) => sum + calcularSubtotalItem(item), 0);
        return { ...cart, items: updatedItems, total: updatedTotal };
      }
      return cart;
    }));
  }, []);

  // KEY CHANGE HERE: Accept cartId as the first argument
  const decrementProductQuantity = useCallback((cartId, productId) => {
    if (!cartId) return; // Ensure cartId is valid

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id === cartId) { // Use cartId to find the correct cart
        const existingItemIndex = cart.items.findIndex(item => item.product.id === productId);
        if (existingItemIndex === -1) return cart; 

        let updatedItems;
        let updatedTotal;

        if (cart.items[existingItemIndex].quantity > 1) {
          updatedItems = cart.items.map((item, index) => 
            index === existingItemIndex 
              ? { ...item, quantity: item.quantity - 1 }
              : item
          );
        } else {
          // If quantity is 1, remove the product from the cart
          updatedItems = cart.items.filter(item => item.product.id !== productId);
        }
        
        updatedTotal = updatedItems.reduce((sum, item) => sum + calcularSubtotalItem(item), 0);

        return { ...cart, items: updatedItems, total: updatedTotal };
      }
      return cart;
    }));
  }, []);

  // Setea la cantidad de un ítem directamente (en vez de sumar/restar de a 1) --
  // lo usan los productos "por peso", donde se tipea el peso en gramos en vez de
  // usar el stepper +/-.
  const setProductQuantityInCart = useCallback((cartId, productId, newQuantity) => {
    if (!cartId) return;

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id !== cartId) return cart;

      const existingItemIndex = cart.items.findIndex(item => item.product.id === productId);
      if (existingItemIndex === -1) return cart;

      if (newQuantity <= 0) {
        const updatedItems = cart.items.filter(item => item.product.id !== productId);
        const updatedTotal = updatedItems.reduce((sum, item) => sum + calcularSubtotalItem(item), 0);
        return { ...cart, items: updatedItems, total: updatedTotal };
      }

      const updatedItems = cart.items.map((item, index) =>
        index === existingItemIndex ? { ...item, quantity: newQuantity } : item
      );
      const updatedTotal = updatedItems.reduce((sum, item) => sum + calcularSubtotalItem(item), 0);
      return { ...cart, items: updatedItems, total: updatedTotal };
    }));
  }, []);

  // Descuento en % por línea del carrito (no por unidad): se aplica al total
  // de esa línea sin importar la cantidad cargada -- ver calcularSubtotalItem,
  // que lo resta del bruto (precio * cantidad).
  const setDescuentoItemEnCarrito = useCallback((cartId, productId, descuentoPorcentaje) => {
    if (!cartId) return;

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id !== cartId) return cart;

      const updatedItems = cart.items.map(item =>
        item.product.id === productId ? { ...item, descuentoItemPorcentaje: descuentoPorcentaje } : item
      );
      const updatedTotal = updatedItems.reduce((sum, item) => sum + calcularSubtotalItem(item), 0);
      return { ...cart, items: updatedItems, total: updatedTotal };
    }));
  }, []);

  const deleteCart = useCallback((cartIdToDelete) => {
    setCarts(prevCarts => {
      const remainingCarts = prevCarts.filter(cart => cart.id !== cartIdToDelete);
      
      // If the deleted cart was the active one
      if (activeCartId === cartIdToDelete) {
        if (remainingCarts.length > 0) {
          setActiveCartId(remainingCarts[0].id); // Select the first remaining cart
        } else {
          setActiveCartId(null); 
        }
      }
      return remainingCarts;
    });
  }, [activeCartId]);

  const finalizeCart = useCallback(async (cartId) => {
    console.log(`Simulating cart finalization: ${cartId}`);
    deleteCart(cartId);
  }, [deleteCart]);

  const activeCart = carts.find(cart => cart.id === activeCartId);

  // Sin useMemo, este objeto es nuevo en CADA render del provider -- y como
  // envuelve todo Punto de Venta, eso hacía re-renderizar a TODO componente
  // que use useSales() cada vez que cambiaba cualquier cosa acá, tuviera que
  // ver o no con lo que ese componente realmente usa. Ahora que las
  // funciones son estables (useCallback arriba), memoizar el objeto final
  // sirve de algo.
  const value = useMemo(() => ({
    carts,
    activeCart,
    activeCartId,
    createNewCart,
    selectCart,
    updateCartAlias,
    addProductToCart,
    removeProductFromCart,
    decrementProductQuantity,
    setProductQuantityInCart,
    setDescuentoItemEnCarrito,
    finalizeCart,
    deleteCart,
  }), [
    carts, activeCart, activeCartId, createNewCart, selectCart, updateCartAlias,
    addProductToCart, removeProductFromCart, decrementProductQuantity,
    setProductQuantityInCart, setDescuentoItemEnCarrito, finalizeCart, deleteCart,
  ]);

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  );
};
