import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerStudent, getUserProfile } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('eventease_token'));
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('eventease_token');
      const storedUser = localStorage.getItem('eventease_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);

          // Verify token validity with backend
          const res = await getUserProfile();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('eventease_user', JSON.stringify(res.user));
          }
        } catch (error) {
          console.warn('[Auth] Session expired or invalid, clearing local state');
          localStorage.removeItem('eventease_token');
          localStorage.removeItem('eventease_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Log in user with email and password
   */
  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    if (data.success && data.token) {
      localStorage.setItem('eventease_token', data.token);
      localStorage.setItem('eventease_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  /**
   * Register a new student account
   */
  const register = async (userData) => {
    const data = await registerStudent(userData);
    if (data.success && data.token) {
      localStorage.setItem('eventease_token', data.token);
      localStorage.setItem('eventease_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  /**
   * Log out user and clear stored state
   */
  const logout = () => {
    localStorage.removeItem('eventease_token');
    localStorage.removeItem('eventease_user');
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'Admin',
    isStudent: user?.role === 'Student',
    loading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to consume the AuthContext
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

