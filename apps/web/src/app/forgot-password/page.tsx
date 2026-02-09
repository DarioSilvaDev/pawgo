"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { authAPI } from "@/lib/auth";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setStatus("error");
            setMessage("Por favor ingresa tu email");
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const result = await authAPI.forgotPassword(email);
            setStatus("success");
            setMessage(result.message);
        } catch (error) {
            setStatus("error");
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Error al enviar el email. Por favor intenta nuevamente."
            );
        }
    };

    return (
        <div className="min-h-screen bg-background-light-gray flex items-center justify-center py-12 px-4">
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

                <h1 className="text-2xl font-bold text-text-black mb-2 text-center">
                    ¿Olvidaste tu contraseña?
                </h1>
                <p className="text-text-dark-gray text-center mb-6">
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>

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
                        <p className="text-text-dark-gray mb-6">{message}</p>
                        <Link
                            href="/login"
                            className="btn-primary block w-full text-center"
                        >
                            Volver a Iniciar Sesión
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-text-black mb-1"
                            >
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                                placeholder="tu@email.com"
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
                                    Enviando...
                                </>
                            ) : (
                                "Enviar enlace de recuperación"
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
                )}
            </div>
        </div>
    );
}
