import axios from 'axios';

export const TOKEN_KEY = 'cg_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const saveToken = (token, remember) => {
  clearToken();
  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch { /* storage blocked */ }
};
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* storage blocked */ }
};

const api = axios.create({ baseURL: (import.meta.env.VITE_API_URL || '') + '/api' });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.startsWith('/auth/login')) {
      clearToken();
      if (!['/login', '/signup', '/forgot-password', '/reset-password'].includes(window.location.pathname)) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e, fallback = 'Something went wrong. Please try again') =>
  e?.response?.data?.message || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running on port 5000?' : fallback);

export default api;
