"use client";

import { useState, useEffect, useCallback } from "react";
import { getDashboardStats, getSalesByPeriod, type DashboardStats, type SalesByPeriod } from "@/lib/analytics";
import { useToast } from "@/components/ui/useToast";

export function AnalyticsDashboard() {
  const { showToast, ToastView } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesByPeriod[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al cargar estadísticas",
        durationMs: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadSalesData = useCallback(async () => {
    try {
      const data = await getSalesByPeriod(period, dateRange.startDate, dateRange.endDate);
      setSalesData(data);
    } catch (err) {
      console.error("Error loading sales data:", err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Error al cargar datos de ventas";
      
      // Si es un error de autenticación, mostrar mensaje más claro
      if (errorMessage.includes("401") || errorMessage.includes("autenticación") || errorMessage.includes("Token")) {
        showToast({
          type: "error",
          message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
          durationMs: 6000,
        });
        // Redirigir al login después de un breve delay
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }, 2000);
      } else {
        showToast({
          type: "error",
          message: errorMessage,
          durationMs: 6000,
        });
      }
    }
  }, [period, dateRange, showToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
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

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
      {ToastView}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard de Estadísticas</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "daily" | "weekly" | "monthly")}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent text-sm sm:text-base"
          >
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
          </select>
          <div className="flex gap-2 sm:gap-4">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent text-sm sm:text-base"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* Sales Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Ventas Totales</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalSales}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <span className="text-xl sm:text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Ingresos Brutos Totales</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <span className="text-xl sm:text-2xl">💵</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Órdenes Pendientes</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">{stats.pendingOrders}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <span className="text-xl sm:text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Órdenes Completadas</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{stats.completedOrders}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <span className="text-xl sm:text-2xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Commissions Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">Comisiones Totales</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalCommissions}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 truncate">
            {formatCurrency(stats.totalCommissionAmount)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">Comisiones Pendientes</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">{stats.pendingCommissions}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 truncate">
            {formatCurrency(stats.pendingCommissionAmount)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">Comisiones Pagadas</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{stats.paidCommissions}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 truncate">
            {formatCurrency(stats.paidCommissionAmount)}
          </p>
        </div>
      </div>

      {/* Influencers & Codes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Influencers</h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Total</span>
              <span className="font-semibold text-sm sm:text-base">{stats.totalInfluencers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Activos</span>
              <span className="font-semibold text-sm sm:text-base text-green-600">{stats.activeInfluencers}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Códigos de Descuento</h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Total</span>
              <span className="font-semibold text-sm sm:text-base">{stats.totalDiscountCodes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Activos</span>
              <span className="font-semibold text-sm sm:text-base text-green-600">{stats.activeDiscountCodes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Usos Totales</span>
              <span className="font-semibold text-sm sm:text-base">{stats.totalCodeUses}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Influencers */}
      {stats.topInfluencers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Top Influencers</h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Influencer
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ventas
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comisiones Totales
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pendientes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.topInfluencers.map((inf) => (
                    <tr key={inf.id}>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">
                        <span className="block sm:inline">{inf.name}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500">
                        {inf.totalSales}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                        {formatCurrency(inf.totalCommissions)}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-amber-600">
                        {formatCurrency(inf.pendingCommissions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sales Chart */}
      {salesData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Ventas por Período</h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Órdenes
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ingresos
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comisiones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesData.map((item) => (
                    <tr key={item.date}>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">
                        {new Date(item.date).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500">
                        {item.orders}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500">
                        {formatCurrency(item.commissions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leads & Payments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Leads</h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Total</span>
              <span className="font-semibold text-sm sm:text-base">{stats.totalLeads}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Últimos 7 días</span>
              <span className="font-semibold text-sm sm:text-base text-primary-turquoise">{stats.recentLeads}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Pagos a Influencers</h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Pendientes</span>
              <span className="font-semibold text-sm sm:text-base text-amber-600">{stats.pendingPayments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Monto Pendiente</span>
              <span className="font-semibold text-sm sm:text-base text-amber-600 truncate ml-2">
                {formatCurrency(stats.totalPendingAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Aprobados/Pagados</span>
              <span className="font-semibold text-sm sm:text-base text-green-600">{stats.approvedPayments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Monto Aprobado</span>
              <span className="font-semibold text-sm sm:text-base text-green-600 truncate ml-2">
                {formatCurrency(stats.totalApprovedAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

