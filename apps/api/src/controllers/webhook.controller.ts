import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { MercadoPagoService } from "../services/mercadopago.service.js";
import { OrderService } from "../services/order.service.js";
import { OrderStatus, PaymentStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET;

function verifyMercadoPagoWebhookSignature(request: FastifyRequest): boolean {
  // If no secret is configured, log a warning and accept the webhook (useful for development)
  if (!WEBHOOK_SECRET) {
    console.warn(
      "[Webhook] MERCADOPAGO_WEBHOOK_SECRET not configured. Skipping signature verification."
    );
    return true;
  }

  const xSignature = request.headers["x-signature"];
  const xRequestId = request.headers["x-request-id"];

  if (!xSignature || !xRequestId || typeof xSignature !== "string" || typeof xRequestId !== "string") {
    console.warn("[Webhook] Missing x-signature or x-request-id headers");
    return false;
  }

  const parts = xSignature.split(",");
  let ts: string | undefined;
  let hash: string | undefined;

  for (const part of parts) {
    const [key, value] = part.split("=", 2).map((s) => s.trim());
    if (key === "ts") {
      ts = value;
    } else if (key === "v1") {
      hash = value;
    }
  }

  if (!ts || !hash) {
    console.warn("[Webhook] Invalid x-signature format");
    return false;
  }

  // Extract data.id from query params if present
  let dataId = "";
  try {
    const rawUrl = request.raw.url || "";
    const url = new URL(rawUrl, "http://localhost");
    const qpDataId = url.searchParams.get("data.id");
    if (qpDataId) {
      dataId = qpDataId.toLowerCase();
    }
  } catch (err) {
    console.warn("[Webhook] Failed to parse request URL for signature validation:", err);
  }

  // Build manifest according to Mercado Pago docs
  // Template: id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
  const partsManifest: string[] = [];
  if (dataId) {
    partsManifest.push(`id:${dataId}`);
  }
  partsManifest.push(`request-id:${xRequestId}`);
  partsManifest.push(`ts:${ts}`);
  const manifest = `${partsManifest.join(";")};`;

  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(manifest);
  const computed = hmac.digest("hex");

  if (computed !== hash) {
    console.warn("[Webhook] Invalid HMAC signature for MercadoPago webhook");
    return false;
  }

  return true;
}

export function createWebhookController(
  mercadoPagoService: MercadoPagoService,
  orderService: OrderService
) {
  return {
    async mercadopago(request: FastifyRequest, reply: FastifyReply) {
      try {
        if (!verifyMercadoPagoWebhookSignature(request)) {
          reply.status(400).send({ error: "Invalid webhook signature" });
          return;
        }

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

        // Determine target statuses based on MercadoPago status
        let targetPaymentStatus: PaymentStatus = PaymentStatus.pending;
        let targetOrderStatus: OrderStatus | null = null;

        if (result.status === "approved") {
          targetPaymentStatus = PaymentStatus.approved;
          targetOrderStatus = OrderStatus.paid;
        } else if (result.status === "rejected") {
          targetPaymentStatus = PaymentStatus.rejected;
          // Si el pago es rechazado, cancelar la orden
          targetOrderStatus = OrderStatus.cancelled;
        } else if (result.status === "cancelled") {
          targetPaymentStatus = PaymentStatus.cancelled;
          // Si el pago es cancelado, cancelar la orden
          targetOrderStatus = OrderStatus.cancelled;
        } else if (result.status === "refunded") {
          targetPaymentStatus = PaymentStatus.refunded;
          // Si el pago es reembolsado, cancelar la orden
          targetOrderStatus = OrderStatus.cancelled;
        } else if (result.status === "in_process" || result.status === "pending") {
          targetPaymentStatus = PaymentStatus.pending;
          // Mantener el estado actual de la orden
        }

        const currentPaymentStatus = payment.status as PaymentStatus;
        const currentOrderStatus = payment.order.status as OrderStatus;

        // Idempotencia básica: si no hay cambio de estado, no hacer nada
        if (
          currentPaymentStatus === targetPaymentStatus &&
          (!targetOrderStatus || currentOrderStatus === targetOrderStatus)
        ) {
          console.log(
            `[Webhook] No state change required for payment ${payment.id} (status=${currentPaymentStatus}, orderStatus=${currentOrderStatus})`
          );
          reply.status(200).send({ received: true });
          return;
        }

        // No degradar pedidos pagados a cancelados sin política explícita
        if (
          currentOrderStatus === OrderStatus.paid &&
          targetOrderStatus === OrderStatus.cancelled
        ) {
          console.warn(
            `[Webhook] Ignoring transition from paid to cancelled for order ${payment.orderId}`
          );
          reply.status(200).send({ received: true });
          return;
        }

        console.log(
          `[Webhook] Updating payment ${payment.id} from ${currentPaymentStatus} to ${targetPaymentStatus}, order status: ${targetOrderStatus || currentOrderStatus}`
        );

        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: targetPaymentStatus,
            mercadoPagoPaymentId: result.paymentId,
          },
        });

        // Update order status if needed
        if (targetOrderStatus && currentOrderStatus !== targetOrderStatus) {
          console.log(
            `[Webhook] Updating order ${payment.orderId} from ${currentOrderStatus} to ${targetOrderStatus}`
          );
          await orderService.updateStatus(payment.orderId, targetOrderStatus);
        }

        console.log(`[Webhook] Successfully processed webhook for payment ${result.paymentId}`);
        reply.status(200).send({ received: true });
      } catch (error) {
        console.error("Error processing MercadoPago webhook:", error);
        // Return 500 so MercadoPago can retry in case of transient failures
        reply.status(500).send({ received: false, error: "Processing error" });
      }
    },
  };
}

