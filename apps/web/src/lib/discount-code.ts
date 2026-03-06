import { fetchAPI } from "./auth";
import { CreateDiscountCodeDto, UpdateDiscountCodeDto, LeadDiscountConfig } from "@/shared";

export interface DiscountCodeValidation {
  valid: boolean;
  discountAmount: number;
  discountCode?: {
    id: string;
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    influencer?: {
      id: string;
      name: string;
    };
  };
  error?: string;
}

/**
 * Validate a discount code (public endpoint)
 */
export async function validateDiscountCode(
  code: string,
  subtotal: number
): Promise<DiscountCodeValidation> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/discount-codes/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, subtotal }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error al validar el código",
    }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    qs.append(k, String(v));
  }
  const q = qs.toString();
  return q ? `?${q}` : "";
}

export const discountCodeAPI = {
  async getAll(filters?: { influencerId?: string; isActive?: boolean; code?: string; codeType?: string }) {
    const query = buildQuery({
      influencerId: filters?.influencerId,
      isActive: filters?.isActive,
      code: filters?.code,
      codeType: filters?.codeType,
    });
    const res = await fetchAPI(`/discount-codes${query}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Error al cargar códigos" }));
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  async create(data: CreateDiscountCodeDto) {
    const res = await fetchAPI(`/discount-codes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Error al crear código" }));
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  async update(id: string, data: UpdateDiscountCodeDto) {
    const res = await fetchAPI(`/discount-codes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Error al actualizar código" }));
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  async delete(id: string) {
    const res = await fetchAPI(`/discount-codes/${id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      const error = await res.json().catch(() => ({ error: "Error al eliminar código" }));
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }
  },

  // ─── Lead Discount Config ────────────────────

  async getLeadDiscountConfig(): Promise<LeadDiscountConfig> {
    const res = await fetchAPI(`/discount-codes/lead-config`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Error al cargar configuración" }));
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  async updateLeadDiscountConfig(config: LeadDiscountConfig): Promise<LeadDiscountConfig> {
    const res = await fetchAPI(`/discount-codes/lead-config`, {
      method: "PUT",
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Error al guardar configuración" }));
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },
};

export const adminInfluencerAPI = {
  async getAll() {
    const res = await fetchAPI(`/influencers`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Error al cargar influencers" }));
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }
    const influencers = await res.json();
    return { influencers };
  },
};
