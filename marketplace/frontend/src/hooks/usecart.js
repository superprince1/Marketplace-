// src/hooks/useCart.js
import { useCart as useCartContext } from '../context/CartContext';

/**
 * Custom hook to access cart state and actions.
 * Requires CartProvider in component tree.
 */
const useCart = () => {
  const { state, dispatch } = useCartContext();
  const { items } = state;

  const addItem = (product, quantity = 1, selectedVariations = {}) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity, selectedVariations } });
  };

  const removeItem = (cartItemId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: cartItemId });
  };

  const updateQuantity = (cartItemId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { cartItemId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + (i.priceAtAdd || i.price) * i.quantity, 0);

  return {
    items,
    cartCount,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
};

export default useCart;