import {
  CreateInfluencerPaymentDto,
  UpdateInfluencerPaymentDto,
  InfluencerPaymentWithDetails,
} from "@/shared";
import { fetchAPI } from "./auth";

/**
 * Create a new influencer payment request (Admin only)
 */
export async function createInfluencerPayment(
  data: CreateInfluencerPaymentDto
): Promise<InfluencerPaymentWithDetails> {
  const response = await fetchAPI("/influencer-payments", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Get all influencer payments (Admin)
 */
export async function getInfluencerPayments(filters?: {
  influencerId?: string;
  status?: string;
}): Promise<InfluencerPaymentWithDetails[]> {
  const params = new URLSearchParams();
  if (filters?.influencerId) {
    params.append("influencerId", filters.influencerId);
  }
  if (filters?.status) {
    params.append("status", filters.status);
  }

  const queryString = params.toString();
  const endpoint = `/influencer-payments${queryString ? `?${queryString}` : ""}`;

  const response = await fetchAPI(endpoint);
  return response.json();
}

/**
 * Get influencer payment by ID
 */
export async function getInfluencerPaymentById(
  id: string
): Promise<InfluencerPaymentWithDetails> {
  const response = await fetchAPI(`/influencer-payments/${id}`);
  return response.json();
}

/**
 * Get payments for current influencer
 */
export async function getMyInfluencerPayments(): Promise<
  InfluencerPaymentWithDetails[]
> {
  const response = await fetchAPI("/influencer/payments");
  return response.json();
}

/**
 * Update influencer payment
 */
export async function updateInfluencerPayment(
  id: string,
  data: UpdateInfluencerPaymentDto
): Promise<InfluencerPaymentWithDetails> {
  const response = await fetchAPI(`/influencer-payments/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Cancel influencer payment (Admin only)
 */
export async function cancelInfluencerPayment(
  id: string
): Promise<InfluencerPaymentWithDetails> {
  const response = await fetchAPI(`/influencer-payments/${id}/cancel`, {
    method: "POST",
  });
  return response.json();
}

/**
 * Get pending commissions for an influencer (Admin - to create payment)
 */
export async function getPendingCommissions(influencerId: string) {
  const response = await fetchAPI(
    `/influencers/${influencerId}/commissions?status=pending`
  );
  const data = await response.json();
  // The API returns an array directly
  return Array.isArray(data) ? data : data.commissions || [];
}

