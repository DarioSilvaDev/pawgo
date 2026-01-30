"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { influencerAPI } from "@/lib/auth";
import { useToast } from "@/components/ui/useToast";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  socialMedia?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ProfileView() {
  const { user, isInfluencer } = useAuth();
  const { showToast, ToastView } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isInfluencer) {
      loadProfile();
    } else {
      // For admin or other users, use auth data
      if (user) {
        setProfile({
          id: user.id,
          name: user.name || "Usuario",
          email: user.email,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setLoading(false);
      }
    }
  }, [user, isInfluencer]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await influencerAPI.getProfile();
      setProfile(data);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al cargar el perfil",
        durationMs: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isInfluencer) {
      loadProfile();
    } else {
      // For admin or other users, use auth data
      if (user) {
        setProfile({
          id: user.id,
          name: user.name || "Usuario",
          email: user.email,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setLoading(false);
      }
    }
  }, [user, isInfluencer, loadProfile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSocialMediaIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: "📷",
      tiktok: "🎵",
      youtube: "▶️",
      facebook: "👥",
    };
    return icons[platform.toLowerCase()] || "🔗";
  };

  if (loading) {
    return (
      <>
        {ToastView}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise"></div>
        </div>
      </>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {ToastView}
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gestiona tu información personal y preferencias
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-turquoise to-primary-turquoise-dark px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-primary-turquoise text-2xl font-bold shadow-lg">
              {profile.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
              <p className="text-primary-turquoise-light text-sm mt-1">
                {profile.email}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información Personal
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
              </div>
              {profile.phone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Teléfono
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {profile.phone}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      profile.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {profile.isActive ? "Activo" : "Inactivo"}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Social Media */}
          {isInfluencer && profile.socialMedia && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Redes Sociales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(profile.socialMedia).map(([platform, value]) =>
                  value ? (
                    <div
                      key={platform}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="text-2xl">
                        {getSocialMediaIcon(platform)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-500 capitalize">
                          {platform}
                        </p>
                        <p className="text-sm text-gray-900 truncate">
                          {String(value)}
                        </p>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
              {Object.values(profile.socialMedia).every((v) => !v) && (
                <p className="text-sm text-gray-500">
                  No hay redes sociales configuradas
                </p>
              )}
            </div>
          )}

          {/* Account Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información de la Cuenta
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Cuenta creada
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(profile.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Última actualización
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(profile.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
