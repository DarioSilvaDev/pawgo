import { PrismaClient, Prisma, OrderStatus } from "@prisma/client";
import { CreateOrderDto, OrderItem } from "../shared/index.js";
import { DiscountCodeService } from "./discount-code.service.js";
import { CommissionService } from "./commission.service.js";
import { emailService } from "./email.service.js";
import {
  prismaDecimal,
  prismaNumber,
  getEffectivePrice,
} from "../utils/decimal.js";
import { MiCorreoService } from "./micorreo/micorreo.service.js";
import { shippingConfig } from "../config/shipping.config.js";

import { prisma } from "../config/prisma.client.js";

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

    // Create or update Lead with customer info if provided
    let leadId: string | null = data.leadId ?? null;

    if (data.customerInfo) {
      const { email, name, lastName, dni, phoneNumber } = data.customerInfo;

      // Try to find existing lead by email
      const existingLead = await prisma.lead.findFirst({
        where: { email },
      });

      if (existingLead) {
        // Update existing lead with new information
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
        // Create new lead
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

    // Free shipping
    const shippingCost = prismaDecimal(0);

    // Create order
    const order = await prisma.order.create({
      data: {
        leadId: leadId,
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
  async updateStatus(id: string, status: OrderStatus) {
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
    if (status === OrderStatus.paid) {
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

    // Send email notification when order is paid or cancelled
    console.log("🚀 ~ OrderService ~ updateStatus ~ updatedOrder:", updatedOrder)
    if (updatedOrder.lead) {
      try {
        if (status === OrderStatus.paid) {
          await emailService.sendOrderConfirmation(
            updatedOrder.lead.email,
            updatedOrder.lead.name || "Cliente",
            updatedOrder.id,
            prismaNumber(prismaDecimal(updatedOrder.total)),
            updatedOrder.currency
          );
        } else if (status === OrderStatus.cancelled) {
          await emailService.sendOrderPaymentProblem(
            updatedOrder.lead.email,
            updatedOrder.lead.name || "Cliente",
            updatedOrder.id
          );
        }
      } catch (error) {
        console.error("Error sending order status email:", error);
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

  /**
   * Calculate and register real shipping cost from MiCorreo
   * Customer always pays $0, but we track the real cost for analytics
   */
  async calculateShippingCost(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lead: true },
    });

    if (!order) {
      throw new Error("Orden no encontrada");
    }

    if (!order.shippingAddress) {
      console.warn(`⚠️ [Shipping] Orden ${orderId} no tiene dirección de envío`);
      return null;
    }

    const shippingAddress = order.shippingAddress as any;

    try {
      // Get or create MiCorreo customer
      const miCorreoCustomer = await prisma.miCorreoCustomer.findFirst({
        where: { documentId: '33722435' },
      });

      // If no customer exists, we can't get a shipping quote
      if (!miCorreoCustomer) {
        console.warn(
          `⚠️ [Shipping] No se encontró cliente MiCorreo (documentId: 33722435) para orden ${orderId}. ` +
          `Es necesario registrar el cliente en la tabla MiCorreoCustomer.`
        );
        return null;
      }

      // Get shipping quote from MiCorreo with standard package dimensions
      const quote = await this.miCorreoService.getRates({
        customerId: miCorreoCustomer.customerId,
        postalCodeOrigin: shippingConfig.originPostalCode,
        postalCodeDestination: shippingAddress.zipCode,   // ← el campo real del objeto Address
        dimensions: shippingConfig.standardPackage,
      });

      if (!quote.rates || quote.rates.length === 0) {
        console.warn(`⚠️ [Shipping] No se encontraron tarifas para orden ${orderId}`);
        return null;
      }

      // Select the most economical rate
      const selectedRate = quote.rates.find(el => el.productType === "Correo Argentino Clasico" && el.deliveredType === "D"
      );
      if (!selectedRate) {
        console.warn(`⚠️ [Shipping] No se encontró tarifa específica para orden ${orderId}`);
        return null;
      }

      // Update order with shipping information
      await prisma.order.update({
        where: { id: orderId },
        data: {
          miCorreoShippingCost: selectedRate.price,
          miCorreoShippingQuote: quote as any,
          miCorreoCustomerId: miCorreoCustomer.customerId,
          miCorreoDeliveryType: selectedRate.deliveredType,
          miCorreoProductType: selectedRate.productType,
          shippingSubsidyAmount: selectedRate.price, // Full subsidy
          // shippingCost remains 0 for customer
        },
      });

      console.log(`✅ [Shipping] Costo calculado para orden ${orderId}: $${selectedRate.price} (subsidiado)`);

      return {
        realCost: selectedRate.price,
        customerCost: 0,
        subsidyAmount: selectedRate.price,
        deliveryTime: {
          min: selectedRate.deliveryTimeMin,
          max: selectedRate.deliveryTimeMax,
        },
        productName: selectedRate.productName,
      };
    } catch (error) {
      console.error(`❌ [Shipping] Error calculando costo para orden ${orderId}:`, error);
      // Don't fail the order if shipping calculation fails
      return null;
    }
  }
}
