const TOKEN_KEY = 'shoplite_token';

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    signal,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error?.code, data.error?.message ?? 'Request failed');
  return data;
}

export const isAbort = (err) => err?.name === 'AbortError';

export const CURRENCY = '৳';

// Bangladeshi Taka with lakh/crore grouping: ৳1,00,000
export const money = (amount) => {
  // Never disguise a missing amount as ৳0: that hides API bugs.
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '৳—';
  return `${amount < 0 ? '-' : ''}${CURRENCY}${Math.abs(amount).toLocaleString('en-IN')}`;
};

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export function queryString(params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== false) qs.set(key, String(value));
  }
  return qs.toString();
}
