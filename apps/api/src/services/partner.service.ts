import {
  PartnerCommissionStatus,
  PartnerInventoryMovementType,
  PartnerReferralSourceType,
  PickupRequestStatus,
  Prisma,
} from "@prisma/client";
import { nanoid } from "nanoid";
import {
  prismaDecimal,
  prismaNumber,
} from "../utils/decimal.js";
import { prisma } from "../config/prisma.client.js";
import {
  CreatePartnerDto,
  CreatePartnerPointDto,
  CreatePartnerReferralSourceDto,
  CreatePartnerWholesaleSaleDto,
  UpdatePartnerDto,
  UpdatePartnerPointDto,
} from "../shared/index.js";
import { emailService } from "./email.service.js";

const PARTNER_COMMISSION_RATE = prismaDecimal(10);

export class PartnerService {
  async getAllPartners() {
    return prisma.partner.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        points: {
          orderBy: { createdAt: "desc" },
        },
        referralSources: {
          orderBy: { createdAt: "desc" },
          include: {
            partnerPoint: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            commissions: true,
            wholesaleSales: true,
            attributions: true,
          },
        },
      },
    });
  }

  async createPartner(data: CreatePartnerDto) {
    return prisma.partner.create({
      data: {
        name: data.name,
        slug: data.slug.toLowerCase(),
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        notes: data.notes,
      },
    });
  }

  async updatePartner(id: string, data: UpdatePartnerDto) {
    return prisma.partner.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug?.toLowerCase(),
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        notes: data.notes,
        isActive: data.isActive,
      },
    });
  }

  async createPartnerPoint(partnerId: string, data: CreatePartnerPointDto) {
    return prisma.partnerPoint.create({
      data: {
        partnerId,
        name: data.name,
        city: data.city,
        state: data.state,
        address: data.address as Prisma.InputJsonValue,
        pickupEnabled: data.pickupEnabled ?? true,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updatePartnerPoint(pointId: string, data: UpdatePartnerPointDto) {
    return prisma.partnerPoint.update({
      where: { id: pointId },
      data: {
        name: data.name,
        city: data.city,
        state: data.state,
        address: data.address as Prisma.InputJsonValue,
        pickupEnabled: data.pickupEnabled,
        isActive: data.isActive,
      },
    });
  }

  async createReferralSource(partnerId: string, data: CreatePartnerReferralSourceDto) {
    const sourceType = data.sourceType ?? "local_qr";
    const slug = (data.slug || nanoid(10)).toLowerCase();

    if (data.partnerPointId) {
      const point = await prisma.partnerPoint.findUnique({
        where: { id: data.partnerPointId },
        select: { partnerId: true },
      });
      if (!point || point.partnerId !== partnerId) {
        throw new Error("El punto seleccionado no pertenece al partner");
      }
    }

    return prisma.partnerReferralSource.create({
      data: {
        partnerId,
        partnerPointId: data.partnerPointId ?? null,
        sourceType: sourceType as PartnerReferralSourceType,
        slug,
        code: data.code?.trim().toUpperCase() || null,
        landingTarget: data.landingTarget || "checkout",
      },
      include: {
        partner: {
          select: { id: true, name: true, slug: true },
        },
        partnerPoint: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
    });
  }

  async resolveReferralBySlug(slug: string) {
    return prisma.partnerReferralSource.findFirst({
      where: {
        slug: slug.toLowerCase(),
        isActive: true,
        partner: { isActive: true },
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
        partnerPoint: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            pickupEnabled: true,
            isActive: true,
          },
        },
      },
    });
  }

  async listPickupPoints() {
    return prisma.partnerPoint.findMany({
      where: {
        isActive: true,
        pickupEnabled: true,
        partner: {
          isActive: true,
        },
      },
      orderBy: [
        { state: "asc" },
        { city: "asc" },
        { name: "asc" },
      ],
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async attachAttributionToOrder(orderId: string, referralSlug: string) {
    const source = await this.resolveReferralBySlug(referralSlug);
    if (!source) {
      throw new Error("Referencia de partner inválida o inactiva");
    }

    return prisma.orderAttribution.upsert({
      where: { orderId },
      update: {
        partnerId: source.partnerId,
        referralSourceId: source.id,
        partnerPointId: source.partnerPointId,
        attributionMethod: source.sourceType,
      },
      create: {
        orderId,
        partnerId: source.partnerId,
        referralSourceId: source.id,
        partnerPointId: source.partnerPointId,
        attributionMethod: source.sourceType,
      },
    });
  }

  async hasPartnerAttribution(orderId: string) {
    const count = await prisma.orderAttribution.count({
      where: { orderId },
    });
    return count > 0;
  }

  async createCommissionFromPaidOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        attribution: true,
        partnerCommission: true,
      },
    });

    if (!order?.attribution) {
      return null;
    }

    if (order.partnerCommission) {
      return order.partnerCommission;
    }

    const baseAmount = prismaDecimal(order.subtotal).sub(prismaDecimal(order.discount));
    const safeBase = baseAmount.greaterThan(0) ? baseAmount : prismaDecimal(0);
    const commissionAmount = safeBase.mul(PARTNER_COMMISSION_RATE).div(100);

    return prisma.partnerCommission.create({
      data: {
        orderId,
        partnerId: order.attribution.partnerId,
        orderAttributionId: order.attribution.id,
        baseAmount: prismaNumber(safeBase),
        commissionRate: prismaNumber(PARTNER_COMMISSION_RATE),
        commissionAmount: prismaNumber(commissionAmount),
        status: PartnerCommissionStatus.pending,
      },
    });
  }

  async cancelCommissionByOrder(orderId: string) {
    await prisma.partnerCommission.updateMany({
      where: {
        orderId,
        status: PartnerCommissionStatus.pending,
      },
      data: {
        status: PartnerCommissionStatus.cancelled,
        cancelledAt: new Date(),
      },
    });
  }

  async createWholesaleSale(
    partnerId: string,
    data: CreatePartnerWholesaleSaleDto,
    createdByAuthId?: string
  ) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true },
    });
    if (!partner) {
      throw new Error("Partner no encontrado");
    }

    if (!data.items.length) {
      throw new Error("Debe incluir al menos un item en la venta mayorista");
    }

    const variants = await prisma.productVariant.findMany({
      where: {
        id: { in: data.items.map((item) => item.productVariantId) },
      },
      select: {
        id: true,
        name: true,
        size: true,
        product: {
          select: { id: true, name: true },
        },
      },
    });

    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

    for (const item of data.items) {
      if (!variantsById.has(item.productVariantId)) {
        throw new Error(`Variante no encontrada: ${item.productVariantId}`);
      }
    }

    const parsedItems = data.items.map((item) => {
      const unitWholesalePrice = prismaDecimal(item.unitWholesalePrice);
      const unitCost = prismaDecimal(item.unitCost);
      const quantity = item.quantity;

      if (quantity <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }
      if (unitWholesalePrice.lessThan(0) || unitCost.lessThan(0)) {
        throw new Error("Los precios no pueden ser negativos");
      }

      const totalRevenue = unitWholesalePrice.mul(quantity);
      const totalCost = unitCost.mul(quantity);
      const totalProfit = totalRevenue.sub(totalCost);

      return {
        ...item,
        totalRevenue,
        totalCost,
        totalProfit,
      };
    });

    const totalQuantity = parsedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = parsedItems.reduce(
      (sum, item) => sum.add(item.totalRevenue),
      prismaDecimal(0)
    );
    const totalCost = parsedItems.reduce(
      (sum, item) => sum.add(item.totalCost),
      prismaDecimal(0)
    );
    const totalProfit = totalRevenue.sub(totalCost);

    return prisma.$transaction(async (tx) => {
      const sale = await tx.partnerWholesaleSale.create({
        data: {
          partnerId,
          soldAt: data.soldAt ? new Date(data.soldAt) : new Date(),
          invoiceNumber: data.invoiceNumber,
          notes: data.notes,
          totalQuantity,
          totalRevenue: prismaNumber(totalRevenue),
          totalCost: prismaNumber(totalCost),
          totalProfit: prismaNumber(totalProfit),
          createdByAuthId,
          items: {
            create: parsedItems.map((item) => ({
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitWholesalePrice: prismaNumber(prismaDecimal(item.unitWholesalePrice)),
              unitCost: prismaNumber(prismaDecimal(item.unitCost)),
              totalRevenue: prismaNumber(item.totalRevenue),
              totalCost: prismaNumber(item.totalCost),
              totalProfit: prismaNumber(item.totalProfit),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      await tx.partnerInventoryMovement.createMany({
        data: parsedItems.map((item) => ({
          partnerId,
          wholesaleSaleId: sale.id,
          productVariantId: item.productVariantId,
          movementType: PartnerInventoryMovementType.inbound_wholesale,
          quantity: item.quantity,
          occurredAt: sale.soldAt,
          notes: data.notes ?? null,
        })),
      });

      return tx.partnerWholesaleSale.findUnique({
        where: { id: sale.id },
        include: {
          partner: {
            select: { id: true, name: true, slug: true },
          },
          items: {
            include: {
              productVariant: {
                include: {
                  product: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      });
    });
  }

  async listWholesaleSales(partnerId?: string) {
    return prisma.partnerWholesaleSale.findMany({
      where: {
        partnerId: partnerId ?? undefined,
      },
      orderBy: { soldAt: "desc" },
      include: {
        partner: {
          select: { id: true, name: true, slug: true },
        },
        items: {
          include: {
            productVariant: {
              include: {
                product: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async createPickupRequest(orderId: string, partnerPointId: string) {
    const point = await prisma.partnerPoint.findFirst({
      where: {
        id: partnerPointId,
        isActive: true,
        pickupEnabled: true,
      },
      select: { id: true },
    });

    if (!point) {
      throw new Error("Punto PawGo inválido o inactivo");
    }

    return prisma.pickupRequest.upsert({
      where: { orderId },
      update: {
        partnerPointId,
        status: PickupRequestStatus.awaiting_stock,
        readyAt: null,
        notifiedAt: null,
      },
      create: {
        orderId,
        partnerPointId,
        status: PickupRequestStatus.awaiting_stock,
      },
    });
  }

  async ensurePickupPointAvailable(partnerPointId: string) {
    const point = await prisma.partnerPoint.findFirst({
      where: {
        id: partnerPointId,
        isActive: true,
        pickupEnabled: true,
      },
      select: {
        id: true,
      },
    });

    if (!point) {
      throw new Error("Punto PawGo inválido o inactivo");
    }

    return point;
  }

  async listPickupRequests(status?: PickupRequestStatus) {
    return prisma.pickupRequest.findMany({
      where: {
        status: status ?? undefined,
      },
      include: {
        order: {
          include: {
            lead: true,
            items: {
              include: {
                productVariant: {
                  select: {
                    id: true,
                    name: true,
                    size: true,
                  },
                },
              },
            },
          },
        },
        partnerPoint: {
          include: {
            partner: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async markPickupReady(pickupRequestId: string, note?: string) {
    const pickup = await prisma.pickupRequest.findUnique({
      where: { id: pickupRequestId },
      include: {
        order: {
          include: {
            lead: true,
          },
        },
        partnerPoint: {
          include: {
            partner: true,
          },
        },
      },
    });

    if (!pickup) {
      throw new Error("Solicitud de retiro no encontrada");
    }

    if (pickup.status === PickupRequestStatus.ready_notified) {
      return pickup;
    }

    const now = new Date();

    const updated = await prisma.pickupRequest.update({
      where: { id: pickupRequestId },
      data: {
        status: PickupRequestStatus.ready_notified,
        readyAt: now,
        notifiedAt: now,
      },
      include: {
        order: {
          include: {
            lead: true,
          },
        },
        partnerPoint: {
          include: {
            partner: true,
          },
        },
      },
    });

    const customerEmail = updated.order.lead?.email;
    if (customerEmail) {
      await emailService.sendPickupReadyNotification({
        to: customerEmail,
        customerName: updated.order.lead?.name || "Cliente",
        orderId: updated.order.id,
        pickupPointName: updated.partnerPoint.name,
        partnerName: updated.partnerPoint.partner.name,
        note,
      });
    }

    return updated;
  }
}
