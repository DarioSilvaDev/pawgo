import { FastifyRequest, FastifyReply } from "fastify";
import { MercadoPagoService } from "../services/mercadopago.service.js";
import { OrderService } from "../services/order.service.js";
import { OrderStatus, PaymentStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function createWebhookController(
  mercadoPagoService: MercadoPagoService,
  orderService: OrderService
) {
  return {
    async mercadopago(request: FastifyRequest, reply: FastifyReply) {
      try {
        const data = request.body as {
          type: string;
          data: { id: string; external_reference?: string };
        };

        console.log(`[Webhook] Received MercadoPago webhook - type: ${data.type}, paymentId: ${data.data.id}`);

        // Process webhook to get payment status and orderId
        const result = await mercadoPagoService.processWebhook(data);

        if (!result) {
          console.log(`[Webhook] No result from processWebhook for paymentId: ${data.data.id}`);
          reply.status(200).send({ received: true });
          return;
        }

        console.log(`[Webhook] Processed webhook - paymentId: ${result.paymentId}, status: ${result.status}, orderId: ${result.orderId || 'not found'}`);

        // Find payment by orderId (from external_reference) instead of mercadoPagoPaymentId
        // This is because mercadoPagoPaymentId is only set after the first webhook is processed
        let payment = null;

        if (result.orderId) {
          // Find order and its most recent payment
          const order = await prisma.order.findUnique({
            where: { id: result.orderId },
            include: {
              payments: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  order: true,
                },
              },
            },
          });

          if (order && order.payments.length > 0) {
            payment = order.payments[0];
          }
        }

        // Fallback: try to find by mercadoPagoPaymentId (in case webhook is retried)
        if (!payment) {
          payment = await prisma.payment.findFirst({
            where: {
              mercadoPagoPaymentId: result.paymentId,
            },
            include: {
              order: true,
            },
          });
        }

        if (!payment) {
          console.warn(
            `[Webhook] Payment not found for MercadoPago payment ID: ${result.paymentId}, orderId: ${result.orderId || 'unknown'}`
          );
          reply.status(200).send({ received: true });
          return;
        }

        console.log(`[Webhook] Found payment ${payment.id} for order ${payment.orderId}, current status: ${payment.status}`);

        // Update payment status
        let paymentStatus: PaymentStatus = PaymentStatus.pending;
        let orderStatus: OrderStatus | null = null;

        if (result.status === "approved") {
          paymentStatus = PaymentStatus.approved;
          orderStatus = OrderStatus.paid;
        } else if (result.status === "rejected") {
          paymentStatus = PaymentStatus.rejected;
          // Si el pago es rechazado, cancelar la orden
          orderStatus = OrderStatus.cancelled;
        } else if (result.status === "cancelled") {
          paymentStatus = PaymentStatus.cancelled;
          // Si el pago es cancelado, cancelar la orden
          orderStatus = OrderStatus.cancelled;
        } else if (result.status === "refunded") {
          paymentStatus = PaymentStatus.refunded;
          // Si el pago es reembolsado, cancelar la orden
          orderStatus = OrderStatus.cancelled;
        } else if (result.status === "in_process" || result.status === "pending") {
          paymentStatus = PaymentStatus.pending;
          // Mantener el estado actual de la orden
        }

        console.log(`[Webhook] Updating payment ${payment.id} to status: ${paymentStatus}, order status: ${orderStatus || payment.order.status}`);

        // Update payment
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: paymentStatus,
            mercadoPagoPaymentId: result.paymentId,
          },
        });

        // Update order status if needed
        if (orderStatus) {
          console.log(`[Webhook] Updating order ${payment.orderId} to ${orderStatus} status`);
          await orderService.updateStatus(payment.orderId, orderStatus);
        }

        console.log(`[Webhook] Successfully processed webhook for payment ${result.paymentId}`);
        reply.status(200).send({ received: true });
      } catch (error) {
        console.error("Error processing MercadoPago webhook:", error);
        // Always return 200 to MercadoPago to avoid retries
        reply.status(200).send({ received: true, error: "Processing error" });
      }
    },
  };
}

