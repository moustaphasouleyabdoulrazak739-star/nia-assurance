import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as loginRequest, fetchProfile } from '../api/auth';
import { getAccessToken, setTokens, clearTokens } from '../api/tokenStorage';
import { setUnauthorizedHandler } from '../api/authEvents';

const AuthContext = createContext(null);

// Équivalent mobile de frontend/src/context/AuthContext.jsx : même contrat
// (user, loading, login, logout) mais persistance via expo-secure-store à
// la place du localStorage du navigateur.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const profile = await fetchProfile();
      setUser(profile);
    } catch {
      await clearTokens();
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
    await setTokens({ access: data.access, refresh: data.refresh });
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    // Permet a l'intercepteur axios (mobile/src/api/client.js), hors de
    // l'arbre React, de forcer cette meme deconnexion quand le
    // rafraichissement du jeton echoue (refresh token expire/revoque).
    setUnauthorizedHandler(logout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
