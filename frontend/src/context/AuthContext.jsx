import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fraudshield_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('fraudshield_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          localStorage.setItem('fraudshield_user', JSON.stringify(profile));
        } catch (err) {
          console.error("Token verification failed", err);
          logout();
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    const userInfo = {
      username: res.username,
      role: res.role,
      full_name: res.full_name,
    };
    localStorage.setItem('fraudshield_token', res.access_token);
    localStorage.setItem('fraudshield_user', JSON.stringify(userInfo));
    setToken(res.access_token);
    setUser(userInfo);
    return userInfo;
  };

  const logout = () => {
    localStorage.removeItem('fraudshield_token');
    localStorage.removeItem('fraudshield_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
