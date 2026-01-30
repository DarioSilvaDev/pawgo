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
        <input
          type="password"
          id="password"
          value={baseData.password}
          onChange={(e) =>
            setBaseData({ ...baseData, password: e.target.value })
          }
          required
          minLength={8}
          className="input-field"
          placeholder="Mínimo 8 caracteres"
        />
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
        <input
          type="password"
          id="confirmPassword"
          value={baseData.confirmPassword}
          onChange={(e) =>
            setBaseData({ ...baseData, confirmPassword: e.target.value })
          }
          required
          className="input-field"
          placeholder="Repite tu contraseña"
        />
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

