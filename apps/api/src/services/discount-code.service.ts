import { PrismaClient, Prisma } from "@prisma/client";
import {
  CreateDiscountCodeDto,
  UpdateDiscountCodeDto,
  DiscountCodeWithInfluencer,
  LeadDiscountConfig,
} from "../shared/index.js";
import { prismaDecimal, prismaNumber } from "../utils/decimal.js";
import { DateTime } from "luxon";
import { customAlphabet } from "nanoid";

// Alfabeto sin caracteres ambiguos (sin 0, O, I, 1, l)
const nanoid = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 10);

import { prisma } from "../config/prisma.client.js";

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

const DEFAULT_LEAD_DISCOUNT_CONFIG: LeadDiscountConfig = {
  discountType: "percentage",
  discountValue: 15,
  validDays: 7,
};

// Prisma include fragment shared across all queries
const DISCOUNT_CODE_INCLUDE = {
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
  leadReservation: {
    select: {
      email: true,
      name: true,
    },
  },
} as const;

function normalizeExpiryToArgentinaEndOfDayUtc(input: string | Date): Date {
  let dateOnly: string;

  if (typeof input === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      dateOnly = input;
    } else {
      const parsed = DateTime.fromISO(input, { setZone: true });
      if (!parsed.isValid) throw new Error("Fecha de expiración inválida");
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

/**
 * Map a raw Prisma DiscountCode (with optional influencer include) to our DTO.
 * Handles nullable influencer gracefully — no more `!` assertions.
 */
function mapToDto(code: any): DiscountCodeWithInfluencer {
  return {
    id: code.id,
    code: code.code,
    codeType: code.codeType as "influencer" | "lead_reservation",
    influencerId: code.influencerId ?? null,
    discountType: code.discountType as "percentage" | "fixed",
    discountValue: Number(code.discountValue),
    commissionType: code.commissionType
      ? (code.commissionType as "percentage" | "fixed")
      : undefined,
    commissionValue: code.commissionValue
      ? Number(code.commissionValue)
      : undefined,
    minPurchase: code.minPurchase ? Number(code.minPurchase) : undefined,
    maxUses: code.maxUses ?? undefined,
    usedCount: code.usedCount,
    isActive: code.isActive,
    validFrom: code.validFrom,
    validUntil: code.validUntil ?? undefined,
    createdAt: code.createdAt,
    updatedAt: code.updatedAt,
    influencer: code.influencer
      ? {
        id: code.influencer.id,
        name: code.influencer.name,
        email: code.influencer.auth?.email || "",
      }
      : null,
    leadEmail: code.leadReservation?.email ?? undefined,
    leadName: code.leadReservation?.name ?? undefined,
  };
}

export class DiscountCodeService {
  /**
   * Create a new discount code (Admin only).
   * If influencerId is provided, validates the influencer exists and sets codeType = "influencer".
   * Otherwise, creates a generic code.
   */
  async create(
    data: CreateDiscountCodeDto
  ): Promise<DiscountCodeWithInfluencer> {
    // Validate code uniqueness
    const existingCode = await prisma.discountCode.findUnique({
      where: { code: data.code.toUpperCase().trim() },
    });

    if (existingCode) {
      throw new Error("El código ya existe");
    }

    // Validate influencer exists if provided
    let codeType: "influencer" | "lead_reservation" = "lead_reservation";
    if (data.influencerId) {
      const influencer = await prisma.influencer.findUnique({
        where: { id: data.influencerId },
      });
      if (!influencer) {
        throw new Error("Influencer no encontrado");
      }
      codeType = "influencer";

      // Commission config is required for influencer codes
      if (!data.commissionType || data.commissionValue === undefined || data.commissionValue === null) {
        throw new Error("La configuración de comisión es requerida para códigos de influencer");
      }
      if (data.commissionValue <= 0) {
        throw new Error("El valor de la comisión debe ser mayor a 0");
      }
      if (data.commissionType === "percentage" && data.commissionValue > 100) {
        throw new Error("El porcentaje de comisión no puede ser mayor a 100%");
      }
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
        influencerId: data.influencerId || null,
        codeType,
        discountType: data.discountType,
        discountValue: prismaNumber(prismaDecimal(data.discountValue)),
        commissionType:
          data.commissionType && data.influencerId
            ? data.commissionType
            : null,
        commissionValue:
          data.commissionValue !== undefined && data.influencerId
            ? prismaNumber(prismaDecimal(data.commissionValue))
            : null,
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
      include: DISCOUNT_CODE_INCLUDE,
    });

    return mapToDto(discountCode);
  }

  /**
   * Get all discount codes with optional filters (Admin)
   */
  async getAll(filters?: {
    influencerId?: string;
    isActive?: boolean;
    code?: string;
    codeType?: string;
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

    if (filters?.codeType) {
      where.codeType = filters.codeType as any;
    }

    const codes = await prisma.discountCode.findMany({
      where,
      include: DISCOUNT_CODE_INCLUDE,
      orderBy: {
        createdAt: "desc",
      },
    });

    return codes.map(mapToDto);
  }

  /**
   * Get discount code by ID
   */
  async getById(id: string): Promise<DiscountCodeWithInfluencer | null> {
    const code = await prisma.discountCode.findUnique({
      where: { id },
      include: DISCOUNT_CODE_INCLUDE,
    });

    if (!code) {
      return null;
    }

    return mapToDto(code);
  }

  /**
   * Get discount code by code string
   */
  async getByCode(code: string): Promise<DiscountCodeWithInfluencer | null> {
    const discountCode = await prisma.discountCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: DISCOUNT_CODE_INCLUDE,
    });

    if (!discountCode) {
      return null;
    }

    return mapToDto(discountCode);
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
      include: DISCOUNT_CODE_INCLUDE,
    });

    return mapToDto(updatedCode);
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

    // Check expiration
    if (discountCode.validUntil) {
      const now = new Date();
      const validUntil = new Date(discountCode.validUntil);
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

  // ─── Lead Reservation Codes ──────────────────────────────

  /**
   * Create an auto-generated discount code for a lead.
   * Reads discount config from AppConfig ("lead_discount_config").
   */
  async createLeadReservationCode(leadId: string): Promise<DiscountCodeWithInfluencer> {
    const config = await this.getLeadDiscountConfig();

    const code = nanoid(10).toUpperCase();

    const validUntil = DateTime.now()
      .setZone(ARGENTINA_TZ)
      .plus({ days: config.validDays })
      .endOf("day")
      .set({ millisecond: 0 })
      .toUTC()
      .toJSDate();

    const discountCode = await prisma.discountCode.create({
      data: {
        code,
        codeType: "lead_reservation",
        influencerId: null,
        discountType: config.discountType,
        discountValue: prismaNumber(prismaDecimal(config.discountValue)),
        maxUses: 1,
        validUntil,
        isActive: true,
        leadReservation: {
          connect: { id: leadId },
        },
      },
      include: DISCOUNT_CODE_INCLUDE,
    });

    return mapToDto(discountCode);
  }

  // ─── Lead Discount Config (AppConfig) ────────────────────

  /**
   * Get the current lead discount configuration.
   * Falls back to defaults if not yet configured.
   */
  async getLeadDiscountConfig(): Promise<LeadDiscountConfig> {
    const row = await prisma.appConfig.findUnique({
      where: { key: "lead_discount_config" },
    });

    if (!row) {
      return { ...DEFAULT_LEAD_DISCOUNT_CONFIG };
    }

    const value = row.value as Record<string, unknown>;
    return {
      discountType: (value.discountType as "percentage" | "fixed") || DEFAULT_LEAD_DISCOUNT_CONFIG.discountType,
      discountValue: (typeof value.discountValue === "number" ? value.discountValue : DEFAULT_LEAD_DISCOUNT_CONFIG.discountValue),
      validDays: (typeof value.validDays === "number" ? value.validDays : DEFAULT_LEAD_DISCOUNT_CONFIG.validDays),
    };
  }

  /**
   * Update the lead discount configuration (admin only).
   */
  async updateLeadDiscountConfig(config: LeadDiscountConfig): Promise<LeadDiscountConfig> {
    // Validate
    if (config.discountValue <= 0) {
      throw new Error("El valor del descuento debe ser mayor a 0");
    }
    if (config.discountType === "percentage" && config.discountValue > 100) {
      throw new Error("El porcentaje de descuento no puede ser mayor a 100%");
    }
    if (config.validDays <= 0) {
      throw new Error("Los días de validez deben ser mayor a 0");
    }

    await prisma.appConfig.upsert({
      where: { key: "lead_discount_config" },
      update: {
        value: {
          discountType: config.discountType,
          discountValue: config.discountValue,
          validDays: config.validDays,
        },
      },
      create: {
        key: "lead_discount_config",
        value: {
          discountType: config.discountType,
          discountValue: config.discountValue,
          validDays: config.validDays,
        },
      },
    });

    return config;
  }
}
