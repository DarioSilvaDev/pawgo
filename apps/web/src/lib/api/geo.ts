/**
 * Servicio API para geolocalización de Argentina
 * Consume los endpoints del backend para provincias y ciudades
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface Provincia {
    id: string;
    nombre: string;
}

export interface Ciudad {
    id: string;
    nombre: string;
    provinciaId: string;
    provinciaNombre: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    count?: number;
    error?: {
        message: string;
        code: string;
    };
}

/**
 * Obtiene todas las provincias de Argentina
 */
export async function getProvincias(): Promise<Provincia[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/geo/provincias`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = (await response.json()) as ApiResponse<Provincia[]>;

        if (!result.success) {
            throw new Error(result.error?.message || "Error al obtener provincias");
        }

        return result.data;
    } catch (error) {
        console.error("[GeoAPI] Error obteniendo provincias:", error);
        throw error;
    }
}

/**
 * Obtiene las ciudades de una provincia específica
 */
export async function getCiudadesByProvincia(
    provinciaId: string
): Promise<Ciudad[]> {
    try {
        if (!provinciaId) {
            throw new Error("provinciaId es requerido");
        }

        const response = await fetch(
            `${API_BASE_URL}/api/geo/ciudades?provinciaId=${encodeURIComponent(provinciaId)}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = (await response.json()) as ApiResponse<Ciudad[]>;

        if (!result.success) {
            throw new Error(result.error?.message || "Error al obtener ciudades");
        }

        return result.data;
    } catch (error) {
        console.error(
            `[GeoAPI] Error obteniendo ciudades para provincia ${provinciaId}:`,
            error
        );
        throw error;
    }
}
