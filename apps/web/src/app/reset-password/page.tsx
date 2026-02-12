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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                                    placeholder="Mínimo 8 caracteres"
                                    disabled={status === "loading"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="block text-sm font-medium text-text-black mb-1"
                            >
                                Confirmar contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                                    placeholder="Repite tu contraseña"
                                    disabled={status === "loading"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showConfirmPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
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
