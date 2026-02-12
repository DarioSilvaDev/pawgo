"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { RegisterDto, RegisterAdminDto, RegisterInfluencerDto } from "@pawgo/shared";
import { useToast } from "@/components/ui/useToast";

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const { showToast, ToastView } = useToast();
  const [userType, setUserType] = useState<"admin" | "influencer">("influencer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Base form data
  const [baseData, setBaseData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    deviceInfo: typeof window !== "undefined" ? navigator.userAgent : undefined,
  });

  // Admin specific
  const [adminData, setAdminData] = useState({
    name: "",
  });

  // Influencer specific
  const [influencerData, setInfluencerData] = useState({
    name: "",
    phone: "",
    instagram: "",
    tiktok: "",
    youtube: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate passwords match
    if (baseData.password !== baseData.confirmPassword) {
      showToast({ type: "error", message: "Las contraseñas no coinciden" });
      setIsSubmitting(false);
      return;
    }

    try {
      let registerData: RegisterDto;

      if (userType === "admin") {
        registerData = {
          userType: "admin",
          email: baseData.email,
          password: baseData.password,
          name: adminData.name,
          deviceInfo: baseData.deviceInfo,
        } as RegisterAdminDto;
      } else {
        const socialMedia: Record<string, string> = {};
        if (influencerData.instagram) socialMedia.instagram = influencerData.instagram;
        if (influencerData.tiktok) socialMedia.tiktok = influencerData.tiktok;
        if (influencerData.youtube) socialMedia.youtube = influencerData.youtube;

        registerData = {
          userType: "influencer",
          email: baseData.email,
          password: baseData.password,
          name: influencerData.name,
          phone: influencerData.phone || undefined,
          socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : undefined,
          deviceInfo: baseData.deviceInfo,
        } as RegisterInfluencerDto;
      }

      const result = await register(registerData);
      // Show success message and redirect to email verification page
      showToast({
        type: "success",
        message:
          result.message || "Registro exitoso. Por favor verifica tu email.",
      });
      // Don't redirect to dashboard - user needs to verify email first
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al registrarse",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {ToastView}

      {/* User Type Selection */}
      <div>
        <label className="block text-sm font-medium text-text-dark-gray mb-2">
          Tipo de cuenta <span className="text-red-500">*</span>
        </label>
        <select
          value={userType}
          onChange={(e) =>
            setUserType(e.target.value as "admin" | "influencer")
          }
          className="input-field"
        >
          <option value="influencer">Influencer</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      {/* Common fields */}
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
          value={baseData.email}
          onChange={(e) =>
            setBaseData({ ...baseData, email: e.target.value })
          }
          required
          className="input-field"
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-text-dark-gray mb-2"
        >
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={
            userType === "admin" ? adminData.name : influencerData.name
          }
          onChange={(e) => {
            if (userType === "admin") {
              setAdminData({ ...adminData, name: e.target.value });
            } else {
              setInfluencerData({ ...influencerData, name: e.target.value });
            }
          }}
          required
          className="input-field"
          placeholder="Tu nombre"
        />
      </div>

      {/* Influencer specific fields */}
      {userType === "influencer" && (
        <>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-text-dark-gray mb-2"
            >
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              value={influencerData.phone}
              onChange={(e) =>
                setInfluencerData({ ...influencerData, phone: e.target.value })
              }
              className="input-field"
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark-gray mb-2">
              Redes Sociales (opcional)
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={influencerData.instagram}
                onChange={(e) =>
                  setInfluencerData({
                    ...influencerData,
                    instagram: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Instagram: @username"
              />
              <input
                type="text"
                value={influencerData.tiktok}
                onChange={(e) =>
                  setInfluencerData({
                    ...influencerData,
                    tiktok: e.target.value,
                  })
                }
                className="input-field"
                placeholder="TikTok: @username"
              />
              <input
                type="text"
                value={influencerData.youtube}
                onChange={(e) =>
                  setInfluencerData({
                    ...influencerData,
                    youtube: e.target.value,
                  })
                }
                className="input-field"
                placeholder="YouTube: @username"
              />
            </div>
          </div>
        </>
      )}

      {/* Password fields */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-text-dark-gray mb-2"
        >
          Contraseña <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            value={baseData.password}
            onChange={(e) =>
              setBaseData({ ...baseData, password: e.target.value })
            }
            required
            minLength={8}
            className="input-field pr-10"
            placeholder="Mínimo 8 caracteres"
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
        <p className="text-xs text-text-dark-gray mt-1">
          Debe contener al menos: 8 caracteres, 1 mayúscula, 1 minúscula, 1
          número
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-text-dark-gray mb-2"
        >
          Confirmar Contraseña <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            value={baseData.confirmPassword}
            onChange={(e) =>
              setBaseData({ ...baseData, confirmPassword: e.target.value })
            }
            required
            className="input-field pr-10"
            placeholder="Repite tu contraseña"
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Registrando..." : "Registrarse"}
      </button>
    </form>
  );
}

