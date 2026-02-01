import { PrismaClient, Prisma } from "@prisma/client";
import { CreateOrderDto, OrderItem } from "../../../../packages/shared/dist/index.js";
import { DiscountCodeService } from "./discount-code.service.js";
import { CommissionService } from "./commission.service.js";
import { emailService } from "./email.service.js";
import {
  prismaDecimal,
  prismaNumber,
  getEffectivePrice,
} from "../utils/decimal.js";

const prisma = new PrismaClient();

export class OrderService {
  private discountCodeService: DiscountCodeService;
  private commissionService: CommissionService;

  constructor(
    discountCodeService: DiscountCodeService,
    commissionService: CommissionService
  ) {
    this.discountCodeService = discountCodeService;
    this.commissionService = commissionService;
  }

  /**
   * Create a new order
   */
  async create(data: CreateOrderDto) {
    // Validate products and variants exist
    const itemsWithDetails: OrderItem[] = [];
    let subtotal = prismaDecimal(0);

    for (const item of data.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          variants: true,
        },
      });

      if (!product) {
        throw new Error(`Producto ${item.productId} no encontrado`);
      }

      if (!product.isActive) {
        throw new Error(`Producto ${product.name} no está disponible`);
      }

      // Get variant if specified
      let variant = null;
      if (item.variantId) {
        variant = product.variants.find((v: (typeof product.variants)[0]) => v.id === item.variantId);
        if (!variant) {
          throw new Error(`Variante ${item.variantId} no encontrada`);
        }
        if (!variant.isActive) {
          throw new Error(`Variante ${variant.name} no está disponible`);
        }
        if (variant.stock !== null && variant.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente para ${variant.name}. Disponible: ${variant.stock}`
          );
        }
      } else {
        // If no variant specified, use first active variant or base price
        if (product.variants.length > 0) {
          variant = product.variants.find((v: (typeof product.variants)[0]) => v.isActive);
          if (!variant) {
            throw new Error(
              `No hay variantes disponibles para ${product.name}`
            );
          }
        }
      }

      // Calcular precio efectivo según reglas de negocio
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
        discount: 0, // Will be calculated when discount code is applied
        subtotal: prismaNumber(itemSubtotal),
        total: prismaNumber(itemSubtotal),
      });
    }

    // Lead info will be retrieved when sending email confirmation

    // Calculate shipping cost based on zip code
    // 2900 = free shipping, others = 0 for now (próximamente)
    let shippingCost = prismaDecimal(0);
    if (data.shippingAddress?.zipCode === "2900") {
      shippingCost = prismaDecimal(0); // Free shipping for San Nicolas de los Arroyos
    } else if (data.shippingAddress?.zipCode) {
      shippingCost = prismaDecimal(0); // Por ahora 0 para otros códigos (próximamente)
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        leadId: data.leadId ?? null,
        status: "pending",
        subtotal: prismaNumber(subtotal),
        discount: 0,
        shippingCost: prismaNumber(shippingCost),
        total: prismaNumber(subtotal.add(shippingCost)),
        currency: "ARS",
        shippingAddress: data.shippingAddress
          ? (data.shippingAddress as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        shippingMethod: data.shippingMethod ?? null,
        // Snapshot histórico: fuente de verdad histórica (mapeado a columna "items")
        itemsSnapshot: itemsWithDetails as unknown as Prisma.InputJsonValue,
        // Items normalizados (relación) para reporting/queries
        items: {
          create: itemsWithDetails.map((i) => ({
            productId: i.productId,
            productVariantId: i.variantId ?? null,
            name: i.variantName
              ? `${i.productName} - ${i.variantName}`
              : i.productName,
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

    // Note: Stock will be updated when order status changes to "paid"

    // Apply discount code if provided
    let finalOrder = order;
    if (data.discountCode) {
      finalOrder = await this.applyDiscountCode(order.id, data.discountCode);
    }

    // Send order confirmation email if lead exists
    if (finalOrder.leadId) {
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: finalOrder.leadId },
        });

        if (lead && lead.email) {
          await emailService.sendOrderConfirmation(
            lead.email,
            lead.name || "Cliente",
            finalOrder.id,
            prismaNumber(prismaDecimal(finalOrder.total)),
            finalOrder.currency
          );
        }
      } catch (error) {
        console.error("Error sending order confirmation email:", error);
        // Don't fail order creation if email fails
      }
    }

    return finalOrder;
  }

  /**
   * Apply discount code to order
   * The discount is applied to each item individually
   */
  async applyDiscountCode(orderId: string, code: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error("Orden no encontrada");
    }

    if (order.status !== "pending") {
      throw new Error("Solo se pueden aplicar descuentos a órdenes pendientes");
    }

    // Validate discount code
    const items = order.items;
    const orderSubtotal = prismaDecimal(order.subtotal);

    const validation = await this.discountCodeService.validateCode(
      code,
      orderSubtotal
    );

    if (!validation.valid || !validation.discountCode) {
      throw new Error(validation.error || "Código de descuento inválido");
    }

    const discountCode = validation.discountCode;

    // Apply discount to each item
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

      return {
        id: item.id,
        subtotal: itemSubtotal,
        discount: itemDiscount,
      };
    });

    // Calculate total discount
    const totalDiscount = updatedItemDiscounts.reduce(
      (sum: ReturnType<typeof prismaDecimal>, item: (typeof updatedItemDiscounts)[0]) => sum.add(prismaDecimal(item.discount)),
      prismaDecimal(0)
    );

    // Calculate new total
    const newTotal = orderSubtotal
      .sub(totalDiscount)
      .add(prismaDecimal(order.shippingCost));

    // Persist item-level discount breakdown in OrderItem.metadata (itemsSnapshot remains immutable)
    await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      for (const item of updatedItemDiscounts) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            metadata: {
              discount: prismaNumber(prismaDecimal(item.discount)),
              totalAfterDiscount: prismaNumber(
                prismaDecimal(item.subtotal.sub(item.discount))
              ),
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
    if (!updatedOrder) {
      throw new Error("Orden no encontrada");
    }

    // Increment usage count
    await this.discountCodeService.incrementUsage(discountCode.id);

    return updatedOrder;
  }

  /**
   * Get order by ID
   */
  async getById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        lead: true,
        discountCode: {
          include: {
            influencer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payments: true,
        commission: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
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
    });
  }

  /**
   * Get all orders with pagination and filters (for admin)
   */
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
      where.status = options.status as any;
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
            select: {
              id: true,
              email: true,
              name: true,
              dogSize: true,
              createdAt: true,
            },
          },
          discountCode: {
            select: {
              id: true,
              code: true,
              discountType: true,
              discountValue: true,
            },
          },
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              paymentMethod: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
              productVariant: {
                select: {
                  id: true,
                  name: true,
                  size: true,
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
              payments: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, status: "pending" | "paid" | "cancelled") {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new Error("Orden no encontrada");
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        lead: true,
      },
    });

    // If order is paid, update stock and create commission
    if (status === "paid") {
      // Update stock for each item
      for (const item of order.items) {
        if (item.productVariantId) {
          await prisma.productVariant.update({
            where: { id: item.productVariantId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // Create commission if order has discount code
      if (order.discountCodeId) {
        await this.commissionService.createFromOrder(order.id);
      }
    }

    // Send email notification when order is paid
    if (status === "paid" && updatedOrder.lead) {
      try {
        await emailService.sendOrderConfirmation(
          updatedOrder.lead.email,
          updatedOrder.lead.name || "Cliente",
          updatedOrder.id,
          prismaNumber(prismaDecimal(updatedOrder.total)),
          updatedOrder.currency
        );
      } catch (error) {
        console.error("Error sending order paid confirmation email:", error);
        // Don't fail status update if email fails
      }
    }

    return updatedOrder;
  }

  /**
   * Calculate order totals
   */
  async calculateTotals(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error("Orden no encontrada");
    }

    return {
      subtotal: prismaNumber(order.subtotal),
      discount: prismaNumber(order.discount),
      shippingCost: prismaNumber(prismaDecimal(order.shippingCost)),
      total: prismaNumber(order.total),
    };
  }
}
