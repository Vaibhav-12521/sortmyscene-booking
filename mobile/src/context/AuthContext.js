import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, apiError, TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await authApi.me();
        setUser(me);
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async ({ user: u, token }) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setUser(u);
  }, []);

  const login = useCallback(
    async (creds) => {
      try {
        await persist(await authApi.login(creds));
      } catch (e) {
        throw apiError(e);
      }
    },
    [persist]
  );

  const register = useCallback(
    async (body) => {
      try {
        await persist(await authApi.register(body));
      } catch (e) {
        throw apiError(e);
      }
    },
    [persist]
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
