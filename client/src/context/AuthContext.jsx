import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('skillduels_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on mount (NFR-03)
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('skillduels_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.getMe();
        if (response.success && response.user) {
          setUser(response.user);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session expired or invalid, clearing local credentials.');
        logout();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await authAPI.login({ email, password });
      if (response.success && response.token) {
        localStorage.setItem('skillduels_token', response.token);
        setToken(response.token);
        setUser(response.user);
        return response.user;
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    }
  };

  const register = async (username, email, password, role = 'player') => {
    setError(null);
    try {
      const response = await authAPI.register({ username, email, password, role });
      if (response.success && response.token) {
        localStorage.setItem('skillduels_token', response.token);
        setToken(response.token);
        setUser(response.user);
        return response.user;
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('skillduels_token');
    setToken(null);
    setUser(null);
  };

  const updateProfileXP = (newXP, newRank) => {
    setUser((prev) => (prev ? { ...prev, xp: newXP, ...(newRank && { rank: newRank }) } : prev));
  };

  const updateUser = (updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        updateUser,
        updateProfileXP,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
