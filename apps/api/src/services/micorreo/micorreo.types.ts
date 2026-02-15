// ============================================
// Authentication Types
// ============================================

export interface MiCorreoTokenResponse {
    token: string;
    expires: string;
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
