import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as loginRequest, fetchProfile } from '../api/auth';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

// Équivalent mobile de frontend/src/context/AuthContext.jsx : même contrat
// (user, loading, login, logout) mais persistance via AsyncStorage au lieu
// du localStorage du navigateur.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const profile = await fetchProfile();
      setUser(profile);
    } catch {
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Chargement de la session au montage : meme pattern fetch-on-mount que
    // frontend/src/context/AuthContext.jsx (setLoading(false) appele au
    // premier tick de restoreSession, sans effet de bord reel malgre
    // l'avertissement react-hooks/set-state-in-effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, data.access],
      [REFRESH_TOKEN_KEY, data.refresh],
    ]);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
