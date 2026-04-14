"use client";
import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { authAPI, historyAPI, savedAPI } from "@/api/client";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  savedIds: Set<number>;
  watchedIds: Set<number>;
  addSavedId: (id: number) => void;
  addWatchedId: (id: number) => void;
  removeWatchedId: (id: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());

  const fetchUserData = useCallback(async () => {
    if (!token) return;
    try {
      const [historyData, savedData] = await Promise.all([
        historyAPI.getHistory(1, 1000).catch(() => ({ items: [] })),
        savedAPI.getSaved(1, 1000).catch(() => ({ items: [] }))
      ]);
      setWatchedIds(new Set(historyData.items?.map((m: any) => m.tmdbId) || []));
      setSavedIds(new Set(savedData.items?.map((m: any) => m.tmdbId) || []));
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      authAPI.getProfile()
        .then((profile) => {
          setUser(profile);
          fetchUserData();
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setSavedIds(new Set());
      setWatchedIds(new Set());
    }
  }, [token, fetchUserData]);

  const login = async (email: string, password: string) => {
    const result = await authAPI.login(email, password);
    localStorage.setItem('token', result.token);
    setToken(result.token);
    setUser(result.user);
    // Explicitly refetch lists upon discrete login to maintain synchroneity
    await fetchUserData();
  };

  const register = async (name: string, email: string, password: string) => {
    const result = await authAPI.register(name, email, password);
    localStorage.setItem('token', result.token);
    setToken(result.token);
    setUser(result.user);
    await fetchUserData();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSavedIds(new Set());
    setWatchedIds(new Set());
  };

  const addSavedId = (id: number) => setSavedIds(prev => new Set([...prev, id]));
  const addWatchedId = (id: number) => setWatchedIds(prev => new Set([...prev, id]));
  const removeWatchedId = (id: number) => setWatchedIds(prev => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading, savedIds, watchedIds, addSavedId, addWatchedId, removeWatchedId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

