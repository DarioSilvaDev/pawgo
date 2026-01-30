"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  LoginDto,
  RegisterDto,
  AuthResponse,
  UserRole,
} from "@pawgo/shared";
import {
  authAPI,
  getUser,
  clearAuthData,
  saveAuthData as saveAuthDataToStorage,
} from "@/lib/auth";

interface AuthContextType {
  user: AuthResponse["user"] | null;
  loading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<{ message: string; email: string }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
  saveAuthData: (data: AuthResponse) => void;
  isAdmin: boolean;
  isInfluencer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const savedUser = getUser();
      if (savedUser) {
        setUser(savedUser);
        // Verify token is still valid by calling /me
        try {
          const apiUser = await authAPI.getMe();
          if (apiUser) {
            setUser(apiUser);
          } else {
            clearAuthData();
            setUser(null);
          }
        } catch (error) {
          // Token expired, fetchAPI will handle refresh automatically
          // If refresh fails, user will be logged out
          clearAuthData();
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();

    // Listen for logout events (triggered when refresh fails)
    const handleLogout = () => {
      setUser(null);
      clearAuthData();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("auth:logout", handleLogout);
      return () => {
        window.removeEventListener("auth:logout", handleLogout);
      };
    }
  }, []);

  const login = async (data: LoginDto) => {
    const response = await authAPI.login(data);
    setUser(response.user);
  };

  const register = async (data: RegisterDto) => {
    const response = await authAPI.register(data);
    // Don't set user - registration only returns message and email
    // User must verify email first
    return response;
  };

  const saveAuthData = (data: AuthResponse) => {
    saveAuthDataToStorage(data);
    setUser(data.user);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const logoutAll = async () => {
    await authAPI.logoutAll();
    setUser(null);
  };

  const refreshUser = async () => {
    const savedUser = getUser();
    if (savedUser) {
      setUser(savedUser);
    } else {
      // Try to get from API
      const apiUser = await authAPI.getMe();
      if (apiUser) {
        setUser(apiUser);
      } else {
        clearAuthData();
        setUser(null);
      }
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN;
  const isInfluencer = user?.role === UserRole.INFLUENCER;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        logoutAll,
        refreshUser,
        saveAuthData,
        isAdmin,
        isInfluencer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

