export interface DiscountCode {
  id: string;
  code: string;
  influencerId: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
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
  influencerId: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchase?: number;
  maxUses?: number;
  validUntil?: string; // ISO date string
}

export interface UpdateDiscountCodeDto {
  code?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
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
  };
}

