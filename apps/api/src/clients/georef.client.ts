/**
 * Cliente HTTP para consumir la API GeorefAR del Gobierno Argentino
 * Documentación oficial: https://apis.datos.gob.ar/georef/
 */

import { envs } from "../config/envs.js";

const GEOREF_BASE_URL = "https://apis.datos.gob.ar/georef/api";
const REQUEST_TIMEOUT = 5000; // 5 segundos
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

// Tipos de respuesta de la API GeorefAR
export interface GeorefProvincia {
    id: string;
    nombre: string;
    centroide?: {
        lat: number;
        lon: number;
    };
}

export interface GeorefMunicipio {
    id: string;
    nombre: string;
    provincia: {
        id: string;
        nombre: string;
    };
    centroide?: {
        lat: number;
        lon: number;
    };
}

interface GeorefProvinciasResponse {
    provincias: GeorefProvincia[];
    cantidad: number;
    total: number;
    inicio: number;
}

interface GeorefMunicipiosResponse {
    municipios: GeorefMunicipio[];
    cantidad: number;
    total: number;
    inicio: number;
}

/**
 * Cliente para interactuar con la API GeorefAR
 */
export class GeorefClient {
    private baseUrl: string;
    private timeout: number;
    private maxRetries: number;

    constructor() {
        this.baseUrl = GEOREF_BASE_URL;
        this.timeout = REQUEST_TIMEOUT;
        this.maxRetries = MAX_RETRIES;
    }

    /**
     * Realiza una petición HTTP con retry y timeout
     */
    private async fetchWithRetry(
        url: string,
        retries = this.maxRetries
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            // Si quedan reintentos y el error es recuperable
            if (retries > 0 && this.isRetryableError(error)) {
                console.warn(
                    `[GeorefClient] Error en request, reintentando... (${this.maxRetries - retries + 1}/${this.maxRetries})`,
                    error
                );
                await this.delay(RETRY_DELAY);
                return this.fetchWithRetry(url, retries - 1);
            }

            throw error;
        }
    }

    /**
     * Determina si un error es recuperable y vale la pena reintentar
     */
    private isRetryableError(error: unknown): boolean {
        if (error instanceof Error) {
            // Timeout o errores de red
            if (error.name === "AbortError" || error.message.includes("fetch")) {
                return true;
            }
            // Errores 5xx del servidor
            if (error.message.includes("HTTP 5")) {
                return true;
            }
        }
        return false;
    }

    /**
     * Delay helper para reintentos
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Obtiene todas las provincias de Argentina
     */
    async getProvincias(): Promise<GeorefProvincia[]> {
        try {
            const url = `${this.baseUrl}/provincias?campos=id,nombre&max=24`;
            const response = await this.fetchWithRetry(url);
            const data = (await response.json()) as GeorefProvinciasResponse;

            return data.provincias || [];
        } catch (error) {
            console.error("[GeorefClient] Error obteniendo provincias:", error);
            throw new Error("Error al obtener provincias desde GeorefAR");
        }
    }

    /**
     * Obtiene los municipios de una provincia específica
     */
    async getMunicipiosByProvincia(
        provinciaId: string
    ): Promise<GeorefMunicipio[]> {
        try {
            // Validar que el ID sea numérico
            if (!provinciaId || !/^\d+$/.test(provinciaId)) {
                throw new Error("ID de provincia inválido");
            }

            const url = `${this.baseUrl}/municipios?provincia=${provinciaId}&campos=id,nombre,provincia&max=1000&orden=nombre`;
            const response = await this.fetchWithRetry(url);
            const data = (await response.json()) as GeorefMunicipiosResponse;

            return data.municipios || [];
        } catch (error) {
            console.error(
                `[GeorefClient] Error obteniendo municipios para provincia ${provinciaId}:`,
                error
            );
            throw new Error("Error al obtener municipios desde GeorefAR");
        }
    }

    /**
     * Obtiene las localidades de una provincia específica
     * Nota: Las localidades son más granulares que los municipios
     */
    async getLocalidadesByProvincia(
        provinciaId: string
    ): Promise<GeorefMunicipio[]> {
        try {
            if (!provinciaId || !/^\d+$/.test(provinciaId)) {
                throw new Error("ID de provincia inválido");
            }

            const url = `${this.baseUrl}/localidades?provincia=${provinciaId}&campos=id,nombre,provincia&max=5000&orden=nombre`;
            const response = await this.fetchWithRetry(url);
            const data = (await response.json()) as { localidades: GeorefMunicipio[] };

            return data.localidades || [];
        } catch (error) {
            console.error(
                `[GeorefClient] Error obteniendo localidades para provincia ${provinciaId}:`,
                error
            );
            throw new Error("Error al obtener localidades desde GeorefAR");
        }
    }
}
