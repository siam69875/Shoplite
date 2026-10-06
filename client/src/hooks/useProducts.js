import { useEffect, useState } from 'react';
import { api, isAbort, queryString } from '../api.js';

/** Fetches /products with the given filters. Stale requests are aborted when filters change. */
export function useProducts(filters) {
  const qs = queryString(filters);
  const [state, setState] = useState({ products: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api(`/products?${qs}`, { signal: controller.signal })
      .then((d) => setState({ products: d.products, loading: false, error: null }))
      .catch((e) => { if (!isAbort(e)) setState({ products: [], loading: false, error: e.message }); });
    return () => controller.abort();
  }, [qs]);

  return state;
}
