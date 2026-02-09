import {
  CommissionStatus,
  InfluencerPaymentStatus,
  OrderStatus,
  PrismaClient,
} from "@prisma/client";
import { n } from "../utils/decimal.js";

const prisma = new PrismaClient();

export interface DashboardStats {
  // Sales
  totalSales: number;
  totalRevenue: number; // Solo órdenes pagadas
  pendingRevenue: number; // Ingresos de órdenes pendientes
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;

  // Commissions
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalCommissionAmount: number;
  pendingCommissionAmount: number;
  paidCommissionAmount: number;

  // Influencers
  totalInfluencers: number;
  activeInfluencers: number;
  topInfluencers: Array<{
    id: string;
    name: string;
    totalSales: number;
    totalCommissions: number;
    pendingCommissions: number;
  }>;

  // Discount Codes
  totalDiscountCodes: number;
  activeDiscountCodes: number;
  totalCodeUses: number;

  // Leads
  totalLeads: number;
  recentLeads: number; // Last 7 days

  // Payments
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

export class AnalyticsService {
  /**
   * Get dashboard statistics for admin
   */
  async getDashboardStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<DashboardStats> {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🔍 [Analytics] getDashboardStats CALLED");
    console.log("═══════════════════════════════════════════════════════");

    const dateFilter = startDate && endDate
      ? {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }
      : {};

    // Sales statistics
    const orders = await prisma.order.findMany({
      where: dateFilter,
    });

    const totalSales = orders.length;
    console.log(`📊 [Analytics] Total orders found: ${totalSales}`);

    // Ingresos totales: solo órdenes pagadas
    const paidOrders = orders.filter((o) => o.status === OrderStatus.paid);
    console.log(`✅ [Analytics] Paid orders: ${paidOrders.length}`);

    const totalRevenue = paidOrders.reduce((sum, order) => {
      const orderTotal = n(order.total);
      if (isNaN(orderTotal)) {
        console.error(`❌ [Analytics] NaN for order ${order.id}, total:`, order.total, typeof order.total);
        return sum;
      }
      return sum + orderTotal;
    }, 0);

    // Ingresos pendientes: órdenes pendientes
    const pendingOrdersList = orders.filter((o) => o.status === OrderStatus.pending);
    console.log(`⏳ [Analytics] Pending orders: ${pendingOrdersList.length}`);

    const pendingRevenue = pendingOrdersList.reduce((sum, order) => {
      const orderTotal = n(order.total);
      if (isNaN(orderTotal)) {
        console.error(`❌ [Analytics] NaN for pending order ${order.id}, total:`, order.total, typeof order.total);
        return sum;
      }
      return sum + orderTotal;
    }, 0);

    const pendingOrders = orders.filter((o) => o.status === OrderStatus.pending).length;
    const completedOrders = orders.filter((o) => o.status === OrderStatus.paid).length;
    const cancelledOrders = orders.filter((o) => o.status === OrderStatus.cancelled).length;

    console.log(`💰 [Analytics] Total Revenue: ${totalRevenue} (isNaN: ${isNaN(totalRevenue)})`);
    console.log(`💰 [Analytics] Pending Revenue: ${pendingRevenue} (isNaN: ${isNaN(pendingRevenue)})`);
    console.log(`📊 [Analytics] Orders breakdown: ${completedOrders} paid, ${pendingOrders} pending, ${cancelledOrders} cancelled`);
    console.log("═══════════════════════════════════════════════════════");

    // Commission statistics
    const commissions = await prisma.commission.findMany({
      where: dateFilter,
    });

    const totalCommissions = commissions.length;
    const pendingCommissions = commissions.filter(
      (c) => c.status === CommissionStatus.pending
    ).length;
    const paidCommissions = commissions.filter((c) => c.status === CommissionStatus.paid)
      .length;
    const totalCommissionAmount = commissions.reduce(
      (sum, c) => sum + n(c.commissionAmount),
      0
    );
    const pendingCommissionAmount = commissions
      .filter((c) => c.status === CommissionStatus.pending)
      .reduce((sum, c) => sum + n(c.commissionAmount), 0);
    const paidCommissionAmount = commissions
      .filter((c) => c.status === CommissionStatus.paid)
      .reduce((sum, c) => sum + n(c.commissionAmount), 0);

    // Influencer statistics
    const influencers = await prisma.influencer.findMany({
      include: {
        commissions: {
          where: dateFilter,
        },
        discountCodes: true,
      },
    });

    const totalInfluencers = influencers.length;
    const activeInfluencers = influencers.filter((inf) => inf.isActive).length;

    // Top influencers by sales
    const topInfluencers = influencers
      .map((inf) => {
        const influencerCommissions = inf.commissions;
        const totalSales = influencerCommissions.length;
        const totalCommissions = influencerCommissions.reduce(
          (sum, c) => sum + n(c.commissionAmount),
          0
        );
        const pendingCommissions = influencerCommissions
          .filter((c) => c.status === CommissionStatus.pending)
          .reduce((sum, c) => sum + n(c.commissionAmount), 0);

        return {
          id: inf.id,
          name: inf.name,
          totalSales,
          totalCommissions,
          pendingCommissions,
        };
      })
      .sort((a, b) => b.totalCommissions - a.totalCommissions)
      .slice(0, 10);

    // Discount code statistics
    const discountCodes = await prisma.discountCode.findMany({
      where: dateFilter,
    });

    const totalDiscountCodes = discountCodes.length;
    const activeDiscountCodes = discountCodes.filter((c) => c.isActive).length;
    const totalCodeUses = discountCodes.reduce(
      (sum, c) => sum + c.usedCount,
      0
    );

    // Lead statistics
    const leads = await prisma.lead.findMany({
      where: dateFilter,
    });

    const totalLeads = leads.length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLeads = leads.filter(
      (l) => l.createdAt >= sevenDaysAgo
    ).length;

    // Payment statistics
    const payments = await prisma.influencerPayment.findMany({
      where: dateFilter,
    });

    const pendingPayments = payments.filter(
      (p) =>
        p.status === InfluencerPaymentStatus.pending ||
        p.status === InfluencerPaymentStatus.invoice_uploaded
    ).length;
    const approvedPayments = payments.filter(
      (p) =>
        p.status === InfluencerPaymentStatus.approved ||
        p.status === InfluencerPaymentStatus.paid
    ).length;
    const totalPendingAmount = payments
      .filter(
        (p) =>
          p.status === InfluencerPaymentStatus.pending ||
          p.status === InfluencerPaymentStatus.invoice_uploaded
      )
      .reduce((sum, p) => sum + n(p.totalAmount), 0);
    const totalApprovedAmount = payments
      .filter(
        (p) =>
          p.status === InfluencerPaymentStatus.approved ||
          p.status === InfluencerPaymentStatus.paid
      )
      .reduce((sum, p) => sum + n(p.totalAmount), 0);

    const result = {
      totalSales,
      totalRevenue: isNaN(totalRevenue) ? 0 : totalRevenue,
      pendingRevenue: isNaN(pendingRevenue) ? 0 : pendingRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      totalCommissionAmount,
      pendingCommissionAmount,
      paidCommissionAmount,
      totalInfluencers,
      activeInfluencers,
      topInfluencers,
      totalDiscountCodes,
      activeDiscountCodes,
      totalCodeUses,
      totalLeads,
      recentLeads,
      pendingPayments,
      approvedPayments,
      totalPendingAmount,
      totalApprovedAmount,
    };

    console.log("📤 [Analytics] Returning result:", {
      totalRevenue: result.totalRevenue,
      pendingRevenue: result.pendingRevenue,
      totalSales: result.totalSales,
    });

    return result;
  }

  /**
   * Get sales by period (daily, weekly, monthly)
   */
  async getSalesByPeriod(
    period: "daily" | "weekly" | "monthly",
    startDate: Date,
    endDate: Date
  ): Promise<SalesByPeriod[]> {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: OrderStatus.paid,
      },
    });

    // Group by period
    const grouped: Record<string, { orders: number; revenue: number }> = {};

    orders.forEach((order) => {
      let key: string;
      const date = new Date(order.createdAt);

      if (period === "daily") {
        key = date.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (period === "weekly") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        // monthly
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!grouped[key]) {
        grouped[key] = { orders: 0, revenue: 0 };
      }

      grouped[key].orders += 1;
      grouped[key].revenue += n(order.total);
    });

    // Get commissions for same period
    const commissions = await prisma.commission.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const commissionGrouped: Record<string, number> = {};
    commissions.forEach((commission) => {
      const date = new Date(commission.createdAt);
      let key: string;

      if (period === "daily") {
        key = date.toISOString().split("T")[0];
      } else if (period === "weekly") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!commissionGrouped[key]) {
        commissionGrouped[key] = 0;
      }

      commissionGrouped[key] += n(commission.commissionAmount);
    });

    // Convert to array and sort
    return Object.keys(grouped)
      .map((key) => ({
        date: key,
        orders: grouped[key].orders,
        revenue: grouped[key].revenue,
        commissions: commissionGrouped[key] || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get event metrics for analytics dashboard (funnel)
   */
  async getEventMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    pageViews: number;
    ctaClicks: number;
    buyIntentClicks: number;
    leadsSubmitted: number;
    conversionRate: number; // buyIntentClicks -> leadsSubmitted
    clickThroughRate: number; // pageViews -> buyIntentClicks
  }> {
    const dateFilter = startDate && endDate
      ? {
        date: {
          gte: startDate,
          lte: endDate,
        },
      }
      : {};

    // Get event counters
    const pageViewsData = await prisma.eventCounter.aggregate({
      where: {
        type: "vista_pagina",
        ...dateFilter,
      },
      _sum: {
        count: true,
      },
    });

    const ctaClicksData = await prisma.eventCounter.aggregate({
      where: {
        type: "click_cta",
        ...dateFilter,
      },
      _sum: {
        count: true,
      },
    });

    const buyIntentClicksData = await prisma.eventCounter.aggregate({
      where: {
        type: "click_intencion_compra",
        ...dateFilter,
      },
      _sum: {
        count: true,
      },
    });

    // Get leads submitted from Event table (not counted, stored individually)
    const leadEventFilter = startDate && endDate
      ? {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }
      : {};

    const leadsSubmittedData = await prisma.event.count({
      where: {
        type: "lead_enviado",
        ...leadEventFilter,
      },
    });

    const pageViews = pageViewsData._sum.count || 0;
    const ctaClicks = ctaClicksData._sum.count || 0;
    const buyIntentClicks = buyIntentClicksData._sum.count || 0;
    const leadsSubmitted = leadsSubmittedData || 0;

    // Calculate conversion rates
    const conversionRate = buyIntentClicks > 0
      ? (leadsSubmitted / buyIntentClicks) * 100
      : 0;

    const clickThroughRate = pageViews > 0
      ? (buyIntentClicks / pageViews) * 100
      : 0;

    return {
      pageViews,
      ctaClicks,
      buyIntentClicks,
      leadsSubmitted,
      conversionRate: Math.round(conversionRate * 100) / 100, // 2 decimals
      clickThroughRate: Math.round(clickThroughRate * 100) / 100, // 2 decimals
    };
  }

  /**
   * Get event metrics by date range (for trend visualization)
   */
  async getEventMetricsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    date: string;
    pageViews: number;
    ctaClicks: number;
    buyIntentClicks: number;
    leadsSubmitted: number;
    conversionRate: number;
    clickThroughRate: number;
  }>> {
    // Get all event counters in date range
    const eventCounters = await prisma.eventCounter.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get all lead events in date range
    const leadEvents = await prisma.event.findMany({
      where: {
        type: "lead_enviado",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Group by date
    const dateMap = new Map<string, {
      pageViews: number;
      ctaClicks: number;
      buyIntentClicks: number;
      leadsSubmitted: number;
    }>();

    // Process event counters
    eventCounters.forEach((counter) => {
      const dateKey = counter.date.toISOString().split('T')[0];

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          pageViews: 0,
          ctaClicks: 0,
          buyIntentClicks: 0,
          leadsSubmitted: 0,
        });
      }

      const dayData = dateMap.get(dateKey)!;

      if (counter.type === "vista_pagina") {
        dayData.pageViews += counter.count;
      } else if (counter.type === "click_cta") {
        dayData.ctaClicks += counter.count;
      } else if (counter.type === "click_intencion_compra") {
        dayData.buyIntentClicks += counter.count;
      }
    });

    // Process lead events
    leadEvents.forEach((event) => {
      const dateKey = event.createdAt.toISOString().split('T')[0];

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          pageViews: 0,
          ctaClicks: 0,
          buyIntentClicks: 0,
          leadsSubmitted: 0,
        });
      }

      const dayData = dateMap.get(dateKey)!;
      dayData.leadsSubmitted += 1;
    });

    // Convert to array and calculate rates
    const result = Array.from(dateMap.entries()).map(([date, data]) => {
      const conversionRate = data.buyIntentClicks > 0
        ? (data.leadsSubmitted / data.buyIntentClicks) * 100
        : 0;

      const clickThroughRate = data.pageViews > 0
        ? (data.buyIntentClicks / data.pageViews) * 100
        : 0;

      return {
        date,
        pageViews: data.pageViews,
        ctaClicks: data.ctaClicks,
        buyIntentClicks: data.buyIntentClicks,
        leadsSubmitted: data.leadsSubmitted,
        conversionRate: Math.round(conversionRate * 100) / 100,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
      };
    });

    // Sort by date
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }
}
