"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authAPI } from "@/lib/auth";

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validations
        if (!token) {
            setStatus("error");
            setMessage("Token de recuperación no encontrado");
            return;
        }

        if (!password || !confirmPassword) {
            setStatus("error");
            setMessage("Por favor completa todos los campos");
            return;
        }

        if (password.length < 8) {
            setStatus("error");
            setMessage("La contraseña debe tener al menos 8 caracteres");
            return;
        }

        if (password !== confirmPassword) {
            setStatus("error");
            setMessage("Las contraseñas no coinciden");
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const result = await authAPI.resetPassword(token, password);
            setStatus("success");
            setMessage(result.message);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        } catch (error) {
            setStatus("error");
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Error al restablecer la contraseña. Por favor intenta nuevamente."
            );
        }
    };

    // No token provided
    if (!token) {
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
                        Enlace inválido
                    </h2>
                    <p className="text-text-dark-gray mb-6">
                        El enlace de recuperación no es válido o ha expirado.
                    </p>
                    <Link href="/forgot-password" className="btn-primary block w-full text-center">
                        Solicitar nuevo enlace
                    </Link>
                </div>
            </div>
        );
    }

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

            {status === "success" ? (
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
                        ¡Contraseña restablecida!
                    </h2>
                    <p className="text-text-dark-gray mb-6">{message}</p>
                    <p className="text-sm text-text-dark-gray">
                        Redirigiendo a inicio de sesión...
                    </p>
                </div>
            ) : (
                <>
                    <h1 className="text-2xl font-bold text-text-black mb-2 text-center">
                        Restablecer contraseña
                    </h1>
                    <p className="text-text-dark-gray text-center mb-6">
                        Ingresa tu nueva contraseña
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-text-black mb-1"
                            >
                                Nueva contraseña
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                                placeholder="Mínimo 8 caracteres"
                                disabled={status === "loading"}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="block text-sm font-medium text-text-black mb-1"
                            >
                                Confirmar contraseña
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                                placeholder="Repite tu contraseña"
                                disabled={status === "loading"}
                            />
                        </div>

                        {status === "error" && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                <p className="text-red-700 text-sm">{message}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="btn-primary w-full flex items-center justify-center"
                        >
                            {status === "loading" ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Restableciendo...
                                </>
                            ) : (
                                "Restablecer contraseña"
                            )}
                        </button>

                        <div className="text-center mt-4">
                            <Link
                                href="/login"
                                className="text-primary-turquoise hover:underline text-sm"
                            >
                                ← Volver a Iniciar Sesión
                            </Link>
                        </div>
                    </form>
                </>
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

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-background-light-gray flex items-center justify-center py-12 px-4">
            <Suspense fallback={<LoadingFallback />}>
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
