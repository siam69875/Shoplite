import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!tokenStore.get()) return setCartCount(0);
    try {
      const { cart } = await api('/cart');
      setCartCount(cart.items.reduce((n, i) => n + i.quantity, 0));
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then(({ user }) => { setUser(user); refreshCart(); })
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [refreshCart]);

  const signIn = useCallback(({ token, user }) => {
    tokenStore.set(token);
    setUser(user);
    refreshCart();
  }, [refreshCart]);

  const signOut = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* already gone */ }
    tokenStore.clear();
    setUser(null);
    setCartCount(0);
  }, []);

  return (
    <SessionContext.Provider value={{ user, setUser, loading, cartCount, refreshCart, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
