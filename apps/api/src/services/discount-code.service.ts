import { PrismaClient, Prisma } from "@prisma/client";
import {
  CreateDiscountCodeDto,
  UpdateDiscountCodeDto,
  DiscountCodeWithInfluencer,
} from "@pawgo/shared";
import { prismaDecimal, prismaNumber } from "../utils/decimal.js";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

function normalizeExpiryToArgentinaEndOfDayUtc(input: string | Date): Date {
  // Business rule: codes expire at the end of the chosen day in Argentina (Buenos Aires),
  // stored as a UTC timestamp.
  //
  // Example: chosen date = 2026-01-18 (AR) → validUntil = 2026-01-19T02:59:59.000Z
  let dateOnly: string;

  if (typeof input === "string") {
    // Accept either "YYYY-MM-DD" or full ISO datetime. Extract the calendar date.
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      dateOnly = input;
    } else {
      const parsed = DateTime.fromISO(input, { setZone: true });
      if (!parsed.isValid) throw new Error("Fecha de expiración inválida");
      // Convert to Argentina timezone before picking the calendar date
      const iso = parsed.setZone(ARGENTINA_TZ).toISODate();
      if (!iso) throw new Error("Fecha de expiración inválida");
      dateOnly = iso;
    }
  } else {
    const parsed = DateTime.fromJSDate(input, { zone: "utc" }).setZone(
      ARGENTINA_TZ
    );
    if (!parsed.isValid) throw new Error("Fecha de expiración inválida");
    const iso = parsed.toISODate();
    if (!iso) throw new Error("Fecha de expiración inválida");
    dateOnly = iso;
  }

  const dt = DateTime.fromISO(dateOnly, { zone: ARGENTINA_TZ })
    .endOf("day")
    .set({ millisecond: 0 })
    .toUTC();
  if (!dt.isValid) throw new Error("Fecha de expiración inválida");
  return dt.toJSDate();
}

export class DiscountCodeService {
  /**
   * Create a new discount code (Admin only)
   */
  async create(
    data: CreateDiscountCodeDto
  ): Promise<DiscountCodeWithInfluencer> {
    // Validate code uniqueness
    const existingCode = await prisma.discountCode.findUnique({
      where: { code: data.code },
    });

    if (existingCode) {
      throw new Error("El código ya existe");
    }

    // Validate influencer exists
    const influencer = await prisma.influencer.findUnique({
      where: { id: data.influencerId },
    });

    if (!influencer) {
      throw new Error("Influencer no encontrado");
    }

    // Validate discount value
    if (data.discountValue <= 0) {
      throw new Error("El valor del descuento debe ser mayor a 0");
    }

    if (data.discountType === "percentage" && data.discountValue > 100) {
      throw new Error("El porcentaje de descuento no puede ser mayor a 100%");
    }

    // Validate dates
    if (data.validUntil) {
      const validUntilDate = normalizeExpiryToArgentinaEndOfDayUtc(
        data.validUntil
      );
      if (validUntilDate <= new Date()) {
        throw new Error("La fecha de expiración debe ser futura");
      }
    }

    // Validate maxUses
    if (data.maxUses !== undefined && data.maxUses <= 0) {
      throw new Error("El límite de usos debe ser mayor a 0");
    }

    // Validate minPurchase
    if (data.minPurchase !== undefined && data.minPurchase <= 0) {
      throw new Error("La compra mínima debe ser mayor a 0");
    }

    const discountCode = await prisma.discountCode.create({
      data: {
        code: data.code.toUpperCase().trim(),
        influencerId: data.influencerId,
        discountType: data.discountType,
        discountValue: prismaNumber(prismaDecimal(data.discountValue)),
        minPurchase:
          data.minPurchase !== undefined
            ? prismaNumber(prismaDecimal(data.minPurchase))
            : null,
        maxUses: data.maxUses,
        validUntil: data.validUntil
          ? normalizeExpiryToArgentinaEndOfDayUtc(data.validUntil)
          : null,
        isActive: true,
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
      },
    });

    return {
      ...discountCode,
      discountType: discountCode.discountType as "percentage" | "fixed",
      discountValue: Number(discountCode.discountValue),
      minPurchase: discountCode.minPurchase
        ? Number(discountCode.minPurchase)
        : undefined,
      maxUses: discountCode.maxUses ?? undefined,
      validUntil: discountCode.validUntil ?? undefined,
      influencer: {
        id: discountCode.influencer.id,
        name: discountCode.influencer.name,
        email: discountCode.influencer.auth?.email || "",
      },
    };
  }

  /**
   * Get all discount codes with influencer info (Admin)
   */
  async getAll(filters?: {
    influencerId?: string;
    isActive?: boolean;
    code?: string;
  }): Promise<DiscountCodeWithInfluencer[]> {
    const where: Prisma.DiscountCodeWhereInput = {};

    if (filters?.influencerId) {
      where.influencerId = filters.influencerId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.code) {
      where.code = {
        contains: filters.code,
        mode: "insensitive",
      };
    }

    const codes = await prisma.discountCode.findMany({
      where,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return codes.map((code) => ({
      ...code,
      discountType: code.discountType as "percentage" | "fixed",
      discountValue: Number(code.discountValue),
      minPurchase: code.minPurchase ? Number(code.minPurchase) : undefined,
      maxUses: code.maxUses ?? undefined,
      validUntil: code.validUntil ?? undefined,
      influencer: {
        id: code.influencer.id,
        name: code.influencer.name,
        email: code.influencer.auth?.email || "",
      },
    }));
  }

  /**
   * Get discount code by ID
   */
  async getById(id: string): Promise<DiscountCodeWithInfluencer | null> {
    const code = await prisma.discountCode.findUnique({
      where: { id },
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
      },
    });

    if (!code) {
      return null;
    }

    return {
      ...code,
      discountType: code.discountType as "percentage" | "fixed",
      discountValue: Number(code.discountValue),
      minPurchase: code.minPurchase ? Number(code.minPurchase) : undefined,
      maxUses: code.maxUses ?? undefined,
      validUntil: code.validUntil ?? undefined,
      influencer: {
        id: code.influencer.id,
        name: code.influencer.name,
        email: code.influencer.auth?.email || "",
      },
    };
  }

  /**
   * Get discount code by code string
   */
  async getByCode(code: string): Promise<DiscountCodeWithInfluencer | null> {
    const discountCode = await prisma.discountCode.findUnique({
      where: { code: code.toUpperCase().trim() },
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
      },
    });

    if (!discountCode) {
      return null;
    }

    return {
      ...discountCode,
      discountType: discountCode.discountType as "percentage" | "fixed",
      discountValue: Number(discountCode.discountValue),
      minPurchase: discountCode.minPurchase
        ? Number(discountCode.minPurchase)
        : undefined,
      maxUses: discountCode.maxUses ?? undefined,
      validUntil: discountCode.validUntil ?? undefined,
      influencer: {
        id: discountCode.influencer.id,
        name: discountCode.influencer.name,
        email: discountCode.influencer.auth?.email || "",
      },
    };
  }

  /**
   * Update discount code (Admin only)
   */
  async update(
    id: string,
    data: UpdateDiscountCodeDto
  ): Promise<DiscountCodeWithInfluencer> {
    const existingCode = await prisma.discountCode.findUnique({
      where: { id },
    });

    if (!existingCode) {
      throw new Error("Código de descuento no encontrado");
    }

    // Validate code uniqueness if changing code
    if (data.code && data.code !== existingCode.code) {
      const codeExists = await prisma.discountCode.findUnique({
        where: { code: data.code.toUpperCase().trim() },
      });

      if (codeExists) {
        throw new Error("El código ya existe");
      }
    }

    // Validate discount value
    if (data.discountValue !== undefined) {
      if (data.discountValue <= 0) {
        throw new Error("El valor del descuento debe ser mayor a 0");
      }

      const discountType = data.discountType || existingCode.discountType;
      if (discountType === "percentage" && data.discountValue > 100) {
        throw new Error("El porcentaje de descuento no puede ser mayor a 100%");
      }
    }

    // Validate dates
    if (data.validUntil) {
      const validUntilDate = normalizeExpiryToArgentinaEndOfDayUtc(
        data.validUntil
      );
      if (validUntilDate <= new Date()) {
        throw new Error("La fecha de expiración debe ser futura");
      }
    }

    const updateData: Prisma.DiscountCodeUpdateInput = {};

    if (data.code !== undefined) {
      updateData.code = data.code.toUpperCase().trim();
    }

    if (data.discountType !== undefined) {
      updateData.discountType = data.discountType;
    }

    if (data.discountValue !== undefined) {
      updateData.discountValue = prismaNumber(
        prismaDecimal(data.discountValue)
      );
    }

    if (data.minPurchase !== undefined) {
      updateData.minPurchase = data.minPurchase
        ? prismaNumber(prismaDecimal(data.minPurchase))
        : null;
    }

    if (data.maxUses !== undefined) {
      updateData.maxUses = data.maxUses;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.validUntil !== undefined) {
      updateData.validUntil = data.validUntil
        ? normalizeExpiryToArgentinaEndOfDayUtc(data.validUntil)
        : null;
    }

    const updatedCode = await prisma.discountCode.update({
      where: { id },
      data: updateData,
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
      },
    });

    return {
      ...updatedCode,
      discountType: updatedCode.discountType as "percentage" | "fixed",
      discountValue: Number(updatedCode.discountValue),
      minPurchase: updatedCode.minPurchase
        ? Number(updatedCode.minPurchase)
        : undefined,
      maxUses: updatedCode.maxUses ?? undefined,
      validUntil: updatedCode.validUntil ?? undefined,
      influencer: {
        id: updatedCode.influencer.id,
        name: updatedCode.influencer.name,
        email: updatedCode.influencer.auth?.email || "",
      },
    };
  }

  /**
   * Delete discount code (Admin only)
   */
  async delete(id: string): Promise<void> {
    const code = await prisma.discountCode.findUnique({
      where: { id },
    });

    if (!code) {
      throw new Error("Código de descuento no encontrado");
    }

    // Check if code has been used
    if (code.usedCount > 0) {
      throw new Error(
        "No se puede eliminar un código que ya ha sido usado. Desactívalo en su lugar."
      );
    }

    await prisma.discountCode.delete({
      where: { id },
    });
  }

  /**
   * Validate discount code for use
   */
  async validateCode(
    code: string,
    subtotal: Prisma.Decimal.Value
  ): Promise<{
    valid: boolean;
    discountAmount: Prisma.Decimal;
    discountCode?: DiscountCodeWithInfluencer;
    error?: string;
  }> {
    const discountCode = await this.getByCode(code);

    if (!discountCode) {
      return {
        valid: false,
        discountAmount: prismaDecimal(0),
        error: "Código de descuento no encontrado",
      };
    }

    if (!discountCode.isActive) {
      return {
        valid: false,
        discountAmount: prismaDecimal(0),
        discountCode,
        error: "Código de descuento inactivo",
      };
    }

    // Check expiration (validUntil is stored as end-of-day in Argentina time, as a UTC timestamp)
    if (discountCode.validUntil) {
      const now = new Date();
      const validUntil = new Date(discountCode.validUntil);
      // Inclusive until validUntil (23:59:59). Expired only after that.
      if (now > validUntil) {
        return {
          valid: false,
          discountAmount: prismaDecimal(0),
          discountCode,
          error: "Código de descuento expirado",
        };
      }
    }

    // Check max uses
    if (
      discountCode.maxUses &&
      discountCode.usedCount >= discountCode.maxUses
    ) {
      return {
        valid: false,
        discountAmount: prismaDecimal(0),
        discountCode,
        error: "Código de descuento agotado",
      };
    }

    // Check min purchase
    const subtotalDec = prismaDecimal(subtotal);
    if (
      discountCode.minPurchase &&
      subtotalDec.lt(prismaDecimal(discountCode.minPurchase))
    ) {
      return {
        valid: false,
        discountAmount: prismaDecimal(0),
        discountCode,
        error: `Compra mínima de ${Number(discountCode.minPurchase).toFixed(
          2
        )} no alcanzada`,
      };
    }

    // Calculate discount
    let discountAmount = prismaDecimal(0);
    if (discountCode.discountType === "percentage") {
      discountAmount = subtotalDec
        .mul(prismaDecimal(discountCode.discountValue))
        .div(100);
    } else {
      discountAmount = prismaDecimal(discountCode.discountValue);
      // Don't allow discount to exceed subtotal
      if (discountAmount.gt(subtotalDec)) {
        discountAmount = subtotalDec;
      }
    }

    return {
      valid: true,
      discountAmount,
      discountCode,
    };
  }

  /**
   * Increment usage count when code is used
   */
  async incrementUsage(id: string): Promise<void> {
    await prisma.discountCode.update({
      where: { id },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });
  }
}
