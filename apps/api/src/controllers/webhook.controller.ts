import { FastifyRequest, FastifyReply } from "fastify";
import { MercadoPagoService } from "../services/mercadopago.service.js";
import { verifyMercadoPagoSignature } from "../services/mercadopago-signature.js";
import { OrderService } from "../services/order.service.js";
import { OrderStatus, PaymentStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MercadoPagoWebhookBody {
  type: string;
  data: {
    id: string;
    external_reference?: string;
  };
  api_version?: string;
  action?: string;
  resource?: string;
}

export function createWebhookController(
  mercadoPagoService: MercadoPagoService,
  orderService: OrderService
) {
  return {
    async mercadopago(request: FastifyRequest, reply: FastifyReply) {
      // ── 1. Log raw incoming request ──────────────────────────────────────
      const rawBody = request.body as MercadoPagoWebhookBody;
      request.log.info(
        {
          body: rawBody,
          query: request.query,
          headers: {
            "x-signature": request.headers["x-signature"],
            "x-request-id": request.headers["x-request-id"],
            "user-agent": request.headers["user-agent"],
          },
        },
        "[Webhook] Incoming MercadoPago request"
      );

      try {
        // ── 2. Signature verification ──────────────────────────────────────
        const verification = verifyMercadoPagoSignature(request);

        if (!verification.valid) {
          request.log.warn(
            { reason: verification.reason },
            "[Webhook] Invalid MercadoPago signature"
          );
          return reply.status(200).send({ ignored: true, reason: verification.reason });
        }

        if (verification.isPanelTest) {
          request.log.info("[Webhook] MercadoPago panel test detected");
          return reply.status(200).send({ received: true });
        }

        const data = rawBody;

        // ── 3. processWebhook ──────────────────────────────────────────────
        request.log.info(
          { type: data.type, paymentId: data?.data?.id },
          "[Webhook] Calling processWebhook"
        );

        const result = await mercadoPagoService.processWebhook(data);

        if (!result) {
          request.log.warn(
            { type: data.type, paymentId: data?.data?.id },
            "[Webhook] processWebhook returned null — notification ignored or not a payment type"
          );
          reply.status(200).send({ received: true });
          return;
        }

        request.log.info(
          { paymentId: result.paymentId, status: result.status, orderId: result.orderId },
          "[Webhook] processWebhook success, looking for order/payment records"
        );

        // ── 4. Locate the payment record ───────────────────────────────────
        let payment = null;

        if (result.orderId) {
          request.log.info({ orderId: result.orderId }, "[Webhook] Searching order by orderId");
          const order = await prisma.order.findUnique({
            where: { id: result.orderId },
            include: {
              payments: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { order: true },
              },
            },
          });

          if (order && order.payments.length > 0) {
            payment = order.payments[0];
            request.log.info(
              { paymentId: payment.id, orderId: result.orderId },
              "[Webhook] Payment located via orderId"
            );
          } else {
            request.log.warn(
              { orderId: result.orderId, orderExists: !!order, paymentCount: order?.payments.length },
              "[Webhook] Order not found or has no payments for the given orderId"
            );
          }
        }

        // Fallback: find by mercadoPagoPaymentId (on webhook retries or if external_reference was missing)
        if (!payment) {
          request.log.info({ mercadoPagoPaymentId: result.paymentId }, "[Webhook] Fallback: Searching payment by mercadoPagoPaymentId");
          payment = await prisma.payment.findFirst({
            where: { mercadoPagoPaymentId: result.paymentId },
            include: { order: true },
          });

          if (payment) {
            request.log.info(
              { paymentId: payment.id, mercadoPagoPaymentId: result.paymentId },
              "[Webhook] Payment located via mercadoPagoPaymentId (fallback)"
            );
          }
        }

        if (!payment) {
          request.log.error(
            { mercadoPagoPaymentId: result.paymentId, orderId: result.orderId },
            "[Webhook] CRITICAL: Payment record NOT FOUND in database. Status cannot be updated."
          );
          reply.status(200).send({ received: true });
          return;
        }

        // ── 5. Map status ──────────────────────────────────────────────────
        let targetPaymentStatus: PaymentStatus = PaymentStatus.pending;
        let targetOrderStatus: OrderStatus | null = null;

        if (result.status === "approved") {
          targetPaymentStatus = PaymentStatus.approved;
          targetOrderStatus = OrderStatus.paid;
        } else if (result.status === "rejected") {
          targetPaymentStatus = PaymentStatus.rejected;
          targetOrderStatus = OrderStatus.cancelled;
        } else if (result.status === "cancelled") {
          targetPaymentStatus = PaymentStatus.cancelled;
          targetOrderStatus = OrderStatus.cancelled;
        } else if (result.status === "refunded") {
          targetPaymentStatus = PaymentStatus.refunded;
          targetOrderStatus = OrderStatus.cancelled;
        } else if (result.status === "in_process" || result.status === "pending") {
          targetPaymentStatus = PaymentStatus.pending;
        }

        const currentPaymentStatus = payment.status as PaymentStatus;
        const currentOrderStatus = payment.order.status as OrderStatus;

        request.log.info(
          {
            paymentId: payment.id,
            orderId: payment.orderId,
            mercadoPagoStatus: result.status,
            currentPaymentStatus,
            targetPaymentStatus,
            currentOrderStatus,
            targetOrderStatus,
          },
          "[Webhook] Status mapping resolved"
        );

        // ── 6. Idempotency check ───────────────────────────────────────────
        if (
          currentPaymentStatus === targetPaymentStatus &&
          (!targetOrderStatus || currentOrderStatus === targetOrderStatus)
        ) {
          request.log.info(
            { paymentId: payment.id, currentPaymentStatus, currentOrderStatus },
            "[Webhook] No state change needed — idempotent, skipping"
          );
          reply.status(200).send({ received: true });
          return;
        }

        // ── 7. Guard: never downgrade paid → cancelled ──────────────────────
        if (
          currentOrderStatus === OrderStatus.paid &&
          targetOrderStatus === OrderStatus.cancelled
        ) {
          request.log.warn(
            { orderId: payment.orderId, currentOrderStatus, targetOrderStatus },
            "[Webhook] Blocked paid→cancelled downgrade — ignoring"
          );
          reply.status(200).send({ received: true });
          return;
        }

        request.log.info(
          {
            paymentId: payment.id,
            from: currentPaymentStatus,
            to: targetPaymentStatus,
            orderTo: targetOrderStatus,
          },
          "[Webhook] Applying status update"
        );

        // ── 8. Persist changes ─────────────────────────────────────────────
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: targetPaymentStatus,
            mercadoPagoPaymentId: result.paymentId,
          },
        });

        if (targetOrderStatus && currentOrderStatus !== targetOrderStatus) {
          request.log.info(
            { orderId: payment.orderId, from: currentOrderStatus, to: targetOrderStatus },
            "[Webhook] Updating order status"
          );
          await orderService.updateStatus(payment.orderId, targetOrderStatus);
        }

        request.log.info(
          {
            mercadoPagoPaymentId: result.paymentId,
            paymentId: payment.id,
            orderId: payment.orderId,
          },
          "[Webhook] Webhook processed successfully ✓"
        );
        reply.status(200).send({ received: true });
      } catch (error) {
        request.log.error(
          { err: error },
          "[Webhook] Unhandled error processing MercadoPago webhook"
        );
        // Return 500 so MercadoPago retries
        reply.status(500).send({ received: false, error: "Processing error" });
      }
    },
  };
}
