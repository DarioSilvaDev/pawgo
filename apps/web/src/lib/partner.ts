import { fetchAPI } from "./auth";

export interface PickupPoint {
  id: string;
  name: string;
  city?: string;
  state?: string;
  address?: Record<string, unknown>;
  partner: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface PartnerReferral {
  id: string;
  slug: string;
  sourceType: "local_qr" | "local_code";
  landingTarget: string;
  partner: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  };
  partnerPoint?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    pickupEnabled: boolean;
    isActive: boolean;
  } | null;
}

export interface Partner {
  id: string;
  name: string;
  slug: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  isActive: boolean;
  points: Array<{
    id: string;
    name: string;
    city?: string;
    state?: string;
    address?: Record<string, unknown>;
    pickupEnabled: boolean;
    isActive: boolean;
  }>;
  referralSources: Array<{
    id: string;
    slug: string;
    code?: string;
    sourceType: "local_qr" | "local_code";
    isActive: boolean;
    partnerPoint?: { id: string; name: string } | null;
  }>;
}

export interface PartnerWholesaleSale {
  id: string;
  partnerId: string;
  soldAt: string;
  invoiceNumber?: string;
  notes?: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  partner: {
    id: string;
    name: string;
    slug: string;
  };
  items: Array<{
    id: string;
    productVariantId: string;
    quantity: number;
    unitWholesalePrice: number;
    unitCost: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    productVariant: {
      id: string;
      name: string;
      size?: string;
      product: {
        id: string;
        name: string;
      };
    };
  }>;
}

export interface PickupRequest {
  id: string;
  orderId: string;
  status: "awaiting_stock" | "ready_notified" | "cancelled";
  createdAt: string;
  readyAt?: string;
  notifiedAt?: string;
  partnerPoint: {
    id: string;
    name: string;
    partner: {
      id: string;
      name: string;
      slug: string;
    };
  };
  order: {
    id: string;
    lead?: {
      email: string;
      name?: string;
      lastName?: string;
    } | null;
  };
}

export async function getPickupPoints(): Promise<PickupPoint[]> {
  const response = await fetchAPI("/partners/pickup-points");
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.pickupPoints || [];
}

export async function resolvePartnerReferral(slug: string): Promise<PartnerReferral> {
  const response = await fetchAPI(`/partners/referrals/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  if (!data.valid || !data.referral) {
    throw new Error("Referencia inválida");
  }
  return data.referral as PartnerReferral;
}

export const partnerAdminAPI = {
  async getAll(): Promise<Partner[]> {
    const response = await fetchAPI("/partners");
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.partners || [];
  },

  async create(data: {
    name: string;
    slug: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
  }): Promise<Partner> {
    const response = await fetchAPI("/partners", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async createPoint(
    partnerId: string,
    data: {
      name: string;
      city?: string;
      state?: string;
      address?: Record<string, unknown>;
      pickupEnabled?: boolean;
    }
  ) {
    const response = await fetchAPI(`/partners/${partnerId}/points`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async createReferralSource(
    partnerId: string,
    data: {
      partnerPointId?: string;
      sourceType?: "local_qr" | "local_code";
      slug?: string;
      code?: string;
      landingTarget?: string;
    }
  ) {
    const response = await fetchAPI(`/partners/${partnerId}/referral-sources`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async getWholesaleSales(partnerId?: string): Promise<PartnerWholesaleSale[]> {
    const endpoint = partnerId
      ? `/partners/${partnerId}/wholesale-sales`
      : "/partners/wholesale-sales";
    const response = await fetchAPI(endpoint);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.sales || [];
  },

  async createWholesaleSale(
    partnerId: string,
    data: {
      soldAt?: string;
      invoiceNumber?: string;
      notes?: string;
      items: Array<{
        productVariantId: string;
        quantity: number;
        unitWholesalePrice: number;
        unitCost: number;
      }>;
    }
  ): Promise<PartnerWholesaleSale> {
    const response = await fetchAPI(`/partners/${partnerId}/wholesale-sales`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async getPickupRequests(status?: "awaiting_stock" | "ready_notified" | "cancelled"): Promise<PickupRequest[]> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const qs = params.toString();
    const response = await fetchAPI(`/partners/pickup-requests${qs ? `?${qs}` : ""}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.requests || [];
  },

  async markPickupReady(id: string, note?: string): Promise<PickupRequest> {
    const response = await fetchAPI(`/partners/pickup-requests/${id}/ready`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};
