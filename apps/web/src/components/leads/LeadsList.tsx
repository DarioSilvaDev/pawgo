"use client";

import { useState, useEffect, useCallback } from "react";
import { getLeads, deleteLead, exportLeadsToCSV, type Lead } from "@/lib/lead";
import { notifyLeadsAvailability } from "@/lib/api";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useToast } from "@/components/ui/useToast";

export function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState(false);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { showToast, ToastView } = useToast();
  const [search, setSearch] = useState("");
  const [dogSizeFilter, setDogSizeFilter] = useState<string>("");

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const filters: {
        search?: string;
        dogSize?: string;
      } = {};
      if (search) filters.search = search;
      if (dogSizeFilter) filters.dogSize = dogSizeFilter;

      const data = await getLeads(filters);
      setLeads(data.leads);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al cargar leads",
        durationMs: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [dogSizeFilter, search, showToast]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar lead",
      message: "¿Estás seguro de que deseas eliminar este lead?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteLead(id);
      await loadLeads();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al eliminar lead",
      });
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportLeadsToCSV(leads);
      // Create blob with UTF-8 encoding including BOM
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `leads_${new Date().toISOString().split("T")[0]}-size-${dogSizeFilter || "all"
        }.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al exportar CSV",
      });
    }
  };

  const handleNotifyAvailability = async () => {
    const ok = await confirm({
      title: "Notificar disponibilidad",
      message: `¿Enviar notificación de disponibilidad a todos los leads no notificados? Cada lead recibirá un código de descuento único válido por 24 horas.`,
      confirmText: "Enviar Notificaciones",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    try {
      setNotifying(true);
      const result = await notifyLeadsAvailability();
      showToast({
        type: "success",
        message: `✅ ${result.count} notificaciones enviadas exitosamente`,
        durationMs: 5000,
      });
      // Reload leads to see updated notification status
      await loadLeads();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al enviar notificaciones",
        durationMs: 6000,
      });
    } finally {
      setNotifying(false);
    }
  };

  const getDogSizeLabel = (size?: string) => {
    const labels: Record<string, string> = {
      small: "Pequeño",
      medium: "Mediano",
      large: "Grande",
      extra_large: "Extra Grande",
    };
    return size ? labels[size] || size : "No especificado";
  };

  if (loading) {
    return (
      <>
        {ToastView}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise"></div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {ConfirmDialog}
      {ToastView}
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
          />
          <select
            value={dogSizeFilter}
            onChange={(e) => setDogSizeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
          >
            <option value="">Todos los tamaños</option>
            <option value="small">Pequeño</option>
            <option value="medium">Mediano</option>
            <option value="large">Grande</option>
            <option value="extra_large">Extra Grande</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-primary-turquoise text-white rounded-lg hover:bg-primary-turquoise/90 transition-colors"
          >
            Exportar CSV
          </button>
          <button
            onClick={handleNotifyAvailability}
            disabled={notifying || leads.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {notifying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Enviando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Notificar Disponibilidad
              </>
            )}
          </button>
        </div>
      </div>

      {/* Leads Table */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No hay leads registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamaño de Perro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Registro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDogSizeLabel(lead.dogSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
