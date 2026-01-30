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
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  
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
    const totalRevenue = orders.reduce((sum, order) => sum + n(order.total), 0);
    const pendingOrders = orders.filter((o) => o.status === OrderStatus.pending).length;
    const completedOrders = orders.filter((o) => o.status === OrderStatus.paid).length;

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

    return {
      totalSales,
      totalRevenue,
      pendingOrders,
      completedOrders,
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
}

