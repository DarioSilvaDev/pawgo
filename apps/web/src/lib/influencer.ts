import { fetchAPI } from "./auth";

export interface InfluencerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  socialMedia?: Record<string, unknown>;
  isActive: boolean;
  paymentMethod?: "transfer" | "mercadopago";
  accountNumber?: string;
  cvu?: string;
  bankName?: string;
  mercadopagoEmail?: string;
  taxId?: string;
  createdAt: Date;
}

export interface UpdatePaymentInfoDto {
  paymentMethod?: "transfer" | "mercadopago";
  accountNumber?: string | null;
  cvu?: string | null;
  bankName?: string | null;
  mercadopagoEmail?: string | null;
  taxId?: string | null;
}

/**
 * Get current influencer profile
 */
export async function getInfluencerProfile(): Promise<InfluencerProfile> {
  const response = await fetchAPI("/influencers/me");
  return response.json();
}

/**
 * Update payment information for current influencer
 */
export async function updatePaymentInfo(
  data: UpdatePaymentInfoDto
): Promise<InfluencerProfile> {
  const response = await fetchAPI("/influencers/me/payment-info", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
}

// Admin functions
export interface Influencer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  socialMedia?: Record<string, unknown>;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

export interface CreateInfluencerDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  socialMedia?: Record<string, unknown>;
}

export interface UpdateInfluencerDto {
  name?: string;
  phone?: string;
  socialMedia?: Record<string, unknown>;
  isActive?: boolean;
}

/**
 * Get all influencers (admin only)
 */
export async function getAllInfluencers(): Promise<Influencer[]> {
  const response = await fetchAPI("/influencers");
  return response.json();
}

/**
 * Get influencer by ID (admin only)
 */
export async function getInfluencerById(id: string): Promise<Influencer> {
  const response = await fetchAPI(`/influencers/${id}`);
  return response.json();
}

/**
 * Create influencer (admin only)
 */
export async function createInfluencer(
  data: CreateInfluencerDto
): Promise<Influencer> {
  const response = await fetchAPI("/influencers", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Update influencer (admin only)
 */
export async function updateInfluencer(
  id: string,
  data: UpdateInfluencerDto
): Promise<Influencer> {
  const response = await fetchAPI(`/influencers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Delete influencer (admin only - soft delete)
 */
export async function deleteInfluencer(id: string): Promise<void> {
  await fetchAPI(`/influencers/${id}`, {
    method: "DELETE",
  });
}

