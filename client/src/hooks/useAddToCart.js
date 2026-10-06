import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { useToast } from '../toast.jsx';

/** Returns addToCart(product, quantity) → true on success. Guests are sent to the login page. */
export function useAddToCart() {
  const { user, refreshCart } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(async (product, quantity = 1) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return false;
    }
    try {
      await api('/cart/items', { method: 'POST', body: { productId: product.id, quantity } });
      await refreshCart();
      toast(`${quantity} × ${product.name} added to cart`, { icon: product.image });
      return true;
    } catch (e) {
      toast(e.message, { type: 'error' });
      return false;
    }
  }, [user, refreshCart, toast, navigate, location]);
}
