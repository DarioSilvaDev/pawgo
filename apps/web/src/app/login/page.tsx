"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-dark-gray">Cargando...</div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background-light-gray flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-text-black mb-2 text-center">
          Iniciar Sesión
        </h1>
        <p className="text-text-dark-gray text-center mb-6">
          Ingresa a tu cuenta de PawGo
        </p>

        <LoginForm />

        <div className="mt-4 text-center">
          <Link
            href="/forgot-password"
            className="text-primary-turquoise hover:underline text-sm"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-text-dark-gray">
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="text-primary-turquoise hover:underline font-medium"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

