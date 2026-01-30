"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createInfluencer,
  getInfluencerById,
  updateInfluencer,
  type CreateInfluencerDto,
  type UpdateInfluencerDto,
} from "@/lib/influencer";
import Link from "next/link";
import { useToast } from "@/components/ui/useToast";

interface InfluencerFormProps {
  influencerId?: string;
}

export function InfluencerForm({ influencerId }: InfluencerFormProps) {
  const router = useRouter();
  const { showToast, ToastView } = useToast();
  const [loading, setLoading] = useState(!!influencerId);
  const [saving, setSaving] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [twitter, setTwitter] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadInfluencer = useCallback(async () => {
    if (!influencerId) return;
    try {
      setLoading(true);
      const influencer = await getInfluencerById(influencerId);
      setName(influencer.name);
      setEmail(influencer.email);
      setPhone(influencer.phone || "");
      setIsActive(influencer.isActive);

      // Load social media
      if (influencer.socialMedia) {
        const sm = influencer.socialMedia as Record<string, string>;
        setInstagram(sm.instagram || "");
        setTiktok(sm.tiktok || "");
        setYoutube(sm.youtube || "");
        setTwitter(sm.twitter || "");
      }
    } catch (err) {
      console.error("Error loading influencer:", err);
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al cargar el influencer",
      });
    } finally {
      setLoading(false);
    }
  }, [influencerId, showToast]);

  useEffect(() => {
    if (influencerId) {
      loadInfluencer();
    }
  }, [influencerId, loadInfluencer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Build social media object
      const socialMedia: Record<string, string> = {};
      if (instagram) socialMedia.instagram = instagram;
      if (tiktok) socialMedia.tiktok = tiktok;
      if (youtube) socialMedia.youtube = youtube;
      if (twitter) socialMedia.twitter = twitter;

      if (influencerId) {
        // Update existing influencer
        const updateData: UpdateInfluencerDto = {
          name,
          phone: phone || undefined,
          socialMedia:
            Object.keys(socialMedia).length > 0 ? socialMedia : undefined,
          isActive,
        };
        await updateInfluencer(influencerId, updateData);
        showToast({
          type: "success",
          message: "Influencer actualizado correctamente",
        });
      } else {
        // Create new influencer
        if (!password || password.length < 8) {
          showToast({
            type: "error",
            message: "La contraseña debe tener al menos 8 caracteres",
          });
          setSaving(false);
          return;
        }
        const createData: CreateInfluencerDto = {
          email,
          password,
          name,
          phone: phone || undefined,
          socialMedia:
            Object.keys(socialMedia).length > 0 ? socialMedia : undefined,
        };
        await createInfluencer(createData);
        showToast({
          type: "success",
          message: "Influencer creado correctamente",
        });
      }

      // Give the user brief feedback before navigating away (consistent with other forms).
      setTimeout(() => {
        router.push("/dashboard/influencers");
      }, 1000);
    } catch (err) {
      console.error("Error saving influencer:", err);
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al guardar el influencer",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {ToastView}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <Link
            href="/dashboard/influencers"
            className="text-primary-turquoise hover:text-primary-turquoise/80 mb-4 inline-block"
          >
            ← Volver a Influencers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {influencerId ? "Editar Influencer" : "Nuevo Influencer"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!influencerId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {influencerId && (
                <p className="mt-1 text-xs text-gray-500">
                  El email no se puede modificar
                </p>
              )}
            </div>

            {!influencerId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo 8 caracteres
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +5491123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
              />
            </div>
          </div>

          {/* Social Media */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Redes Sociales (Opcional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@usuario"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TikTok
                </label>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@usuario"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  YouTube
                </label>
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="@canal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twitter/X
                </label>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@usuario"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {influencerId && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-primary-turquoise focus:ring-primary-turquoise"
                />
                <span className="text-sm font-medium text-gray-700">
                  Influencer activo
                </span>
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Link
              href="/dashboard/influencers"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-turquoise"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-turquoise rounded-lg hover:bg-primary-turquoise/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-turquoise disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? "Guardando..."
                : influencerId
                ? "Guardar Cambios"
                : "Crear Influencer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
