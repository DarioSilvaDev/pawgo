import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  CreateOrderDto,
  ApplyDiscountCodeDto,
  Order,
  OrderItem,
} from "../shared/index.js";
import { OrderService } from "../services/order.service.js";
import { MercadoPagoService } from "../services/mercadopago.service.js";
import { PrismaClient, Prisma } from "@prisma/client";
import { prismaDecimal, prismaNumber } from "../utils/decimal.js";
import { Address, OrderStatus } from "../shared/index.js";

const prisma = new PrismaClient();

function isAddress(value: unknown): value is Address {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.street === "string" &&
    typeof v.city === "string" &&
    typeof v.state === "string" &&
    typeof v.zipCode === "string" &&
    typeof v.country === "string"
  );
}

// Validation schemas
const createOrderSchema = z.object({
  leadId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID es requerido"),
        variantId: z.string().optional(),
        quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
      })
    )
    .min(1, "Debe haber al menos un producto"),
  shippingAddress: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      country: z.string(),
    })
    .optional(),
  shippingMethod: z.string().optional(),
  discountCode: z.string().optional(),
});

const applyDiscountSchema = z.object({
  code: z.string().min(1, "El código es requerido"),
});

export function createOrderController(
  orderService: OrderService,
  mercadoPagoService: MercadoPagoService
) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      try {
        const body = createOrderSchema.parse(request.body);
        const order = await orderService.create(body as CreateOrderDto);

        // Calculate shipping cost in background (doesn't affect response)
        if (order.shippingAddress) {
          orderService.calculateShippingCost(order.id).catch((error) => {
            console.error(`Error calculating shipping for order ${order.id}:`, error);
          });
        }

        reply.status(201).send(order);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async getById(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const order = await orderService.getById(id);

        if (!order) {
          reply.status(404).send({
            error: "Orden no encontrada",
          });
          return;
        }

        reply.send(order);
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async applyDiscountCode(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const body = applyDiscountSchema.parse(request.body);
        const order = await orderService.applyDiscountCode(
          id,
          (body as ApplyDiscountCodeDto).code
        );
        reply.send(order);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async createPayment(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const order = await orderService.getById(id);

        if (!order) {
          reply.status(404).send({
            error: "Orden no encontrada",
          });
          return;
        }

        if (order.status !== "pending") {
          reply.status(400).send({
            error: "Solo se pueden crear pagos para órdenes pendientes",
          });
          return;
        }

        // Get frontend URL from env or use default
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        // Convert Prisma order to Order type
        const orderForPayment: Order & { id: string } = {
          id: order.id,
          leadId: order.leadId || undefined,
          discountCodeId: order.discountCodeId || undefined,
          status: order.status as unknown as OrderStatus,
          subtotal: prismaNumber(prismaDecimal(order.subtotal)),
          discount: prismaNumber(prismaDecimal(order.discount)),
          shippingCost: prismaNumber(prismaDecimal(order.shippingCost)),
          total: prismaNumber(prismaDecimal(order.total)),
          currency: order.currency,
          items: order.itemsSnapshot as unknown as OrderItem[],
          shippingAddress: order.shippingAddress
            ? isAddress(order.shippingAddress)
              ? (order.shippingAddress as Address)
              : undefined
            : undefined,
          shippingMethod: order.shippingMethod || undefined,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };

        const preference = await mercadoPagoService.createPreference(
          orderForPayment,
          `${frontendUrl}/checkout/success?orderId=${order.id}`,
          `${frontendUrl}/checkout/failure?orderId=${order.id}`,
          `${frontendUrl}/checkout/pending?orderId=${order.id}`
        );

        const payment = await prisma.payment.create({
          data: {
            orderId: order.id,
            status: "pending",
            amount: prismaNumber(prismaDecimal(order.total)),
            currency: "ARS",
            paymentMethod: "mercadopago",
            mercadoPagoPreferenceId: preference.id,
            paymentLink: preference.initPoint,
          },
        });

        reply.send({
          paymentId: payment.id,
          paymentLink: preference.initPoint,
          preferenceId: preference.id,
        });
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async getPaymentStatus(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };

        const payment = await prisma.payment.findUnique({
          where: { id },
          include: {
            order: true,
          },
        });

        if (!payment) {
          reply.status(404).send({
            error: "Pago no encontrado",
          });
          return;
        }

        // If has MercadoPago payment ID, get status from MercadoPago
        if (payment.mercadoPagoPaymentId) {
          const status = await mercadoPagoService.getPaymentStatus(
            payment.mercadoPagoPaymentId
          );
          reply.send({
            ...payment,
            mercadoPagoStatus: status,
          });
          return;
        }

        reply.send(payment);
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    /**
     * Get all orders (admin only)
     */
    async getAll(request: FastifyRequest, reply: FastifyReply) {
      try {
        const user = request.authUser as { role?: string } | undefined;
        if (!user || user.role !== "admin") {
          reply.status(403).send({
            error: "Solo los administradores pueden ver todas las órdenes",
          });
          return;
        }

        const query = request.query as {
          page?: string;
          limit?: string;
          status?: string;
          search?: string;
        };

        const result = await orderService.getAll({
          page: query.page ? parseInt(query.page, 10) : undefined,
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
          status: query.status,
          search: query.search,
        });

        reply.send(result);
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }
        throw error;
      }
    },

    /**
     * Get order details with lead information (admin only)
     */
    async getOrderDetails(request: FastifyRequest, reply: FastifyReply) {
      try {
        const user = request.authUser as { role?: string } | undefined;
        if (!user || user.role !== "admin") {
          reply.status(403).send({
            error: "Solo los administradores pueden ver los detalles de las órdenes",
          });
          return;
        }

        const { id } = request.params as { id: string };
        const order = await orderService.getById(id);

        if (!order) {
          reply.status(404).send({
            error: "Orden no encontrada",
          });
          return;
        }

        reply.send(order);
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }
        throw error;
      }
    },

    /**
     * Simulate complete order and payment (for testing)
     * This creates the order, simulates payment approval, and generates commissions
     */
    async simulateCompleteOrder(request: FastifyRequest, reply: FastifyReply) {
      try {
        const body = createOrderSchema.parse(request.body);

        // Create order
        const order = await orderService.create(body as CreateOrderDto);

        const payment = await prisma.payment.create({
          data: {
            orderId: order.id,
            status: "approved",
            amount: order.total,
            currency: order.currency,
            paymentMethod: "mercadopago",
            mercadoPagoPreferenceId: `TEST_${order.id}`,
            mercadoPagoPaymentId: `TEST_PAYMENT_${order.id}`,
            paymentLink: `#`,
            metadata: {
              simulated: true,
              simulatedAt: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue,
          },
        });

        // Update order status to "paid" - this will automatically create commissions
        const updatedOrder = await orderService.updateStatus(order.id, "paid");

        reply.status(201).send({
          order: updatedOrder,
          payment: {
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            simulated: true,
          },
          message:
            "Orden simulada creada exitosamente. Pago aprobado y comisiones generadas.",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },
  };
}
