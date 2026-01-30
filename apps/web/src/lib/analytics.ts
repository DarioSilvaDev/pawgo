import { fetchAPI } from "./auth";
import { EventType } from "@pawgo/shared";

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalCommissionAmount: number;
  pendingCommissionAmount: number;
  paidCommissionAmount: number;
  totalInfluencers: number;
  activeInfluencers: number;
  topInfluencers: Array<{
    id: string;
    name: string;
    totalSales: number;
    totalCommissions: number;
    pendingCommissions: number;
  }>;
  totalDiscountCodes: number;
  activeDiscountCodes: number;
  totalCodeUses: number;
  totalLeads: number;
  recentLeads: number;
  pendingPayments: number;
  approvedPayments: number;
  totalPendingAmount: number;
  totalApprovedAmount: number;
}

export interface SalesByPeriod {
  date: string;
  orders: number;
  revenue: number;
  commissions: number;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<DashboardStats> {
  const params = new URLSearchParams();
  if (filters?.startDate) {
    params.append("startDate", filters.startDate);
  }
  if (filters?.endDate) {
    params.append("endDate", filters.endDate);
  }

  const queryString = params.toString();
  const endpoint = `/analytics/stats${queryString ? `?${queryString}` : ""}`;

  const response = await fetchAPI(endpoint);
  return response.json();
}

/**
 * Get sales by period
 */
export async function getSalesByPeriod(
  period: "daily" | "weekly" | "monthly",
  startDate: string,
  endDate: string
): Promise<SalesByPeriod[]> {
  const params = new URLSearchParams();
  params.append("period", period);
  params.append("startDate", startDate);
  params.append("endDate", endDate);

  const response = await fetchAPI(`/analytics/sales-by-period?${params.toString()}`);
  return response.json();
}

/**
 * Track an event
 */
export async function trackEvent(
  type: EventType,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await fetchAPI("/events", {
      method: "POST",
      body: JSON.stringify({
        type,
        metadata: metadata || {},
      }),
    });
  } catch (error) {
    // Silently fail - don't break the UI if tracking fails
    console.warn("Failed to track event:", error);
  }
}
