/**
 * OrderStatus — sincronizado con el enum de Prisma (schema.prisma)
 * Fuente de verdad: @prisma/client OrderStatus
 */
export enum OrderStatus {
    AWAITING_PAYMENT = 'awaiting_payment',
    PAID = 'paid',
    READY_TO_SHIP = 'ready_to_ship',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
}
