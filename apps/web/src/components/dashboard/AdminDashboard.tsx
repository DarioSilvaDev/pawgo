"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardStats, type DashboardStats } from "@/lib/analytics";
import { useToast } from "@/components/ui/useToast";

export function AdminDashboard() {
  const { showToast, ToastView } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al cargar estadísticas",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {ToastView}
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Panel de Administración
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Resumen general del negocio
        </p>
      </div>

      {/* Main Metrics - Sales & Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Ingresos Totales
              </h3>
              <p className="text-2xl font-bold text-primary-turquoise">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-turquoise/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Suma total de todos los ingresos generados por las ventas
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Pedidos Totales
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalSales}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.completedOrders} completados · {stats.pendingOrders}{" "}
                pendientes
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Número total de pedidos realizados en el sistema
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Comisiones Pagadas
              </h3>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.paidCommissionAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.paidCommissions} pagos
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Total de comisiones que ya han sido pagadas a los influencers
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Comisiones Pendientes
              </h3>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(stats.pendingCommissionAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.pendingCommissions} pendientes
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
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/dashboard/influencers"
          className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary-turquoise transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Influencers
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeInfluencers}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalInfluencers} totales
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Número de influencers activos en la plataforma
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </Link>

        <Link
          href="/dashboard/discount-codes"
          className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary-turquoise transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Códigos Activos
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeDiscountCodes}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalCodeUses} usos totales
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎟️</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Códigos de descuento actualmente activos y disponibles
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </Link>

        <Link
          href="/dashboard/leads"
          className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary-turquoise transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Leads</h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalLeads}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.recentLeads} recientes
              </p>
            </div>
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Total de clientes potenciales registrados
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </Link>

        <Link
          href="/dashboard/influencer-payments"
          className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary-turquoise transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Pagos Pendientes
              </h3>
              <p className="text-2xl font-bold text-amber-600">
                {stats.pendingPayments}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(stats.totalPendingAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💸</span>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs text-center">
            Solicitudes de pago pendientes de procesar
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </Link>
      </div>

      {/* Top Influencers */}
      {stats.topInfluencers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Top Influencers</h2>
            <Link
              href="/dashboard/influencers"
              className="text-sm text-primary-turquoise hover:text-primary-turquoise/80"
            >
              Ver todos →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.topInfluencers.slice(0, 5).map((influencer, index) => (
              <div
                key={influencer.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-primary-turquoise/10 rounded-full flex items-center justify-center text-primary-turquoise font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {influencer.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {influencer.totalSales} ventas ·{" "}
                      {formatCurrency(influencer.totalCommissions)} comisiones
                    </p>
                  </div>
                </div>
                {influencer.pendingCommissions > 0 && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                    {formatCurrency(influencer.pendingCommissions)} pendiente
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
