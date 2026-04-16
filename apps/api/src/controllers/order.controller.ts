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
import { PrismaClient, Prisma, OrderStatus } from "@prisma/client";
import { prismaDecimal, prismaNumber } from "../utils/decimal.js";
import { Address } from "../shared/index.js";

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
  customerInfo: z
    .object({
      name: z.string().min(1, "Nombre es requerido"),
      lastName: z.string().optional().default(""),
      dni: z.string().optional().default(""),
      phoneNumber: z.string().optional().default(""),
      email: z.string().email("Email inválido"),
    })
    .optional(),
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
  fulfillmentType: z.enum(["home_delivery", "pickup_point"]).optional(),
  pickupPointId: z.string().optional(),
  partnerReferralSlug: z.string().optional(),
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
        if (isAddress(order.shippingAddress)) {
          request.log.info(
            { orderId: order.id, zipCode: (order.shippingAddress as any).zipCode },
            "[Order] Dispatching background shipping cost calculation"
          );
          orderService.calculateShippingCost(order.id).catch((error) => {
            request.log.error(
              { err: error, orderId: order.id },
              "[Order] Error calculating shipping cost"
            );
          });
        } else {
          request.log.info(
            { orderId: order.id, shippingAddressRaw: order.shippingAddress },
            "[Order] No valid shippingAddress — skipping shipping cost calculation"
          );
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

        if (order.status !== OrderStatus.awaiting_payment) {
          reply.status(400).send({
            error: "Solo se pueden crear pagos para \u00f3rdenes en espera de pago",
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
          status: order.status,
          subtotal: prismaNumber(prismaDecimal(order.subtotal)),
          discount: prismaNumber(prismaDecimal(order.discount)),
          shippingCost: prismaNumber(prismaDecimal(order.shippingCost)),
          total: prismaNumber(prismaDecimal(order.total)),
          currency: order.currency,
          payerEmail: order.lead?.email,
          items: order.items.map(item => {
            const product = (item as any).product;
            let imageUrl: string | undefined;
            if (product?.images && product.images.length > 0) {
              imageUrl = product.images[0];
            }

            return {
              productId: item.productId || "",
              productName: item.name,
              variantId: item.productVariantId || undefined,
              variantName: (item.metadata as any)?.variantName,
              size: (item.metadata as any)?.size,
              quantity: item.quantity,
              unitPrice: prismaNumber(prismaDecimal(item.unitPrice)),
              imageUrl: imageUrl,
              subtotal: prismaNumber(prismaDecimal(item.unitPrice)) * item.quantity,
              discount: (item.metadata as any)?.discount || 0,
              total: (item.metadata as any)?.totalAfterDiscount || prismaNumber(prismaDecimal(item.totalPrice))
            };
          }),
          shippingAddress: order.shippingAddress
            ? isAddress(order.shippingAddress)
              ? (order.shippingAddress as Address)
              : undefined
            : undefined,
          shippingMethod: order.shippingMethod || undefined,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };

        // \u2500\u2500 Idempotencia de preferencia MP (Fix Race Condition) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        // Usamos upsert con el constraint \u00fanico (orderId, paymentMethod) para garantizar
        // que si dos requests concurrentes llegan, solo se crea UNA preferencia MP.
        // Si el payment ya existe (constraint hit), el update es un no-op y devuelve el
        // payment existente con el paymentLink original. At\u00f3mico en DB.
        //
        // Flujo:
        //  1. Crear preferencia en MP (fuera del upsert, puede ejecutarse dos veces
        //     si hay race, pero solo UNA llegar\u00e1 a persistirse en DB)
        //  2. Upsert: si no exist\u00eda → crea con la nueva preferencia
        //             si ya exist\u00eda → no modifica nada, retorna el existente
        // ---------------------------------------------------------------------------

        // Revisar si ya existe un payment pendiente para este m\u00e9todo
        // (optimizaci\u00f3n: evitar crear preferencia en MP si ya hay una)
        const existingPayment = await prisma.payment.findUnique({
          where: {
            orderId_paymentMethod: {
              orderId: order.id,
              paymentMethod: "mercadopago",
            },
          },
        });

        if (existingPayment?.paymentLink) {
          // Ya existe una preferencia v\u00e1lida — retornar sin crear nueva en MP
          reply.send({
            paymentId: existingPayment.id,
            paymentLink: existingPayment.paymentLink,
            preferenceId: existingPayment.mercadoPagoPreferenceId,
          });
          return;
        }

        // Crear o reutilizar preferencia en MercadoPago
        const preference = await mercadoPagoService.createPreference(
          orderForPayment,
          `${frontendUrl}/checkout/success?orderId=${order.id}`,
          `${frontendUrl}/checkout/failure?orderId=${order.id}`,
          `${frontendUrl}/checkout/pending?orderId=${order.id}`
        );

        // Upsert at\u00f3mico — si otro request ya insert\u00f3 primero, este hace el update
        // (no-op en campos que importan) y devuelve el registro existente
        const payment = await prisma.payment.upsert({
          where: {
            orderId_paymentMethod: {
              orderId: order.id,
              paymentMethod: "mercadopago",
            },
          },
          create: {
            orderId: order.id,
            status: "pending",
            amount: prismaNumber(prismaDecimal(order.total)),
            currency: "ARS",
            paymentMethod: "mercadopago",
            mercadoPagoPreferenceId: preference.id,
            paymentLink: preference.initPoint,
          },
          update: {
            // Si ya exist\u00eda un payment sin link (edge case), actualizamos con los datos nuevos
            // Si ya ten\u00eda link, Prisma igual ejecuta el UPDATE pero no cambia nada relevante
            mercadoPagoPreferenceId: preference.id,
            paymentLink: preference.initPoint,
          },
        });

        reply.send({
          paymentId: payment.id,
          paymentLink: payment.paymentLink,
          preferenceId: payment.mercadoPagoPreferenceId,
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

        // Update order status to paid - this will automatically create commissions
        const updatedOrder = await orderService.updateStatus(order.id, OrderStatus.paid);

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

    // ──────────────────────────────────────────────────────────────
    // PATCH /orders/:id/shipping  — Admin carga tracking number
    // ──────────────────────────────────────────────────────────────
    addTracking: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as { role?: string; userId?: string } | undefined;
        if (!user || user.role !== "admin") {
          reply.status(403).send({ error: "Solo los administradores pueden cargar el número de seguimiento" });
          return;
        }

        const { id } = request.params as { id: string };

        const addTrackingSchema = z.object({
          trackingNumber: z
            .string()
            .min(1, "El número de seguimiento es requerido")
            .max(50, "El número de seguimiento no puede superar los 50 caracteres")
            .regex(/^[A-Z0-9]+$/i, "El número de seguimiento solo puede contener letras y números")
            .transform((val) => val.trim().toUpperCase()),
        });

        const { trackingNumber } = addTrackingSchema.parse(request.body);

        const result = await orderService.addTrackingNumber(id, trackingNumber, user.userId);

        reply.send({
          message: "Número de seguimiento cargado exitosamente. Email enviado al cliente.",
          order: result.order,
          shipment: result.shipment,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Validación inválida", details: error.errors });
          return;
        }
        if (error instanceof Error) {
          const status =
            error.message.includes("no encontrada") ? 404
              : error.message.includes("Solo se puede") ? 422
                : error.message.includes("ya tiene") ? 409
                  : 400;
          reply.status(status).send({ error: error.message });
          return;
        }
        throw error;
      }
    },

    // ──────────────────────────────────────────────────────────────
    // PATCH /orders/:id/status  — Admin cambia estado (eg paid→ready_to_ship)
    // ──────────────────────────────────────────────────────────────
    updateStatus: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as { role?: string; userId?: string } | undefined;
        if (!user || user.role !== "admin") {
          reply.status(403).send({ error: "Solo los administradores pueden cambiar el estado de una orden" });
          return;
        }

        const { id } = request.params as { id: string };

        const updateStatusSchema = z.object({
          status: z.enum(["ready_to_ship", "cancelled", "refunded"] as const, {
            errorMap: () => ({ message: "Estado inválido. Estados permitidos: ready_to_ship, cancelled, refunded" }),
          }),
        });

        const { status } = updateStatusSchema.parse(request.body);

        const order = await orderService.updateOrderStatus(
          id,
          status as OrderStatus,
          user.userId
        );

        reply.send({
          message: `Estado de la orden actualizado a '${status}'.`,
          order,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Validación inválida", details: error.errors });
          return;
        }
        if (error instanceof Error) {
          const status =
            error.message.includes("no encontrada") ? 404
              : error.message.includes("Transición inválida") ? 422
                : 400;
          reply.status(status).send({ error: error.message });
          return;
        }
        throw error;
      }
    },
  };
}
