import { PrismaClient, Prisma } from "@prisma/client";
import { prismaDecimal, prismaNumber } from "../utils/decimal.js";

const prisma = new PrismaClient();

export class CommissionService {
  /**
   * Create commission automatically when order is paid
   */
  async createFromOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        discountCode: true,
      },
    });

    if (!order || !order.discountCodeId) {
      return null; // No commission if no discount code
    }

    // Check if commission already exists
    const existingCommission = await prisma.commission.findUnique({
      where: { orderId: order.id },
    });

    if (existingCommission) {
      return existingCommission;
    }

    // Get discount code with influencer
    const discountCode = await prisma.discountCode.findUnique({
      where: { id: order.discountCodeId },
      include: {
        influencer: true,
      },
    });

    if (!discountCode) {
      throw new Error("Código de descuento no encontrado");
    }

    // Calculate commission (equal to discount amount)
    const commissionAmount = prismaDecimal(order.discount);
    const subtotal = prismaDecimal(order.subtotal);
    const commissionRate = subtotal.gt(0)
      ? commissionAmount.div(subtotal).mul(100)
      : prismaDecimal(0);

    // Create commission
    const commission = await prisma.commission.create({
      data: {
        influencerId: discountCode.influencerId,
        orderId: order.id,
        discountCodeId: discountCode.id,
        orderTotal: prismaNumber(prismaDecimal(order.total)),
        discountAmount: prismaNumber(prismaDecimal(order.discount)),
        commissionRate: prismaNumber(commissionRate),
        commissionAmount: prismaNumber(commissionAmount),
        status: "pending",
      },
    });

    return commission;
  }

  /**
   * Get pending commissions grouped by influencer
   */
  async getPendingCommissions() {
    const commissions = await prisma.commission.findMany({
      where: {
        status: "pending",
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            auth: {
              select: {
                email: true,
              },
            },
          },
        },
        order: {
          select: {
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by influencer
    const grouped = commissions.reduce(
      (acc, commission) => {
        const influencerId = commission.influencerId;
        if (!acc[influencerId]) {
          acc[influencerId] = {
            influencer: commission.influencer,
            commissions: [],
            totalAmount: prismaDecimal(0),
          };
        }
        acc[influencerId].commissions.push(commission);
        acc[influencerId].totalAmount = acc[influencerId].totalAmount.add(
          prismaDecimal(commission.commissionAmount)
        );
        return acc;
      },
      {} as Record<
        string,
        {
          influencer: (typeof commissions)[0]["influencer"];
          commissions: typeof commissions;
          totalAmount: Prisma.Decimal;
        }
      >
    );

    return Object.values(grouped).map((g) => ({
      ...g,
      totalAmount: prismaNumber(prismaDecimal(g.totalAmount)),
    }));
  }

  /**
   * Mark commissions as paid
   */
  async markAsPaid(commissionIds: string[], influencerPaymentId: string) {
    await prisma.commission.updateMany({
      where: {
        id: {
          in: commissionIds,
        },
      },
      data: {
        influencerPaymentId,
        status: "paid",
        paidAt: new Date(),
      },
    });
  }

  /**
   * Get commissions by influencer
   */
  async getByInfluencer(
    influencerId: string,
    filters?: {
      status?: "pending" | "paid" | "cancelled";
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: {
      influencerId: string;
      status?: "pending" | "paid" | "cancelled";
      createdAt?: { gte?: Date; lte?: Date };
    } = { influencerId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return prisma.commission.findMany({
      where,
      include: {
        order: {
          select: {
            createdAt: true,
            total: true,
          },
        },
        discountCode: {
          select: {
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
