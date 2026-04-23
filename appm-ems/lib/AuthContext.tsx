"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface UserPayload {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "TECHNICIAN";
  mustChangePassword: boolean;
}

interface AuthContextProps {
  user: UserPayload | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isTechnician: boolean;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  refreshSession: async () => {},
  logout: async () => {},
  isAdmin: false,
  isTechnician: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshSession = async () => {
    try {
      const res = await fetch("/telxius/api/auth/me/");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setUser(data.user);
        } else {
          console.warn("Auth check returned non-JSON response:", await res.text());
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/telxius/api/auth/logout/", { method: "POST" });
    setUser(null);
    window.location.href = "/telxius/login/";
  };

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshSession,
        logout,
        isAdmin: user?.role === "ADMIN",
        isTechnician: user?.role === "TECHNICIAN" || !user, // fallback a restrictivo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
