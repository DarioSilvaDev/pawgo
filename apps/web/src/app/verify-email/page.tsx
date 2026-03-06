"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveAuthData } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const token = searchParams.get("token");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token de verificación no encontrado");
        return;
      }

      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(
          `${API_URL}/api/auth/verify-email?token=${token}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            error: "Error al verificar el email",
          }));
          throw new Error(error.error || "Error al verificar el email");
        }

        const result = await response.json();

        // If tokens are returned, save them
        if (result.accessToken && result.refreshToken) {
          saveAuthData({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            user: result.user,
          });
        }

        setStatus("success");
        setMessage(result.message || "Email verificado correctamente");

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Error al verificar el email. Por favor, intenta nuevamente."
        );
      }
    };

    verifyEmail();
  }, [token, router, saveAuthData]);

  return (
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      {/* Logo */}
      <div className="w-full flex justify-center mb-6">
        <div className="relative w-48 h-16">
          <Image
            src="/images/PawGo.svg"
            alt="PawGo Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {status === "loading" && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-text-black mb-2">
            Verificando email...
          </h2>
          <p className="text-text-dark-gray">
            Por favor espera mientras verificamos tu email.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-black mb-2">
            ¡Email Verificado!
          </h2>
          <p className="text-text-dark-gray mb-6">{message}</p>
          <p className="text-sm text-text-dark-gray">
            Redirigiendo al dashboard...
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-black mb-2">
            Error de Verificación
          </h2>
          <p className="text-text-dark-gray mb-6">{message}</p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="btn-primary block w-full text-center"
            >
              Ir a Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="btn-secondary block w-full text-center"
            >
              Volver a Registro
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <div className="w-full flex justify-center mb-6">
        <div className="relative w-48 h-16">
          <Image
            src="/images/PawGo.svg"
            alt="PawGo Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-text-black mb-2">
          Cargando...
        </h2>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background-light-gray flex items-center justify-center py-12 px-4">
      <Suspense fallback={<LoadingFallback />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
