// SHARED: Este archivo se mantiene sincronizado manualmente entre api y web.
// Si lo modificás, actualizé también la copia en la otra app.

export interface StockReservation {
    id: string;
    leadId: string;
    variantId: string;
    desiredQuantity: number;
    notifiedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface StockReservationItem {
    variantId: string;
    quantity: number;
}

export interface CreateStockReservationDto {
    email: string;
    name?: string;
    phoneNumber?: string;
    items: StockReservationItem[];
}
