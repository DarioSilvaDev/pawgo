"use client";

import { AuthProvider as BaseAuthProvider } from "@/contexts/AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <BaseAuthProvider>{children}</BaseAuthProvider>;
}

