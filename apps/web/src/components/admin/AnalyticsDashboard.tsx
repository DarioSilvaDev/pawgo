"use client";

import { useState, useEffect, useCallback } from "react";
import { getDashboardStats, getSalesByPeriod, getEventMetrics, getEventMetricsTrend, type DashboardStats, type SalesByPeriod } from "@/lib/analytics";
import { useToast } from "@/components/ui/useToast";

export function AnalyticsDashboard() {
  const { showToast, ToastView } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesByPeriod[]>([]);
  const [eventMetrics, setEventMetrics] = useState<{
    pageViews: number;
    ctaClicks: number;
    buyIntentClicks: number;
    leadsSubmitted: number;
    conversionRate: number;
    clickThroughRate: number;
  } | null>(null);
  const [eventTrendData, setEventTrendData] = useState<Array<{
    date: string;
    pageViews: number;
    ctaClicks: number;
    buyIntentClicks: number;
    leadsSubmitted: number;
    conversionRate: number;
    clickThroughRate: number;
  }>>([]);
  const [previousPeriodMetrics, setPreviousPeriodMetrics] = useState<{
    pageViews: number;
    ctaClicks: number;
    buyIntentClicks: number;
    leadsSubmitted: number;
    conversionRate: number;
    clickThroughRate: number;
  } | null>(null);
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

  const loadEventMetrics = useCallback(async () => {
    try {
      // Current period metrics
      const data = await getEventMetrics(dateRange);
      setEventMetrics(data);

      // Trend data (daily breakdown)
      const trendData = await getEventMetricsTrend(dateRange.startDate, dateRange.endDate);
      setEventTrendData(trendData);

      // Calculate previous period dates
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - daysDiff);

      // Previous period metrics
      const previousData = await getEventMetrics({
        startDate: prevStart.toISOString().split("T")[0],
        endDate: prevEnd.toISOString().split("T")[0],
      });
      setPreviousPeriodMetrics(previousData);
    } catch (err) {
      console.error("Error loading event metrics:", err);
      // Don't show toast for event metrics errors to avoid spam
    }
  }, [dateRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  useEffect(() => {
    loadEventMetrics();
  }, [loadEventMetrics]);

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

      {/* Conversion Funnel */}
      {eventMetrics && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Embudo de Conversión 🎯</h2>

          <div className="space-y-3 sm:space-y-4">
            {/* Page Views */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👁️</span>
                  <span className="text-sm sm:text-base font-medium text-gray-700">Vistas de Página</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-gray-900">{eventMetrics.pageViews.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gradient-to-r from-blue-500 to-blue-400 h-12 sm:h-14 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm sm:text-base">100%</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="text-gray-400 text-2xl">↓</div>
            </div>
            {/* CTA Clicks */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👆</span>
                  <span className="text-sm sm:text-base font-medium text-gray-700">Clicks &quot;Saber más&quot;</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-gray-900">{eventMetrics.ctaClicks.toLocaleString()}</span>
              </div>
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-12 sm:h-14 rounded-lg flex items-center justify-center shadow-sm transition-all"
                style={{ width: eventMetrics.pageViews > 0 ? `${Math.min((eventMetrics.ctaClicks / eventMetrics.pageViews) * 100, 100)}%` : '0%' }}
              >
                <span className="text-white font-semibold text-sm sm:text-base whitespace-nowrap px-2">
                  {eventMetrics.pageViews > 0 ? `${((eventMetrics.ctaClicks / eventMetrics.pageViews) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="text-gray-400 text-2xl">↓</div>
            </div>

            {/* Buy Intent Clicks */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛒</span>
                  <span className="text-sm sm:text-base font-medium text-gray-700">Clicks &quot;Quiero uno&quot;</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-gray-900">{eventMetrics.buyIntentClicks.toLocaleString()}</span>
              </div>
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-400 h-12 sm:h-14 rounded-lg flex items-center justify-center shadow-sm transition-all"
                style={{ width: eventMetrics.pageViews > 0 ? `${Math.min((eventMetrics.buyIntentClicks / eventMetrics.pageViews) * 100, 100)}%` : '0%' }}
              >
                <span className="text-white font-semibold text-sm sm:text-base whitespace-nowrap px-2">
                  {eventMetrics.clickThroughRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="text-gray-400 text-2xl">↓</div>
            </div>

            {/* Leads Submitted */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <span className="text-sm sm:text-base font-medium text-gray-700">Leads Enviados</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-green-600">{eventMetrics.leadsSubmitted.toLocaleString()}</span>
              </div>
              <div
                className="bg-gradient-to-r from-green-500 to-green-400 h-12 sm:h-14 rounded-lg flex items-center justify-center shadow-sm transition-all"
                style={{ width: eventMetrics.pageViews > 0 ? `${Math.min((eventMetrics.leadsSubmitted / eventMetrics.pageViews) * 100, 100)}%` : '0%' }}
              >
                <span className="text-white font-semibold text-sm sm:text-base whitespace-nowrap px-2">
                  {eventMetrics.conversionRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <p className="text-xs sm:text-sm text-purple-700 font-medium mb-1">Tasa de Click (CTR)</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900">{eventMetrics.clickThroughRate.toFixed(2)}%</p>
                <p className="text-xs text-purple-600 mt-1">Vistas → &quot;Quiero uno&quot;</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <p className="text-xs sm:text-sm text-green-700 font-medium mb-1">Tasa de Conversión</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900">{eventMetrics.conversionRate.toFixed(2)}%</p>
                <p className="text-xs text-green-600 mt-1">&quot;Quiero uno&quot; → Lead</p>
              </div>
            </div>
          </div>

          {/* Period Comparison */}
          {previousPeriodMetrics && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Comparación con Período Anterior</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* CTR Comparison */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">CTR</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{eventMetrics.clickThroughRate.toFixed(2)}%</p>
                    {(() => {
                      const diff = eventMetrics.clickThroughRate - previousPeriodMetrics.clickThroughRate;
                      const isPositive = diff > 0;
                      const isNeutral = Math.abs(diff) < 0.01;
                      return (
                        <span className={`text-xs font-medium ${isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isNeutral ? '—' : `${isPositive ? '↑' : '↓'} ${Math.abs(diff).toFixed(2)}%`}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Anterior: {previousPeriodMetrics.clickThroughRate.toFixed(2)}%</p>
                </div>

                {/* Conversion Rate Comparison */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Conversión</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{eventMetrics.conversionRate.toFixed(2)}%</p>
                    {(() => {
                      const diff = eventMetrics.conversionRate - previousPeriodMetrics.conversionRate;
                      const isPositive = diff > 0;
                      const isNeutral = Math.abs(diff) < 0.01;
                      return (
                        <span className={`text-xs font-medium ${isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isNeutral ? '—' : `${isPositive ? '↑' : '↓'} ${Math.abs(diff).toFixed(2)}%`}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Anterior: {previousPeriodMetrics.conversionRate.toFixed(2)}%</p>
                </div>

                {/* Leads Comparison */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Leads</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{eventMetrics.leadsSubmitted}</p>
                    {(() => {
                      const diff = eventMetrics.leadsSubmitted - previousPeriodMetrics.leadsSubmitted;
                      const isPositive = diff > 0;
                      const isNeutral = diff === 0;
                      return (
                        <span className={`text-xs font-medium ${isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isNeutral ? '—' : `${isPositive ? '↑' : '↓'} ${Math.abs(diff)}`}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Anterior: {previousPeriodMetrics.leadsSubmitted}</p>
                </div>

                {/* Page Views Comparison */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Vistas</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{eventMetrics.pageViews.toLocaleString()}</p>
                    {(() => {
                      const diff = eventMetrics.pageViews - previousPeriodMetrics.pageViews;
                      const isPositive = diff > 0;
                      const isNeutral = diff === 0;
                      const percentDiff = previousPeriodMetrics.pageViews > 0
                        ? ((diff / previousPeriodMetrics.pageViews) * 100).toFixed(1)
                        : '0';
                      return (
                        <span className={`text-xs font-medium ${isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isNeutral ? '—' : `${isPositive ? '↑' : '↓'} ${percentDiff}%`}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Anterior: {previousPeriodMetrics.pageViews.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Trend Chart */}

        </div>
      )}

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

