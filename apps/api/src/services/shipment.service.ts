/**
 * ShipmentService — Gestión de Envíos
 *
 * Responsable de:
 * - Crear la etiqueta de envío importando la orden a MiCorreo
 * - Actualizar el status del Shipment según tracking
 * - Despachar eventos de dominio (SHIPMENT_CREATED, IN_TRANSIT, DELIVERED)
 *
 * Guard: solo se puede crear un envío cuando la orden está en READY_TO_SHIP
 */

import { OrderStatus, ShipmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.client.js";
import { MiCorreoService } from "./micorreo/micorreo.service.js";
import { shippingConfig } from "../config/shipping.config.js";
import { eventDispatcher } from "./event-dispatcher.service.js";
import {
    OrderEventType,
    createEvent,
    type ShipmentCreatedPayload,
    type ShipmentInTransitPayload,
    type ShipmentDeliveredPayload,
} from "../shared/events.js";

export class ShipmentService {
    constructor(private miCorreoService: MiCorreoService) { }

    // ─────────────────────────────────────────────────────────────
    // Create Label (import to MiCorreo)
    // ─────────────────────────────────────────────────────────────

    /**
     * Imports the order to MiCorreo and creates the Shipment record.
     *
     * Guard: Order.status must be READY_TO_SHIP.
     * Idempotent: if a Shipment already exists for this order, returns it.
     */
    async createLabel(orderId: string): Promise<{
        shipmentId: string;
        extOrderId: string;
        trackingNumber: string | null;
        status: ShipmentStatus;
    }> {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { lead: true, shipment: true },
        });

        if (!order) throw new Error(`Orden ${orderId} no encontrada`);

        // ── Guard ─────────────────────────────────────────────────
        if (order.status !== OrderStatus.ready_to_ship) {
            throw new Error(
                `No se puede crear envío: la orden debe estar en estado READY_TO_SHIP (actual: ${order.status})`
            );
        }

        // ── Idempotency: return if already created ─────────────────
        if (order.shipment) {
            console.log(`[ShipmentService] Shipment ya existe para orden ${orderId}: ${order.shipment.id}`);
            return {
                shipmentId: order.shipment.id,
                extOrderId: order.shipment.extOrderId ?? orderId,
                trackingNumber: order.shipment.trackingNumber,
                status: order.shipment.status,
            };
        }

        // ── Get MiCorreo customer ─────────────────────────────────
        const miCorreoCustomer = await prisma.miCorreoCustomer.findFirst({
            where: { documentId: "20337224351" },
        });

        if (!miCorreoCustomer) {
            throw new Error("Cliente MiCorreo no configurado. Por favor registrar primera.");
        }

        const shippingAddress = order.shippingAddress as {
            streetName?: string;
            streetNumber?: string;
            floor?: string;
            apartment?: string;
            city?: string;
            provinceCode?: string;
            zipCode?: string;
        } | null;

        if (!shippingAddress?.streetName) {
            throw new Error("La orden no tiene dirección de envío completa para importar a MiCorreo");
        }

        const extOrderId = String(Date.now()); // Unique external reference

        // ── Import to MiCorreo ────────────────────────────────────
        const importResult = await this.miCorreoService.importShipment({
            customerId: miCorreoCustomer.customerId,
            extOrderId,
            orderNumber: orderId.slice(0, 12), // Max visible in MiCorreo panel
            sender: null, // Uses the account sender
            recipient: {
                name: order.lead ? `${order.lead.name ?? ""} ${order.lead.lastName ?? ""}`.trim() || "Cliente" : "Cliente",
                phone: order.lead?.phoneNumber ?? undefined,
                email: order.lead?.email ?? "noreply@pawgo-pet.com",
            },
            shipping: {
                deliveryType: (order.miCorreoDeliveryType as "D" | "S") ?? "D",
                productType: "CP",
                address: {
                    streetName: shippingAddress.streetName,
                    streetNumber: shippingAddress.streetNumber ?? "S/N",
                    floor: shippingAddress.floor ?? undefined,
                    apartment: shippingAddress.apartment ?? undefined,
                    city: shippingAddress.city || "",
                    provinceCode: shippingAddress.provinceCode || "B",
                    postalCode: shippingAddress.zipCode || "",
                },
                weight: shippingConfig.standardPackage.weight,
                declaredValue: Number(order.total),
                height: shippingConfig.standardPackage.height,
                length: shippingConfig.standardPackage.length,
                width: shippingConfig.standardPackage.width,
            },
        });

        // ── Persist Shipment ──────────────────────────────────────
        const shipment = await prisma.shipment.create({
            data: {
                orderId,
                status: ShipmentStatus.label_created,
                extOrderId,
                rawPayload: importResult as unknown as Prisma.InputJsonValue,
                carrier: "correo_argentino",
                // trackingNumber is not returned by import — it's the extOrderId formatted by MiCorreo
                // It will be retrieved via tracking endpoint once the shipment progresses
                trackingNumber: null,
            },
        });

        // ── Update Order with tracking reference ──────────────────
        await prisma.order.update({
            where: { id: orderId },
            data: { miCorreoTrackingNumber: extOrderId },
        });

        // ── Log + dispatch event ──────────────────────────────────
        await prisma.orderEventLog.create({
            data: {
                orderId,
                event: OrderEventType.SHIPMENT_CREATED,
                fromStatus: OrderStatus.ready_to_ship,
                toStatus: OrderStatus.ready_to_ship, // status doesn't change on shipment creation
                payload: { shipmentId: shipment.id, extOrderId } as unknown as Prisma.InputJsonValue,
            },
        });

        await eventDispatcher.dispatch(
            createEvent<ShipmentCreatedPayload>(OrderEventType.SHIPMENT_CREATED, orderId, {
                orderId,
                shipmentId: shipment.id,
                trackingNumber: extOrderId,
                leadEmail: order.lead?.email,
                leadName: order.lead?.name ?? "Cliente",
            })
        );

        console.log(`✅ [ShipmentService] Etiqueta creada para orden ${orderId}: extOrderId=${extOrderId}`);

        return {
            shipmentId: shipment.id,
            extOrderId,
            trackingNumber: null,
            status: ShipmentStatus.label_created,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Update Shipment Status
    // ─────────────────────────────────────────────────────────────

    /**
     * Update the shipment status (called from tracking polling or manual update).
     * Dispatches domain events based on the new status.
     */
    async updateStatus(
        shipmentId: string,
        newStatus: ShipmentStatus,
        trackingNumber?: string
    ) {
        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: { order: { include: { lead: true } } },
        });

        if (!shipment) throw new Error(`Shipment ${shipmentId} no encontrado`);

        const updatedShipment = await prisma.shipment.update({
            where: { id: shipmentId },
            data: {
                status: newStatus,
                ...(trackingNumber && { trackingNumber }),
            },
        });

        const { order } = shipment;
        const leadEmail = order.lead?.email;
        const leadName = order.lead?.name ?? "Cliente";

        // ── Log ────────────────────────────────────────────────────
        await prisma.orderEventLog.create({
            data: {
                orderId: order.id,
                event: `SHIPMENT_${newStatus.toUpperCase()}`,
                fromStatus: shipment.status,
                toStatus: newStatus,
                payload: { shipmentId, trackingNumber: trackingNumber ?? shipment.trackingNumber } as unknown as Prisma.InputJsonValue,
            },
        });

        // ── Dispatch events ────────────────────────────────────────
        if (newStatus === ShipmentStatus.in_transit) {
            await eventDispatcher.dispatch(
                createEvent<ShipmentInTransitPayload>(
                    OrderEventType.SHIPMENT_IN_TRANSIT,
                    order.id,
                    {
                        orderId: order.id,
                        shipmentId,
                        trackingNumber: trackingNumber ?? shipment.trackingNumber ?? undefined,
                        leadEmail,
                        leadName,
                    }
                )
            );
        }

        if (newStatus === ShipmentStatus.delivered) {
            // Also update Order status to DELIVERED
            await prisma.order.update({
                where: { id: order.id },
                data: { status: OrderStatus.delivered },
            });

            await eventDispatcher.dispatch(
                createEvent<ShipmentDeliveredPayload>(
                    OrderEventType.SHIPMENT_DELIVERED,
                    order.id,
                    {
                        orderId: order.id,
                        shipmentId,
                        trackingNumber: trackingNumber ?? shipment.trackingNumber ?? undefined,
                        leadEmail,
                        leadName,
                    }
                )
            );
        }

        return updatedShipment;
    }

    // ─────────────────────────────────────────────────────────────
    // Get Tracking Info
    // ─────────────────────────────────────────────────────────────

    /**
     * Fetch tracking events from MiCorreo for a given shipment.
     */
    async getTracking(shipmentId: string) {
        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
        });

        if (!shipment) throw new Error(`Shipment ${shipmentId} no encontrado`);

        const trackingId = shipment.trackingNumber ?? shipment.extOrderId;
        if (!trackingId) {
            throw new Error("Este envío no tiene número de tracking aún");
        }

        const result = await this.miCorreoService.getTracking({ shippingId: trackingId });
        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // Get Shipment by Order
    // ─────────────────────────────────────────────────────────────

    async getByOrderId(orderId: string) {
        return prisma.shipment.findUnique({ where: { orderId } });
    }
}
