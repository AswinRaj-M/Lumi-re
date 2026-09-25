"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type User } from "firebase/auth";
import {
  subscribeToAdminAuth,
  loginAdmin,
  logoutAdmin,
  type AdminAuthResult,
} from "@/backend";

interface AdminAuthContextType {
  adminUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<AdminAuthResult>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToAdminAuth((user) => {
      setAdminUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<AdminAuthResult> => {
    setIsLoading(true);
    const result = await loginAdmin(email, pass);
    setIsLoading(false);
    return result;
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    await logoutAdmin();
    setAdminUser(null);
    setIsLoading(false);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isLoading,
        isAuthenticated: !!adminUser,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
