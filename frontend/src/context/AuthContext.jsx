import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/endpoints.js';
import { tokenStore, toApiError } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await authApi.me();
        if (active) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const handleAuth = useCallback(({ user: u, token }) => {
    tokenStore.set(token);
    setUser(u);
  }, []);

  const login = useCallback(
    async (credentials) => {
      try {
        handleAuth(await authApi.login(credentials));
      } catch (error) {
        throw toApiError(error);
      }
    },
    [handleAuth]
  );

  const register = useCallback(
    async (payload) => {
      try {
        handleAuth(await authApi.register(payload));
      } catch (error) {
        throw toApiError(error);
      }
    },
    [handleAuth]
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
