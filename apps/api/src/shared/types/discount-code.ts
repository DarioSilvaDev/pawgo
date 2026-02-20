// SHARED: Este archivo se mantiene sincronizado manualmente entre api y web.
// Si lo modificás, actualizá también la copia en la otra app.

export type DiscountCodeType = "influencer" | "lead_reservation";

export interface DiscountCode {
    id: string;
    code: string;
    codeType: DiscountCodeType;
    influencerId: string | null;
    discountType: "percentage" | "fixed";
    discountValue: number;
    commissionType?: "percentage" | "fixed";
    commissionValue?: number;
    minPurchase?: number;
    maxUses?: number;
    usedCount: number;
    isActive: boolean;
    validFrom: Date;
    validUntil?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateDiscountCodeDto {
    influencerId?: string;
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    commissionType?: "percentage" | "fixed";
    commissionValue?: number;
    minPurchase?: number;
    maxUses?: number;
    validUntil?: string; // ISO date string
}

export interface UpdateDiscountCodeDto {
    code?: string;
    discountType?: "percentage" | "fixed";
    discountValue?: number;
    commissionType?: "percentage" | "fixed";
    commissionValue?: number;
    minPurchase?: number;
    maxUses?: number;
    isActive?: boolean;
    validUntil?: string; // ISO date string
}

export interface DiscountCodeWithInfluencer extends DiscountCode {
    influencer: {
        id: string;
        name: string;
        email: string;
    } | null;
    leadEmail?: string;
    leadName?: string;
}

export interface LeadDiscountConfig {
    discountType: "percentage" | "fixed";
    discountValue: number;
    validDays: number;
}
