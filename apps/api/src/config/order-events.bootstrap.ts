/**
 * Order Events Bootstrap
 *
 * Registra todos los handlers de eventos del dominio de órdenes.
 * Se llama una sola vez al arrancar el servidor (server.ts).
 *
 * Responsabilidades:
 * - Conectar EventDispatcher con EmailService (emails transaccionales)
 * - Cada handler es idempotente (usa EmailLog para no enviar duplicados)
 */

import { PgBoss } from "pg-boss";
import { eventDispatcher } from "../services/event-dispatcher.service.js";
import { emailService } from "../services/email.service.js";
import {
    OrderEventType,
    type DomainEvent,
    type PaymentApprovedPayload,
    type PaymentRejectedPayload,
    type ShipmentCreatedPayload,
    type ShipmentDeliveredPayload,
} from "../shared/events.js";
import { JOB_REVIEW_REMINDER } from "../jobs/review-reminder.job.js";

export function bootstrapOrderEvents(boss: PgBoss): void {
    console.log("[EventBootstrap] Registering order event handlers...");

    // ── PAYMENT_APPROVED → Order Confirmation Email ──────────────
    eventDispatcher.subscribe<PaymentApprovedPayload>(
        OrderEventType.PAYMENT_APPROVED,
        async (event: DomainEvent<PaymentApprovedPayload>) => {
            const { orderId, leadEmail, leadName, amount, currency } = event.payload;
            if (!leadEmail) {
                console.warn(`[EventBootstrap] PAYMENT_APPROVED: no email for order ${orderId}`);
                return;
            }

            await emailService.sendOrderConfirmationIdempotent({
                idempotencyKey: `PAYMENT_APPROVED:${orderId}`,
                email: leadEmail,
                name: leadName ?? "Cliente",
                orderId,
                total: amount,
                currency: currency ?? "ARS",
            });
        }
    );

    // ── PAYMENT_REJECTED → Payment Problem Email ──────────────────
    eventDispatcher.subscribe<PaymentRejectedPayload>(
        OrderEventType.PAYMENT_REJECTED,
        async (event: DomainEvent<PaymentRejectedPayload>) => {
            const { orderId, leadEmail, leadName, reason } = event.payload;
            if (!leadEmail) {
                console.warn(`[EventBootstrap] PAYMENT_REJECTED: no email for order ${orderId}`);
                return;
            }

            await emailService.sendOrderPaymentProblemIdempotent({
                idempotencyKey: `PAYMENT_REJECTED:${orderId}`,
                email: leadEmail,
                name: leadName ?? "Cliente",
                orderId,
                reason,
            });
        }
    );

    // ── SHIPMENT_CREATED → Shipment Created Email ─────────────────
    eventDispatcher.subscribe<ShipmentCreatedPayload>(
        OrderEventType.SHIPMENT_CREATED,
        async (event: DomainEvent<ShipmentCreatedPayload>) => {
            const { orderId, trackingNumber, leadEmail, leadName } = event.payload;
            if (!leadEmail) {
                console.warn(`[EventBootstrap] SHIPMENT_CREATED: no email for order ${orderId}`);
                return;
            }

            await emailService.sendShipmentCreatedIdempotent({
                idempotencyKey: `SHIPMENT_CREATED:${orderId}`,
                email: leadEmail,
                name: leadName ?? "Cliente",
                orderId,
                trackingNumber: trackingNumber ?? "—",
            });
        }
    );

    // ── SHIPMENT_DELIVERED → Delivery Confirmation Email ─────────
    eventDispatcher.subscribe<ShipmentDeliveredPayload>(
        OrderEventType.SHIPMENT_DELIVERED,
        async (event: DomainEvent<ShipmentDeliveredPayload>) => {
            const { orderId, trackingNumber, leadEmail, leadName } = event.payload;
            if (!leadEmail) {
                console.warn(`[EventBootstrap] SHIPMENT_DELIVERED: no email for order ${orderId}`);
                return;
            }

            await emailService.sendShipmentDeliveredIdempotent({
                idempotencyKey: `SHIPMENT_DELIVERED:${orderId}`,
                email: leadEmail,
                name: leadName ?? "Cliente",
                orderId,
                trackingNumber: trackingNumber ?? "—",
            });

            // ── Schedule Review Reminder (7 days later) ──────────
            try {
                await boss.send(
                    JOB_REVIEW_REMINDER,
                    { orderId, email: leadEmail, name: leadName },
                    {
                        startAfter: 7 * 24 * 60 * 60, // 7 days in seconds
                        singletonKey: `review-reminder:${orderId}`,
                    }
                );
                console.log(`[EventBootstrap] Scheduled 7-day review reminder job for order ${orderId}`);
            } catch (err) {
                console.error(`[EventBootstrap] Failed to schedule review reminder for order ${orderId}:`, err);
            }
        }
    );

    console.log("[EventBootstrap] Order event handlers registered ✓");
}
