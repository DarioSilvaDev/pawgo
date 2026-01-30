import { getAuthHeader } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Upload invoice file
 */
export async function uploadInvoice(
  paymentId: string,
  file: File
): Promise<{ url: string; filename: string }> {
  const authHeader = getAuthHeader();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/api/influencer-payments/${paymentId}/upload-invoice`,
    {
      method: "POST",
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload payment proof file
 */
export async function uploadPaymentProof(
  paymentId: string,
  file: File
): Promise<{ url: string; filename: string }> {
  const authHeader = getAuthHeader();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/api/influencer-payments/${paymentId}/upload-payment-proof`,
    {
      method: "POST",
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload content file (screenshot, etc.)
 */
export async function uploadContent(
  paymentId: string,
  file: File
): Promise<{ url: string; filename: string; links: string[] }> {
  const authHeader = getAuthHeader();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/api/influencer-payments/${paymentId}/upload-content`,
    {
      method: "POST",
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `Error: ${response.statusText}`);
  }

  return response.json();
}
