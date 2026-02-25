import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { MercadoPagoService } from "../services/mercadopago.service.js";
import { OrderService } from "../services/order.service.js";
import { OrderStatus, PaymentStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET;

function verifyMercadoPagoWebhookSignature(
  request: FastifyRequest
): { valid: boolean; reason?: string } {
  // If no secret is configured, log a warning and accept the webhook (useful for development)
  if (!WEBHOOK_SECRET) {
    request.log.warn(
      "[Webhook] MERCADOPAGO_WEBHOOK_SECRET not configured. Skipping signature verification."
    );
    return { valid: true, reason: "no-secret-configured" };
  }
  console.log({
    secret: WEBHOOK_SECRET,
    secretLength: WEBHOOK_SECRET?.length
  })

  request.log.info({
    secret: WEBHOOK_SECRET,
    secretLength: WEBHOOK_SECRET?.length,
  })

  const xSignature = request.headers["x-signature"];
  const xRequestId = request.headers["x-request-id"];

  if (
    !xSignature ||
    !xRequestId ||
    typeof xSignature !== "string" ||
    typeof xRequestId !== "string"
  ) {
    request.log.warn(
      { headers: { "x-signature": xSignature, "x-request-id": xRequestId } },
      "[Webhook] Missing or invalid x-signature / x-request-id headers"
    );
    return { valid: false, reason: "missing-headers" };
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
    request.log.warn(
      { xSignature },
      "[Webhook] Could not extract ts/v1 from x-signature"
    );
    return { valid: false, reason: "invalid-signature-format" };
  }

  // Extract data.id from query params if present
  let dataId = "";
  try {
    if (typeof request.query === "object" && request.query !== null) {
      const q = request.query as Record<string, string>;
      dataId = q["data.id"] || q["id"] || "";
    }
  } catch (err) {
    request.log.warn(
      { err },
      "[Webhook] Failed to parse request URL for data.id extraction"
    );
  }

  // Build manifest: id:[data.id_url];request-id:[x-request-id];ts:[ts];
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  request.log.debug(
    { manifest, dataId, xRequestId, ts },
    "[Webhook] Signature manifest built"
  );

  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(manifest);
  const computed = hmac.digest("hex");

  if (computed !== hash) {
    request.log.warn(
      { computed, received: hash, manifest },
      "[Webhook] HMAC signature mismatch — webhook rejected"
    );
    return { valid: false, reason: "hmac-mismatch" };
  }

  return { valid: true };
}

export function createWebhookController(
  mercadoPagoService: MercadoPagoService,
  orderService: OrderService
) {
  return {
    async mercadopago(request: FastifyRequest, reply: FastifyReply) {
      // ── 1. Log raw incoming request ──────────────────────────────────────
      const rawBody = request.body as Record<string, unknown>;
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
        const sigResult = verifyMercadoPagoWebhookSignature(request);
        if (!sigResult.valid) {
          request.log.warn(
            { reason: sigResult.reason },
            "[Webhook] Signature verification FAILED — returning 400"
          );
          reply.status(400).send({ error: "Invalid webhook signature" });
          return;
        }
        request.log.info(
          { reason: sigResult.reason },
          "[Webhook] Signature verification PASSED"
        );

        const data = rawBody as {
          type: string;
          data: { id: string; external_reference?: string };
        };

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
