"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getAllInfluencers,
  deleteInfluencer,
  type Influencer,
} from "@/lib/influencer";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useToast } from "@/components/ui/useToast";

export function InfluencersList() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { showToast, ToastView } = useToast();

  const loadInfluencers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllInfluencers();
      setInfluencers(data);
    } catch (err) {
      console.error("Error loading influencers:", err);
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al cargar influencers",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInfluencers();
  }, [loadInfluencers]);

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Desactivar influencer",
      message: `¿Estás seguro de que deseas desactivar al influencer "${name}"?`,
      confirmText: "Sí, desactivar",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteInfluencer(id);
      showToast({
        type: "success",
        message: "Influencer desactivado correctamente",
      });
      loadInfluencers();
    } catch (err) {
      console.error("Error deleting influencer:", err);
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al desactivar influencer",
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // Importar updateInfluencer dinámicamente si es necesario
      const { updateInfluencer } = await import("@/lib/influencer");
      await updateInfluencer(id, { isActive: !currentStatus });
      loadInfluencers();
    } catch (err) {
      console.error("Error updating influencer:", err);
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al actualizar influencer",
      });
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {ConfirmDialog}
      {ToastView}
      {influencers.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          No hay influencers registrados
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Verificado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Creación
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {influencers.map((influencer) => (
                <tr key={influencer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {influencer.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {influencer.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {influencer.phone || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() =>
                        handleToggleActive(influencer.id, influencer.isActive)
                      }
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        influencer.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      } transition-colors`}
                    >
                      {influencer.isActive ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        influencer.emailVerified
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {influencer.emailVerified ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(influencer.createdAt).toLocaleDateString(
                        "es-AR"
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/influencers/${influencer.id}`}
                        className="text-primary-turquoise hover:text-primary-turquoise/80"
                      >
                        Ver/Editar
                      </Link>
                      <button
                        onClick={() =>
                          handleDelete(influencer.id, influencer.name)
                        }
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
