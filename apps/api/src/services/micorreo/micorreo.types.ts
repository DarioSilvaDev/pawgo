// ============================================
// Authentication Types
// ============================================

export interface MiCorreoTokenResponse {
    token: string;
    expire: string; // La API devuelve "expire" (sin 's')
}

export interface MiCorreoAuthError {
    code: string;
    message: string;
}

// ============================================
// Customer Registration Types
// ============================================

export type DocumentType = "DNI" | "CUIT";

export interface MiCorreoAddress {
    streetName: string;
    streetNumber: string;
    floor?: string;
    apartment?: string;
    locality?: string;
    city: string;
    provinceCode: string;
    postalCode: string;
}

export interface RegisterCustomerRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    documentType: DocumentType;
    documentId: string;
    phone?: string;
    cellPhone?: string;
    address: MiCorreoAddress;
}

export interface RegisterCustomerResponse {
    customerId: string;
    createdAt: string;
}

// ============================================
// Validate User Types
// ============================================

export interface ValidateUserRequest {
    email: string;
    password: string;
}

export interface ValidateUserResponse {
    customerId: string;
    createdAt: string;
}

// ============================================
// Rates Types
// ============================================

export type DeliveryType = "D" | "S"; // D = Domicilio, S = Sucursal

export interface PackageDimensions {
    weight: number; // gramos (1-25000)
    height: number; // cm (max 150)
    width: number; // cm (max 150)
    length: number; // cm (max 150)
}

export interface GetRatesRequest {
    customerId: string;
    postalCodeOrigin: string;
    postalCodeDestination: string;
    deliveredType?: DeliveryType;
    dimensions: PackageDimensions;
}

export interface RateOption {
    deliveredType: DeliveryType;
    productType: string;
    productName: string;
    price: number;
    deliveryTimeMin: string;
    deliveryTimeMax: string;
}

export interface GetRatesResponse {
    customerId: string;
    validTo: string;
    rates: RateOption[];
}

// ============================================
// Import Shipment Types (/shipping/import)
// ============================================

export interface MiCorreoSenderAddress {
    streetName?: string | null;
    streetNumber?: string | null;
    floor?: string | null;
    apartment?: string | null;
    city?: string | null;
    provinceCode?: string | null;
    postalCode?: string | null;
}

export interface MiCorreoSender {
    name?: string | null;
    phone?: string | null;
    cellPhone?: string | null;
    email?: string | null;
    originAddress?: MiCorreoSenderAddress | null;
}

export interface MiCorreoRecipient {
    name: string;
    phone?: string;
    cellPhone?: string;
    email: string;
}

export interface MiCorreoShippingAddress {
    streetName: string;
    streetNumber: string;
    floor?: string;
    apartment?: string;
    city: string;
    provinceCode: string;
    postalCode: string;
}

export interface MiCorreoShipping {
    deliveryType: DeliveryType; // "D" = domicilio, "S" = sucursal
    productType: string;        // "CP" por defecto
    agency?: string | null;     // Obligatorio solo para deliveryType "S"
    address?: MiCorreoShippingAddress; // Obligatorio para deliveryType "D"
    weight: number;             // Gramos (entero)
    declaredValue: number;
    height: number;             // Cm (entero)
    length: number;             // Cm (entero)
    width: number;              // Cm (entero)
}

export interface ImportShipmentRequest {
    customerId: string;
    extOrderId: string;         // Identificador externo de la orden
    orderNumber?: string;       // Identificador para ver en MiCorreo
    sender?: MiCorreoSender | null;
    recipient: MiCorreoRecipient;
    shipping: MiCorreoShipping;
}

export interface ImportShipmentResponse {
    createdAt: string;          // ISO timestamp
}

// ============================================
// Tracking Types (/shipping/tracking)
// ============================================

export interface GetTrackingRequest {
    shippingId: string;         // Identificador del envío (trackingNumber)
}

export interface TrackingEvent {
    event: string;              // e.g. "CADUCA", "PREIMPOSICION", "ENTREGADO"
    date: string;               // "DD-MM-YYYY HH:mm"
    branch: string;
    status: string;
    sign: string;
}

export interface TrackingResult {
    id: string | null;
    productId: string | null;
    trackingNumber: string;
    events: TrackingEvent[];
}

export type GetTrackingResponse = TrackingResult[];

// ============================================
// Error Types
// ============================================

export interface MiCorreoError {
    code: string;
    message: string;
}

export class MiCorreoApiError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = "MiCorreoApiError";
    }
}
