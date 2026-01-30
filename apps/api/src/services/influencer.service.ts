import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "../auth/utils/password.util.js";
import { generateRandomToken } from "../auth/utils/token.util.js";
import { prismaDecimal, prismaNumber } from "../utils/decimal.js";

const prisma = new PrismaClient();

type CommissionStatus = "pending" | "paid" | "cancelled";

export interface InfluencerDashboard {
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
    orderDate: Date;
    orderTotal: number;
    discountAmount: number;
    commissionAmount: number;
    status: string;
    paidAt?: Date;
  }>;
  discountCodes: Array<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    usedCount: number;
    maxUses?: number;
    isActive: boolean;
    validUntil?: Date;
  }>;
}

export const influencerService = {
  /**
   * Get influencer dashboard data
   */
  async getDashboard(influencerId: string): Promise<InfluencerDashboard> {
    // Get influencer with auth
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      include: {
        auth: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!influencer) {
      throw new Error("Influencer no encontrado");
    }

    // Get commissions summary
    const commissions = await prisma.commission.findMany({
      where: { influencerId },
      include: {
        order: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    const totalCommission = commissions.reduce(
      (sum, c) => sum.add(prismaDecimal(c.commissionAmount)),
      prismaDecimal(0)
    );
    const pendingCommission = commissions
      .filter((c) => c.status === "pending")
      .reduce(
        (sum, c) => sum.add(prismaDecimal(c.commissionAmount)),
        prismaDecimal(0)
      );
    const paidCommission = commissions
      .filter((c) => c.status === "paid")
      .reduce(
        (sum, c) => sum.add(prismaDecimal(c.commissionAmount)),
        prismaDecimal(0)
      );

    // Get discount codes
    const discountCodes = await prisma.discountCode.findMany({
      where: { influencerId },
      orderBy: { createdAt: "desc" },
    });

    // Get recent commissions (last 10)
    const recentCommissions = await prisma.commission.findMany({
      where: { influencerId },
      include: {
        order: {
          select: {
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      influencer: {
        id: influencer.id,
        name: influencer.name,
        email: influencer.auth.email,
        phone: influencer.phone || undefined,
        socialMedia: influencer.socialMedia as
          | Record<string, unknown>
          | undefined,
        isActive: influencer.isActive,
      },
      summary: {
        totalOrders: commissions.length,
        totalCommission: prismaNumber(totalCommission),
        pendingCommission: prismaNumber(pendingCommission),
        paidCommission: prismaNumber(paidCommission),
        activeCodes: discountCodes.filter((c) => c.isActive).length,
        totalCodes: discountCodes.length,
      },
      recentCommissions: recentCommissions.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        orderDate: c.order.createdAt,
        orderTotal: prismaNumber(prismaDecimal(c.orderTotal)),
        discountAmount: prismaNumber(prismaDecimal(c.discountAmount)),
        commissionAmount: prismaNumber(prismaDecimal(c.commissionAmount)),
        status: c.status,
        paidAt: c.paidAt || undefined,
      })),
      discountCodes: discountCodes.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType as "percentage" | "fixed",
        discountValue: prismaNumber(prismaDecimal(c.discountValue)),
        usedCount: prismaNumber(prismaDecimal(c.usedCount)),
        maxUses: prismaNumber(prismaDecimal(c.maxUses)) || undefined,
        isActive: c.isActive,
        validUntil: c.validUntil || undefined,
      })),
    };
  },

  /**
   * Get all commissions for an influencer
   */
  async getCommissions(
    influencerId: string,
    filters?: {
      status?: CommissionStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: {
      influencerId: string;
      status?: CommissionStatus;
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
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Get discount codes for an influencer
   */
  async getDiscountCodes(influencerId: string) {
    return prisma.discountCode.findMany({
      where: { influencerId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Get influencer by ID
   */
  async getById(influencerId: string) {
    return prisma.influencer.findUnique({
      where: { id: influencerId },
      include: {
        auth: {
          select: {
            email: true,
            emailVerified: true,
          },
        },
      },
    });
  },

  /**
   * Get influencer by authId
   */
  async getByAuthId(authId: string) {
    return prisma.influencer.findUnique({
      where: { authId },
      include: {
        auth: {
          select: {
            email: true,
          },
        },
      },
    });
  },

  /**
   * Get all influencers (for admin)
   */
  async getAll() {
    return prisma.influencer.findMany({
      include: {
        auth: {
          select: {
            email: true,
            emailVerified: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  },

  /**
   * Create influencer (for admin)
   */
  async create(data: {
    email: string;
    password: string;
    name: string;
    phone?: string | null;
    socialMedia?: Record<string, unknown> | null;
  }) {
    // Check if email already exists
    const existingAuth = await prisma.auth.findUnique({
      where: { email: data.email },
    });

    if (existingAuth) {
      throw new Error("El email ya está registrado");
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create Auth and Influencer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Auth
      const auth = await tx.auth.create({
        data: {
          email: data.email,
          passwordHash,
          role: "influencer",
          emailVerificationToken: generateRandomToken(),
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        } as Prisma.AuthUncheckedCreateInput,
      });

      // Create Influencer
      const influencer = await tx.influencer.create({
        data: {
          name: data.name,
          phone: data.phone || undefined,
          socialMedia: data.socialMedia
            ? (data.socialMedia as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          authId: auth.id,
        } as Prisma.InfluencerUncheckedCreateInput,
        include: {
          auth: {
            select: {
              email: true,
              emailVerified: true,
              isActive: true,
            },
          },
        },
      });

      return influencer;
    });

    return result;
  },

  /**
   * Update influencer (for admin)
   */
  async update(
    influencerId: string,
    data: {
      name?: string;
      phone?: string | null;
      socialMedia?: Record<string, unknown> | null;
      isActive?: boolean;
    }
  ) {
    const updateData: Prisma.InfluencerUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.socialMedia !== undefined) {
      updateData.socialMedia = data.socialMedia
        ? (data.socialMedia as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }
    if (data.isActive !== undefined) {
      // If deactivating influencer, also deactivate auth
      if (!data.isActive) {
        const influencer = await prisma.influencer.findUnique({
          where: { id: influencerId },
          select: { authId: true },
        });
        if (influencer) {
          await prisma.auth.update({
            where: { id: influencer.authId },
            data: { isActive: false },
          });
        }
      }
    }

    return prisma.influencer.update({
      where: { id: influencerId },
      data: updateData,
      include: {
        auth: {
          select: {
            email: true,
            emailVerified: true,
            isActive: true,
          },
        },
      },
    });
  },

  /**
   * Delete influencer (soft delete by deactivating)
   */
  async delete(influencerId: string) {
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { authId: true },
    });

    if (!influencer) {
      throw new Error("Influencer no encontrado");
    }

    // Deactivate auth and influencer
    await prisma.auth.update({
      where: { id: influencer.authId },
      data: { isActive: false },
    });

    return prisma.influencer.update({
      where: { id: influencerId },
      data: { isActive: false },
      include: {
        auth: {
          select: {
            email: true,
            emailVerified: true,
            isActive: true,
          },
        },
      },
    });
  },

  /**
   * Update payment information for an influencer
   */
  async updatePaymentInfo(
    influencerId: string,
    data: {
      paymentMethod?: "transfer" | "mercadopago";
      accountNumber?: string | null;
      cvu?: string | null;
      bankName?: string | null;
      mercadopagoEmail?: string | null;
      taxId?: string | null;
    }
  ) {
    const updateData: {
      paymentMethod?: string;
      accountNumber?: string | null;
      cvu?: string | null;
      bankName?: string | null;
      mercadopagoEmail?: string | null;
      taxId?: string | null;
    } = {};

    if (data.paymentMethod !== undefined) {
      updateData.paymentMethod = data.paymentMethod;
    }
    if (data.accountNumber !== undefined) {
      updateData.accountNumber = data.accountNumber || null;
    }
    if (data.cvu !== undefined) {
      updateData.cvu = data.cvu || null;
    }
    if (data.bankName !== undefined) {
      updateData.bankName = data.bankName || null;
    }
    if (data.mercadopagoEmail !== undefined) {
      updateData.mercadopagoEmail = data.mercadopagoEmail || null;
    }
    if (data.taxId !== undefined) {
      updateData.taxId = data.taxId || null;
    }

    return prisma.influencer.update({
      where: { id: influencerId },
      data: updateData,
      include: {
        auth: {
          select: {
            email: true,
          },
        },
      },
    });
  },
};
