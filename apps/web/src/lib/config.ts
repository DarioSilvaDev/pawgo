import { PublicConfig, CTAConfig } from "@/shared";
import { fetchAPI } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/**
 * Obtiene la configuración pública desde el backend
 */
export async function getPublicConfig(): Promise<PublicConfig> {
    try {
        const response = await fetch(`${API_URL}/api/config/public`, {
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
