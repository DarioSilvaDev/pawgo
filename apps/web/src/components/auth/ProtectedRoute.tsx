"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@pawgo/shared";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo);
        return;
      }

      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const userRole = user.role as UserRole;
        
        if (!roles.includes(userRole)) {
          router.push("/dashboard"); // Redirect to dashboard if wrong role
          return;
        }
      }
    }
  }, [user, loading, requiredRole, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-dark-gray">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userRole = user.role as UserRole;
    
    if (!roles.includes(userRole)) {
      return null; // Will redirect
    }
  }

  return <>{children}</>;
}

