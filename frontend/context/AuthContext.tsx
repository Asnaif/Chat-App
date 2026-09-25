"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export interface User {
  _id: string;
  fullName: string;
  email: string;
  profilePhoto?: string;
  bio?: string;
  isOnline?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    fullName: string,
    email: string,
    password: string,
    profilePhoto?: string
  ) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check saved session in localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("cm_chat_token");
      const storedUser = localStorage.getItem("cm_chat_user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("Failed to restore auth session:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Attempt real backend call first
      try {
        const response = await axios.post(
          `${API_URL}/api/auth/login`,
          { email: email.toLowerCase().trim(), password },
          { timeout: 10000 }
        );

        const resData = response.data?.data || response.data;
        if (resData && resData.token) {
          const receivedToken = resData.token;
          const rawUser = resData.user;
          const receivedUser: User = {
            _id: rawUser.id || rawUser._id,
            fullName: rawUser.name || rawUser.fullName,
            email: rawUser.email,
            profilePhoto: rawUser.avatarUrl || rawUser.profilePhoto,
            bio: rawUser.about || rawUser.bio,
            isOnline: rawUser.status === 'online',
          };
          setToken(receivedToken);
          setUser(receivedUser);
          localStorage.setItem("cm_chat_token", receivedToken);
          localStorage.setItem("cm_chat_user", JSON.stringify(receivedUser));
          toast.success("Welcome back! Logged in successfully.");
          return true;
        }
        return false;
      } catch (networkError: any) {
        const msg =
          networkError.response?.data?.message ||
          networkError.response?.data?.error?.message ||
          (networkError.code === "ERR_NETWORK"
            ? "Cannot connect to Backend (port 5000). Please ensure server is running."
            : "Invalid email or password.");
        toast.error(msg);
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during login.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    profilePhoto?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      try {
        const response = await axios.post(
          `${API_URL}/api/auth/register`,
          { name: fullName.trim(), email: email.toLowerCase().trim(), password, profilePhoto },
          { timeout: 10000 }
        );

        const resData = response.data?.data || response.data;
        if (resData && resData.token) {
          const receivedToken = resData.token;
          const rawUser = resData.user;
          const receivedUser: User = {
            _id: rawUser.id || rawUser._id,
            fullName: rawUser.name || rawUser.fullName,
            email: rawUser.email,
            profilePhoto: rawUser.avatarUrl || rawUser.profilePhoto,
            bio: rawUser.about || rawUser.bio,
            isOnline: rawUser.status === 'online',
          };
          setToken(receivedToken);
          setUser(receivedUser);
          localStorage.setItem("cm_chat_token", receivedToken);
          localStorage.setItem("cm_chat_user", JSON.stringify(receivedUser));
          toast.success("Account created successfully in MongoDB!");
          return true;
        }
        return false;
      } catch (networkError: any) {
        const msg =
          networkError.response?.data?.message ||
          networkError.response?.data?.error?.message ||
          (networkError.code === "ERR_NETWORK"
            ? "Cannot connect to Backend (port 5000). Please ensure server is running."
            : "Failed to register. Please check your details.");
        toast.error(msg);
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during registration.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("cm_chat_token");
    localStorage.removeItem("cm_chat_user");
    toast.success("Logged out successfully.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
