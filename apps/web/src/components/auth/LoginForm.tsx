"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { LoginDto } from "@pawgo/shared";
import { useToast } from "@/components/ui/useToast";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const { showToast, ToastView } = useToast();
  const [formData, setFormData] = useState<LoginDto>({
    email: "",
    password: "",
    deviceInfo: typeof window !== "undefined" ? navigator.userAgent : undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(formData);
      router.push("/dashboard");
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al iniciar sesión",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {ToastView}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-text-dark-gray mb-2"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="input-field"
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-text-dark-gray mb-2"
        >
          Contraseña <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
          className="input-field"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>
    </form>
  );
}

