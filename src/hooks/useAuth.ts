import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

interface User {
  idu: number;
  nick: string;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a token and fetch user info
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('[useAuth] Initial state - Token found:', !!token);
    
    if (token) {
    api.get('/api/v1/auth/me')
        .then((res) => {
          console.log('[useAuth] User info fetched:', res.data);
          setUser(res.data);
        })
        .catch((_ignored) => {
          console.error('[useAuth] Failed to fetch user info, clearing token');
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      console.log('[useAuth] No token in localStorage - not authenticated');
      setLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (nick: string, password: string) => {
    try {
      console.log('[useAuth] Attempting login for user:', nick);
      
      const formData = new URLSearchParams({ username: nick, password }).toString();
      const res = await api.post('/api/v1/auth/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      console.log('[useAuth] Login successful, storing token');
      localStorage.setItem('token', res.data.access_token);
      
      // Fetch user info with the new token
      const me = await api.get('/api/v1/auth/me');
      setUser(me.data);
      console.log('[useAuth] User set:', me.data);
      
      return res;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } };
      if (axiosErr.response?.status === 401 || axiosErr.response?.status === 422) {
        console.error('[useAuth] Login failed - invalid credentials');
        throw new Error('Invalid credentials');
      } else {
        console.error('[useAuth] Login error:', err);
        throw err;
      }
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}
