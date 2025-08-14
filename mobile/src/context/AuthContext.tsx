import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, logout as apiLogout, User } from '../api/auth';
import { getAccessToken } from '../api/http';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  tokenReady: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const email = await SecureStore.getItemAsync('email');
        if (token && email) {
          setUser({ _id: 'unknown', email });
          setTokenReady(true);
        } else {
          setUser(null);
          setTokenReady(false);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, senha: string) {
    const u = await apiLogin(email, senha);
    setUser(u);
    setTokenReady(true); // <- garante que o token já está salvo
  }

  async function logout() {
    await apiLogout();
    setUser(null);
    setTokenReady(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, tokenReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
