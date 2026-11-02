import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { clearToken, getToken, saveToken } from '../api/axios.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refresh = useCallback(async () => {
    const { data } = await api.get('/users/me');
    setUser(data.user);
    setStats(data.stats);
    return data;
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    refresh().catch(() => clearToken()).finally(() => setLoading(false));
  }, [refresh]);

  const login = async (email, password, remember) => {
    const { data } = await api.post('/auth/login', { email, password, remember });
    saveToken(data.token, remember);
    setUser(data.user);
    await refresh().catch(() => {});
    return data.user;
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setStats(null);
  };

  return (
    <AuthCtx.Provider value={{ user, stats, loading, login, logout, refresh, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}
