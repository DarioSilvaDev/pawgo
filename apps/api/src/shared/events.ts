/**
 * Domain Events — PAWGO Order Management
 * Tipos de eventos internos del dominio e-commerce
 */

// ─────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────

export const OrderEventType = {
    ORDER_CREATED: "ORDER_CREATED",
    PAYMENT_APPROVED: "PAYMENT_APPROVED",
    PAYMENT_REJECTED: "PAYMENT_REJECTED",
    PAYMENT_CANCELLED: "PAYMENT_CANCELLED",
    PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
    SHIPMENT_CREATED: "SHIPMENT_CREATED",
    SHIPMENT_IN_TRANSIT: "SHIPMENT_IN_TRANSIT",
    SHIPMENT_DELIVERED: "SHIPMENT_DELIVERED",
    SHIPMENT_RETURNED: "SHIPMENT_RETURNED",
    ORDER_CANCELLED: "ORDER_CANCELLED",
    ORDER_REFUNDED: "ORDER_REFUNDED",
} as const;

export type OrderEventType = (typeof OrderEventType)[keyof typeof OrderEventType];

// ─────────────────────────────────────────────────────────────
// Payload Interfaces
// ─────────────────────────────────────────────────────────────

export interface OrderCreatedPayload {
    orderId: string;
    leadEmail?: string;
    leadName?: string;
    total: number;
    currency: string;
}

export interface PaymentApprovedPayload {
    orderId: string;
    paymentId: string;
    mercadoPagoPaymentId: string;
    amount: number;
    currency: string;
    leadEmail?: string;
    leadName?: string;
}

export interface PaymentRejectedPayload {
    orderId: string;
    paymentId: string;
    mercadoPagoPaymentId: string;
    reason?: string;
    leadEmail?: string;
    leadName?: string;
}

export interface ShipmentCreatedPayload {
    orderId: string;
    shipmentId: string;
    trackingNumber?: string;
    leadEmail?: string;
    leadName?: string;
}

export interface ShipmentInTransitPayload {
    orderId: string;
    shipmentId: string;
    trackingNumber?: string;
    leadEmail?: string;
    leadName?: string;
}

export interface ShipmentDeliveredPayload {
    orderId: string;
    shipmentId: string;
    trackingNumber?: string;
    leadEmail?: string;
    leadName?: string;
}

// ─────────────────────────────────────────────────────────────
// Domain Event wrapper
// ─────────────────────────────────────────────────────────────

export interface DomainEvent<T = unknown> {
    type: OrderEventType;
    orderId: string;
    payload: T;
    occurredAt: Date;
}

// Helpers
export function createEvent<T>(
    type: OrderEventType,
    orderId: string,
    payload: T
): DomainEvent<T> {
    return { type, orderId, payload, occurredAt: new Date() };
}
