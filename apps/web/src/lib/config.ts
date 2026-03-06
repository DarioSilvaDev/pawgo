import { PublicConfig, CTAConfig } from "@/shared";
import { fetchAPI } from "./auth";

/**
 * Sanitize API URL to ensure it ends with /api exactly once
 */
function sanitizeApiUrl(url: string | undefined): string {
    const baseUrl = url || "http://localhost:3001";
    // Remove trailing slashes
    let sanitized = baseUrl.replace(/\/+$/, "");

    // If it doesn't end with /api, add it
    if (!sanitized.endsWith("/api")) {
        sanitized += "/api";
    }

    return sanitized;
}

export const API_URL = sanitizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

/**
 * Obtiene la configuración pública desde el backend
 */
export async function getPublicConfig(): Promise<PublicConfig> {
    try {
        const response = await fetch(`${API_URL}/config/public`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            // No cache para obtener siempre la configuración más reciente
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("[getPublicConfig] Error al obtener configuración:", error);
        // Fallback seguro en caso de error
        return {
            cta: {
                action: "REDIRECT",
                url: "/checkout",
            },
        };
    }
}

/**
 * Obtiene la configuración del CTA (solo admin)
 */
export async function getAdminCTAConfig(): Promise<CTAConfig> {
    const response = await fetchAPI("/admin/config/cta");
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

/**
 * Actualiza la configuración del CTA (solo admin)
 */
export async function updateCTAConfig(data: CTAConfig): Promise<CTAConfig> {
    const response = await fetchAPI("/admin/config/cta", {
        method: "PUT",
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.config || result;
}
