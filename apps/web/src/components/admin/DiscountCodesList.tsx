"use client";

import { useState, useEffect, useCallback } from "react";
import { discountCodeAPI } from "@/lib/discount-code";
import { DiscountCodeWithInfluencer } from "@/shared";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useToast } from "@/components/ui/useToast";

interface DiscountCodesListProps {
  /**
   * Any change to this value will force the list to reload from the API.
   * Useful after creating a new discount code without reloading the page.
   */
  refreshKey?: number;
}

export function DiscountCodesList({ refreshKey }: DiscountCodesListProps) {
  const [codes, setCodes] = useState<DiscountCodeWithInfluencer[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { showToast, ToastView } = useToast();
  const [filters, setFilters] = useState({
    isActive: undefined as boolean | undefined,
    code: "",
    codeType: undefined as string | undefined,
  });

  const loadCodes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await discountCodeAPI.getAll({
        isActive: filters.isActive,
        code: filters.code || undefined,
        codeType: filters.codeType,
      });
      setCodes(data);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al cargar códigos",
        durationMs: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [filters.code, filters.isActive, filters.codeType, showToast]);

  useEffect(() => {
    loadCodes();
  }, [loadCodes, refreshKey]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await discountCodeAPI.update(id, { isActive: !currentStatus });
      loadCodes();
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al actualizar código",
        durationMs: 6000,
      });
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar código",
      message: "¿Estás seguro de eliminar este código?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;

    try {
      await discountCodeAPI.delete(id);
      loadCodes();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al eliminar código";
      showToast({ type: "error", message: errorMessage, durationMs: 6000 });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "Sin expiración";
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  const getCodeTypeBadge = (codeType: string) => {
    if (codeType === "lead_reservation") {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Lead
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Influencer
      </span>
    );
  };

  if (loading && codes.length === 0) {
    return (
      <>
        {ToastView}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise"></div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {ConfirmDialog}
      {ToastView}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar por código
            </label>
            <input
              type="text"
              value={filters.code}
              onChange={(e) => setFilters({ ...filters, code: e.target.value })}
              className="input-field"
              placeholder="Código..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={
                filters.isActive === undefined
                  ? "all"
                  : filters.isActive
                    ? "active"
                    : "inactive"
              }
              onChange={(e) =>
                setFilters({
                  ...filters,
                  isActive:
                    e.target.value === "all"
                      ? undefined
                      : e.target.value === "active",
                })
              }
              className="input-field"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={filters.codeType || "all"}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  codeType: e.target.value === "all" ? undefined : e.target.value,
                })
              }
              className="input-field"
            >
              <option value="all">Todos</option>
              <option value="influencer">Influencer</option>
              <option value="lead_reservation">Lead</option>
            </select>
          </div>
        </div>
      </div>

      {/* Codes List */}
      {codes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No hay códigos de descuento</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Influencer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descuento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comisión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reserva
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Válido Hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {codes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-primary-turquoise">
                        {code.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCodeTypeBadge(code.codeType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.influencer ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {code.influencer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {code.influencer.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {code.discountType === "percentage"
                          ? `${code.discountValue}%`
                          : formatCurrency(code.discountValue)}
                      </div>
                      {code.minPurchase && (
                        <div className="text-xs text-gray-500">
                          Mín: {formatCurrency(code.minPurchase)}
                        </div>
                      )}
                    </td>
                    {/* Comisión */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.commissionType && code.commissionValue ? (
                        <div className="text-sm text-gray-900">
                          {code.commissionType === "percentage"
                            ? `${code.commissionValue}%`
                            : formatCurrency(code.commissionValue)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">—</span>
                      )}
                    </td>
                    {/* Reserva (lead data) */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.codeType === "lead_reservation" && (code.leadEmail || code.leadName) ? (
                        <div>
                          {code.leadName && (
                            <div className="text-sm font-medium text-gray-900">
                              {code.leadName}
                            </div>
                          )}
                          {code.leadEmail && (
                            <div className="text-sm text-gray-500">
                              {code.leadEmail}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {code.usedCount}
                      {code.maxUses && ` / ${code.maxUses}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(code.validUntil)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${code.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {code.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() =>
                            handleToggleActive(code.id, code.isActive)
                          }
                          className={`px-3 py-1 rounded text-xs ${code.isActive
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : "bg-green-100 text-green-800 hover:bg-green-200"
                            }`}
                        >
                          {code.isActive ? "Desactivar" : "Activar"}
                        </button>
                        {code.usedCount === 0 && (
                          <button
                            onClick={() => handleDelete(code.id)}
                            className="px-3 py-1 rounded text-xs bg-red-100 text-red-800 hover:bg-red-200"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
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
