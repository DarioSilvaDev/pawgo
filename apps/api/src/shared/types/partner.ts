export type PartnerReferralSourceType = "local_qr" | "local_code";
export type PickupRequestStatus = "awaiting_stock" | "ready_notified" | "cancelled";

export interface CreatePartnerDto {
  name: string;
  slug: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export interface UpdatePartnerDto {
  name?: string;
  slug?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CreatePartnerPointDto {
  name: string;
  city?: string;
  state?: string;
  address?: Record<string, unknown>;
  pickupEnabled?: boolean;
  isActive?: boolean;
}

export interface UpdatePartnerPointDto {
  name?: string;
  city?: string;
  state?: string;
  address?: Record<string, unknown>;
  pickupEnabled?: boolean;
  isActive?: boolean;
}

export interface CreatePartnerReferralSourceDto {
  partnerPointId?: string;
  sourceType?: PartnerReferralSourceType;
  slug?: string;
  code?: string;
  landingTarget?: string;
}

export interface CreatePartnerWholesaleSaleItemDto {
  productVariantId: string;
  quantity: number;
  unitWholesalePrice: number;
  unitCost: number;
}

export interface CreatePartnerWholesaleSaleDto {
  soldAt?: string;
  invoiceNumber?: string;
  notes?: string;
  items: CreatePartnerWholesaleSaleItemDto[];
}

export interface MarkPickupReadyDto {
  note?: string;
}
