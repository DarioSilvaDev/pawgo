import { PrismaClient, Prisma, OrderStatus, ShipmentStatus } from "@prisma/client";
import { CreateOrderDto, OrderItem } from "../shared/index.js";
import { DiscountCodeService } from "./discount-code.service.js";
import { CommissionService } from "./commission.service.js";
import {
  prismaDecimal,
  prismaNumber,
  getEffectivePrice,
} from "../utils/decimal.js";
import { MiCorreoService } from "./micorreo/micorreo.service.js";
import { shippingConfig } from "../config/shipping.config.js";
import { prisma } from "../config/prisma.client.js";
import { eventDispatcher } from "./event-dispatcher.service.js";
import {
  OrderEventType,
  createEvent,
  type PaymentApprovedPayload,
  type PaymentRejectedPayload,
  type OrderCreatedPayload,
  type OrderShippedPayload,
} from "../shared/events.js";

// ─────────────────────────────────────────────────────────────
// State Machine — Valid Transitions
// ─────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.awaiting_payment]: [OrderStatus.paid, OrderStatus.cancelled],
  [OrderStatus.paid]: [
    OrderStatus.ready_to_ship,   // Admin marca el paquete como preparado
    OrderStatus.shipped,          // Atajo: admin carga tracking directamente
    OrderStatus.cancelled,
    OrderStatus.refunded,
  ],
  [OrderStatus.ready_to_ship]: [
    OrderStatus.shipped,          // Admin carga tracking y despacha
  ],
  [OrderStatus.shipped]: [OrderStatus.delivered],
  [OrderStatus.delivered]: [], // terminal
  [OrderStatus.cancelled]: [], // terminal
  [OrderStatus.refunded]: [],  // terminal
};

export class OrderService {
  private discountCodeService: DiscountCodeService;
  private commissionService: CommissionService;
  private miCorreoService: MiCorreoService;

  constructor(
    discountCodeService: DiscountCodeService,
    commissionService: CommissionService,
    miCorreoService: MiCorreoService
  ) {
    this.discountCodeService = discountCodeService;
    this.commissionService = commissionService;
    this.miCorreoService = miCorreoService;
  }

  // ─────────────────────────────────────────────────────────────
  // State Machine Guard
  // ─────────────────────────────────────────────────────────────

  /**
   * Validates a state transition is allowed.
   * Throws on invalid transition.
   */
  private assertValidTransition(current: OrderStatus, next: OrderStatus): void {
    const allowed = VALID_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new Error(
        `Transición inválida: ${current} → ${next}. Transiciones permitidas: [${allowed.join(", ") || "ninguna (estado terminal)"}]`
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Create Order
  // ─────────────────────────────────────────────────────────────

  /**
   * Create a new order with status AWAITING_PAYMENT
   */
  async create(data: CreateOrderDto) {
    const itemsWithDetails: OrderItem[] = [];
    let subtotal = prismaDecimal(0);

    for (const item of data.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true },
      });

      if (!product) {
        throw new Error(`Producto ${item.productId} no encontrado`);
      }
      if (!product.isActive) {
        throw new Error(`Producto ${product.name} no está disponible`);
      }

      let variant = null;
      if (item.variantId) {
        variant = product.variants.find((v: (typeof product.variants)[0]) => v.id === item.variantId);
        if (!variant) throw new Error(`Variante ${item.variantId} no encontrada`);
        if (!variant.isActive) throw new Error(`Variante ${variant.name} no está disponible`);
        if (variant.stock !== null && variant.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${variant.name}. Disponible: ${variant.stock}`);
        }
      } else {
        if (product.variants.length > 0) {
          variant = product.variants.find((v: (typeof product.variants)[0]) => v.isActive);
          if (!variant) throw new Error(`No hay variantes disponibles para ${product.name}`);
        }
      }

      const unitPrice = getEffectivePrice(product, variant);
      const itemSubtotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(itemSubtotal);

      itemsWithDetails.push({
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantName: variant?.name,
        size: variant?.size || undefined,
        quantity: item.quantity,
        unitPrice: prismaNumber(unitPrice),
        discount: 0,
        subtotal: prismaNumber(itemSubtotal),
        total: prismaNumber(itemSubtotal),
      });
    }

    // Create or update Lead
    let leadId: string | null = data.leadId ?? null;
    let leadEmail: string | undefined;
    let leadName: string | undefined;

    if (data.customerInfo) {
      const { email, name, lastName, dni, phoneNumber } = data.customerInfo;
      leadEmail = email;
      leadName = name || undefined;

      const existingLead = await prisma.lead.findFirst({ where: { email } });

      if (existingLead) {
        const updatedLead = await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            name: name || existingLead.name || undefined,
            lastName: lastName || existingLead.lastName || undefined,
            dni: dni || existingLead.dni || undefined,
            phoneNumber: phoneNumber || existingLead.phoneNumber || undefined,
          },
        });
        leadId = updatedLead.id;
      } else {
        const newLead = await prisma.lead.create({
          data: {
            email,
            name: name || undefined,
            lastName: lastName || undefined,
            dni: dni || undefined,
            phoneNumber: phoneNumber || undefined,
          },
        });
        leadId = newLead.id;
      }
    }

    const shippingCost = prismaDecimal(0);

    // Create order — status defaults to awaiting_payment (schema default)
    const order = await prisma.order.create({
      data: {
        leadId,
        subtotal: prismaNumber(subtotal),
        discount: 0,
        shippingCost: prismaNumber(shippingCost),
        total: prismaNumber(subtotal.add(shippingCost)),
        currency: "ARS",
        shippingAddress: data.shippingAddress
          ? (data.shippingAddress as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        shippingMethod: data.shippingMethod ?? null,
        itemsSnapshot: itemsWithDetails as unknown as Prisma.InputJsonValue,
        items: {
          create: itemsWithDetails.map((i) => ({
            productId: i.productId,
            productVariantId: i.variantId ?? null,
            name: i.variantName ? `${i.productName} - ${i.variantName}` : i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.subtotal,
            currency: "ARS",
            metadata: {
              productName: i.productName,
              variantName: i.variantName ?? null,
              size: i.size ?? null,
            } as unknown as Prisma.InputJsonValue,
          })),
        },
      },
    });

    // Apply discount code if provided
    let finalOrder = order;
    if (data.discountCode) {
      finalOrder = await this.applyDiscountCode(order.id, data.discountCode);
    }

    // Dispatch ORDER_CREATED event
    await eventDispatcher.dispatch(
      createEvent<OrderCreatedPayload>(OrderEventType.ORDER_CREATED, order.id, {
        orderId: order.id,
        leadEmail,
        leadName,
        total: prismaNumber(subtotal),
        currency: "ARS",
      })
    );

    return finalOrder;
  }

  // ─────────────────────────────────────────────────────────────
  // Apply Discount Code
  // ─────────────────────────────────────────────────────────────

  async applyDiscountCode(orderId: string, code: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new Error("Orden no encontrada");
    if (order.status !== OrderStatus.awaiting_payment) {
      throw new Error("Solo se pueden aplicar descuentos a órdenes en espera de pago");
    }

    const items = order.items;
    const orderSubtotal = prismaDecimal(order.subtotal);

    const validation = await this.discountCodeService.validateCode(code, orderSubtotal);
    if (!validation.valid || !validation.discountCode) {
      throw new Error(validation.error || "Código de descuento inválido");
    }

    const discountCode = validation.discountCode;
    const discountValue = prismaDecimal(discountCode.discountValue);
    const updatedItemDiscounts = items.map((item: (typeof items)[0]) => {
      const itemSubtotal = prismaDecimal(item.totalPrice);
      let itemDiscount = prismaDecimal(0);

      if (discountCode.discountType === "percentage") {
        itemDiscount = itemSubtotal.mul(discountValue).div(100);
      } else {
        const proportion = orderSubtotal.gt(0)
          ? itemSubtotal.div(orderSubtotal)
          : prismaDecimal(0);
        itemDiscount = discountValue.mul(proportion);
      }

      if (itemDiscount.gt(itemSubtotal)) itemDiscount = itemSubtotal;
      return { id: item.id, subtotal: itemSubtotal, discount: itemDiscount };
    });

    const totalDiscount = updatedItemDiscounts.reduce(
      (sum: ReturnType<typeof prismaDecimal>, item: (typeof updatedItemDiscounts)[0]) =>
        sum.add(prismaDecimal(item.discount)),
      prismaDecimal(0)
    );

    const newTotal = orderSubtotal
      .sub(totalDiscount)
      .add(prismaDecimal(order.shippingCost));

    await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      for (const item of updatedItemDiscounts) {
        const existingItem = items.find(i => i.id === item.id);
        const existingMetadata = (existingItem?.metadata as any) || {};

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            metadata: {
              ...existingMetadata,
              discount: prismaNumber(prismaDecimal(item.discount)),
              totalAfterDiscount: prismaNumber(prismaDecimal(item.subtotal.sub(item.discount))),
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          discountCodeId: discountCode.id,
          discount: prismaNumber(totalDiscount),
          total: prismaNumber(newTotal),
        },
      });
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!updatedOrder) throw new Error("Orden no encontrada");

    await this.discountCodeService.incrementUsage(discountCode.id);
    return updatedOrder;
  }

  // ─────────────────────────────────────────────────────────────
  // Get By ID
  // ─────────────────────────────────────────────────────────────

  async getById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        lead: true,
        discountCode: {
          include: {
            influencer: { select: { id: true, name: true } },
          },
        },
        payments: true,
        commission: true,
        shipment: true,
        eventLogs: { orderBy: { createdAt: "asc" } },
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
            productVariant: { select: { id: true, name: true, size: true } },
          },
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Get All (Admin)
  // ─────────────────────────────────────────────────────────────

  async getAll(options?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (options?.status) {
      where.status = options.status as OrderStatus;
    }

    if (options?.search) {
      where.OR = [
        { id: { contains: options.search, mode: "insensitive" } },
        { lead: { email: { contains: options.search, mode: "insensitive" } } },
        { lead: { name: { contains: options.search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          lead: {
            select: { id: true, email: true, name: true, dogSize: true, createdAt: true },
          },
          discountCode: {
            select: { id: true, code: true, discountType: true, discountValue: true },
          },
          payments: {
            select: { id: true, status: true, amount: true, currency: true, paymentMethod: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
          shipment: {
            select: { id: true, status: true, trackingNumber: true, createdAt: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true } },
              productVariant: { select: { id: true, name: true, size: true } },
            },
          },
          _count: { select: { items: true, payments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Update Status — State Machine + Event Dispatch
  // ─────────────────────────────────────────────────────────────

  /**
   * Transition order to a new status.
   * Validates the transition, persists changes, logs the event,
   * and dispatches domain events (email side-effects handled by subscribers).
   */
  async updateStatus(
    id: string,
    status: OrderStatus,
    meta?: {
      paymentId?: string;
      mercadoPagoPaymentId?: string;
      reason?: string;
    }
  ) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, lead: true },
    });

    if (!order) throw new Error("Orden no encontrada");

    const currentStatus = order.status;

    // ── Guard: validate transition ────────────────────────────
    this.assertValidTransition(currentStatus, status);

    // ── Persist new status ────────────────────────────────────
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: { lead: true },
    });

    // ── Log event ─────────────────────────────────────────────
    await prisma.orderEventLog.create({
      data: {
        orderId: id,
        event: status.toUpperCase(),
        fromStatus: currentStatus,
        toStatus: status,
        payload: meta ? (meta as unknown as Prisma.InputJsonValue) : undefined,
      },
    });

    const leadEmail = updatedOrder.lead?.email;
    const leadName = updatedOrder.lead?.name || "Cliente";

    // ── Side-effects when order is PAID ───────────────────────
    if (status === OrderStatus.paid) {
      // Update stock
      for (const item of order.items) {
        if (item.productVariantId) {
          await prisma.productVariant.update({
            where: { id: item.productVariantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
      // Create commission if discount code was used
      if (order.discountCodeId) {
        await this.commissionService.createFromOrder(order.id);
      }

      // Dispatch PAYMENT_APPROVED event (email handled by subscriber)
      await eventDispatcher.dispatch(
        createEvent<PaymentApprovedPayload>(
          OrderEventType.PAYMENT_APPROVED,
          id,
          {
            orderId: id,
            paymentId: meta?.paymentId ?? "",
            mercadoPagoPaymentId: meta?.mercadoPagoPaymentId ?? "",
            amount: prismaNumber(prismaDecimal(updatedOrder.total)),
            currency: updatedOrder.currency,
            leadEmail,
            leadName,
          }
        )
      );
    }

    // ── Side-effects when order is CANCELLED ─────────────────
    if (status === OrderStatus.cancelled) {
      await eventDispatcher.dispatch(
        createEvent<PaymentRejectedPayload>(
          OrderEventType.PAYMENT_REJECTED,
          id,
          {
            orderId: id,
            paymentId: meta?.paymentId ?? "",
            mercadoPagoPaymentId: meta?.mercadoPagoPaymentId ?? "",
            reason: meta?.reason,
            leadEmail,
            leadName,
          }
        )
      );
    }

    // ── Side-effects when order is REFUNDED ──────────────────
    if (status === OrderStatus.refunded) {
      await eventDispatcher.dispatch(
        createEvent(OrderEventType.ORDER_REFUNDED, id, {
          orderId: id,
          leadEmail,
          leadName,
        })
      );
    }

    return updatedOrder;
  }

  // ─────────────────────────────────────────────────────────────
  // Calculate Totals
  // ─────────────────────────────────────────────────────────────

  async calculateTotals(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Orden no encontrada");

    return {
      subtotal: prismaNumber(order.subtotal),
      discount: prismaNumber(order.discount),
      shippingCost: prismaNumber(prismaDecimal(order.shippingCost)),
      total: prismaNumber(order.total),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Calculate Shipping Cost (MiCorreo quote)
  // ─────────────────────────────────────────────────────────────

  /**
   * Calculate and register real shipping cost from MiCorreo.
   * Customer always pays $0 — we track real cost for analytics.
   */
  async calculateShippingCost(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lead: true },
    });

    if (!order) throw new Error("Orden no encontrada");

    if (!order.shippingAddress) {
      console.warn(`⚠️ [Shipping] Orden ${orderId} no tiene dirección de envío`);
      return null;
    }

    const shippingAddress = order.shippingAddress as any;

    try {
      const miCorreoCustomer = await prisma.miCorreoCustomer.findFirst({
        where: { documentId: "20337224351" },
      });

      if (!miCorreoCustomer) {
        console.warn(
          `⚠️ [Shipping] No se encontró cliente MiCorreo para orden ${orderId}.`
        );
        return null;
      }

      const quote = await this.miCorreoService.getRates({
        customerId: miCorreoCustomer.customerId,
        postalCodeOrigin: shippingConfig.originPostalCode,
        postalCodeDestination: shippingAddress.zipCode,
        dimensions: shippingConfig.standardPackage,
      });

      if (!quote.rates || quote.rates.length === 0) {
        console.warn(`⚠️ [Shipping] No se encontraron tarifas para orden ${orderId}`);
        return null;
      }

      const selectedRate = quote.rates.find(
        (el) => el.productName === "Correo Argentino Clasico" && el.deliveredType === "D"
      );

      if (!selectedRate) {
        console.warn(`⚠️ [Shipping] No se encontró tarifa específica para orden ${orderId}`);
        return null;
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          miCorreoShippingCost: selectedRate.price,
          miCorreoShippingQuote: quote as any,
          miCorreoCustomerId: miCorreoCustomer.customerId,
          miCorreoDeliveryType: selectedRate.deliveredType,
          miCorreoProductType: selectedRate.productType,
          shippingSubsidyAmount: selectedRate.price,
        },
      });

      console.log(`✅ [Shipping] Costo calculado para orden ${orderId}: $${selectedRate.price}`);

      return {
        realCost: selectedRate.price,
        customerCost: 0,
        subsidyAmount: selectedRate.price,
        deliveryTime: { min: selectedRate.deliveryTimeMin, max: selectedRate.deliveryTimeMax },
        productName: selectedRate.productName,
      };
    } catch (error) {
      console.error(`❌ [Shipping] Error calculando costo para orden ${orderId}:`, error);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Update Order Status (simple admin transition — no tracking)
  // ─────────────────────────────────────────────────────────────

  /**
   * Transitions an order to a new status without requiring additional data.
   * Used by admin for transitions like paid → ready_to_ship.
   * Validates transition via state machine guard.
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    adminId?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error("Orden no encontrada");

    this.assertValidTransition(order.status, newStatus);

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    await prisma.orderEventLog.create({
      data: {
        orderId,
        event: `ADMIN_STATUS_UPDATE_${newStatus.toUpperCase()}`,
        fromStatus: order.status,
        toStatus: newStatus,
        payload: { adminId: adminId ?? null } as unknown as Prisma.InputJsonValue,
      },
    });

    return updatedOrder;
  }

  // ─────────────────────────────────────────────────────────────
  // Add Tracking Number (paid | ready_to_ship → shipped)
  // ─────────────────────────────────────────────────────────────

  /**
   * Admin carga el número de seguimiento de Correo Argentino desde el dashboard.
   * Guard: la orden DEBE estar en `paid` o `ready_to_ship`.
   * Idempotente: si ya existe tracking, lanza 409.
   * Dispara: transición → shipped + email al cliente.
   */
  async addTrackingNumber(
    orderId: string,
    trackingNumber: string,
    adminId?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lead: true, shipment: true },
    });

    if (!order) throw new Error("Orden no encontrada");

    // Guard: solo paid o ready_to_ship
    if (
      order.status !== OrderStatus.paid &&
      order.status !== OrderStatus.ready_to_ship
    ) {
      throw new Error(
        `Solo se puede cargar seguimiento en órdenes con estado 'paid' o 'ready_to_ship'. Estado actual: ${order.status}`
      );
    }

    // Idempotencia: no sobrescribir tracking existente
    if (order.shipment?.trackingNumber) {
      throw new Error(
        `Esta orden ya tiene número de seguimiento: ${order.shipment.trackingNumber}. No se puede modificar.`
      );
    }

    const fromStatus = order.status;
    const now = new Date();

    // Transacción atómica: Shipment + Order status + EventLog
    let updatedOrder: Awaited<ReturnType<typeof prisma.order.update>> & { lead: { email: string; name: string | null } | null };
    let shipment: Awaited<ReturnType<typeof prisma.shipment.upsert>>;

    ({ updatedOrder, shipment } = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      const upsertedShipment = await tx.shipment.upsert({
        where: { orderId },
        create: {
          orderId,
          status: ShipmentStatus.in_transit,
          trackingNumber,
          carrier: "correo_argentino",
          shippedAt: now,
          shippedByAdminId: adminId ?? null,
        },
        update: {
          status: ShipmentStatus.in_transit,
          trackingNumber,
          shippedAt: now,
          shippedByAdminId: adminId ?? null,
        },
      });

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.shipped },
        include: { lead: { select: { email: true, name: true } } },
      });

      await tx.orderEventLog.create({
        data: {
          orderId,
          event: "TRACKING_ADDED",
          fromStatus,
          toStatus: OrderStatus.shipped,
          payload: {
            trackingNumber,
            adminId: adminId ?? null,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return { updatedOrder: updated, shipment: upsertedShipment };
    }));

    // Email (fuera de TX — no hace rollback si falla)
    const leadEmail = updatedOrder.lead?.email;
    const leadName = updatedOrder.lead?.name ?? "Cliente";

    if (leadEmail) {
      await eventDispatcher.dispatch(
        createEvent<OrderShippedPayload>(
          OrderEventType.ORDER_SHIPPED,
          orderId,
          {
            orderId,
            trackingNumber,
            carrier: "Correo Argentino",
            leadEmail,
            leadName,
          }
        )
      );
    }

    return { order: updatedOrder, shipment };
  }
}
