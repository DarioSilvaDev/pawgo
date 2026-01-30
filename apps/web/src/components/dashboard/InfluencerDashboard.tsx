"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { influencerAPI } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/useToast";

interface DashboardData {
  influencer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    socialMedia?: Record<string, unknown>;
    isActive: boolean;
  };
  summary: {
    totalOrders: number;
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
    activeCodes: number;
    totalCodes: number;
  };
  recentCommissions: Array<{
    id: string;
    orderId: string;
    orderDate: string;
    orderTotal: number;
    discountAmount: number;
    commissionAmount: number;
    status: string;
    paidAt?: string;
  }>;
  discountCodes: Array<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    usedCount: number;
    maxUses?: number;
    isActive: boolean;
    validUntil?: string;
  }>;
}

export function InfluencerDashboard() {
  const { user } = useAuth();
  const { showToast, ToastView } = useToast();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await influencerAPI.getDashboard();
      setDashboard(data);
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al cargar el dashboard",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    // Backend stores `validUntil` as end-of-day Argentina time (as UTC timestamp).
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-dark-gray">Cargando dashboard...</div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      {ToastView}
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Resumen de tus comisiones y códigos de descuento
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Total Generado
              </h3>
              <p className="text-3xl font-bold text-primary-turquoise">
                {formatCurrency(dashboard.summary.totalCommission)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-turquoise/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Suma total de todas tus comisiones generadas
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Pendiente
              </h3>
              <p className="text-3xl font-bold text-amber-600">
                {formatCurrency(dashboard.summary.pendingCommission)}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Comisiones generadas que aún no han sido pagadas
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Pagado</h3>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(dashboard.summary.paidCommission)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Total de comisiones que ya has recibido
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Total Ventas
              </h3>
              <p className="text-3xl font-bold text-gray-900">
                {dashboard.summary.totalOrders}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Número total de pedidos realizados con tus códigos
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Commissions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Comisiones Recientes
          </h2>
          {dashboard.recentCommissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay comisiones aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.recentCommissions.map((commission) => (
                <div
                  key={commission.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        Orden #{commission.orderId.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(commission.orderDate)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        commission.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : commission.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {commission.status === "paid"
                        ? "Pagado"
                        : commission.status === "pending"
                        ? "Pendiente"
                        : "Cancelado"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-600">
                      Total: {formatCurrency(commission.orderTotal)}
                    </span>
                    <span className="font-bold text-primary-turquoise">
                      Comisión: {formatCurrency(commission.commissionAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount Codes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Códigos de Descuento
          </h2>
          {dashboard.discountCodes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No tienes códigos de descuento aún
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.discountCodes.map((code) => (
                <div
                  key={code.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-mono font-bold text-lg text-primary-turquoise">
                        {code.code}
                      </p>
                      <p className="text-sm text-gray-600">
                        {code.discountType === "percentage"
                          ? `${code.discountValue}% de descuento`
                          : `${formatCurrency(
                              code.discountValue
                            )} de descuento`}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        code.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {code.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 pt-2 border-t border-gray-100">
                    <p>
                      Usos: {code.usedCount}
                      {code.maxUses && ` / ${code.maxUses}`}
                    </p>
                    {code.validUntil && (
                      <p className="mt-1">
                        Válido hasta: {formatDate(code.validUntil)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
