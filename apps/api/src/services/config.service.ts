import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.client.js";

// Tipos para la configuración del CTA
export type CTAAction = "SHOW_MODAL" | "REDIRECT";

export interface CTAConfig {
    action: CTAAction;
    modalType?: "WAITLIST" | "BUY_INTENT";
    url?: string;
}

export interface PublicConfig {
    cta: CTAConfig;
}

// Configuración por defecto (fallback)
const DEFAULT_CTA_CONFIG: CTAConfig = {
    action: "REDIRECT",
    url: "/checkout",
};

export class ConfigService {
    private cache: Map<string, { value: unknown; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos en ms

    /**
     * Obtiene la configuración pública (cacheable)
     */
    async getPublicConfig(): Promise<PublicConfig> {
        const ctaConfig = await this.getCTAConfig();
        return {
            cta: ctaConfig,
        };
    }

    /**
     * Obtiene la configuración del CTA
     */
    async getCTAConfig(): Promise<CTAConfig> {
        const cached = this.getFromCache<CTAConfig>("cta_config");
        if (cached) {
            return cached;
        }

        try {
            const config = await prisma.appConfig.findUnique({
                where: { key: "cta_config" },
            });

            if (!config) {
                // Si no existe, retornar configuración por defecto
                return DEFAULT_CTA_CONFIG;
            }

            // Validar y normalizar el schema
            const ctaConfig = this.validateCTAConfig(config.value);
            this.setCache("cta_config", ctaConfig);
            return ctaConfig;
        } catch (error) {
            console.error("[ConfigService] Error al obtener CTA config:", error);
            // En caso de error, retornar configuración por defecto
            return DEFAULT_CTA_CONFIG;
        }
    }

    /**
     * Actualiza la configuración del CTA (solo admin)
     */
    async updateCTAConfig(ctaConfig: CTAConfig): Promise<CTAConfig> {
        // Validar antes de guardar
        const validatedConfig = this.validateCTAConfig(ctaConfig);

        try {
            const updated = await prisma.appConfig.upsert({
                where: { key: "cta_config" },
                update: {
                    value: validatedConfig as unknown as Prisma.InputJsonValue,
                    version: { increment: 1 },
                },
                create: {
                    key: "cta_config",
                    value: validatedConfig as unknown as Prisma.InputJsonValue,
                    version: 1,
                },
            });

            // Invalidar cache
            this.invalidateCache("cta_config");

            // Validar y retornar la configuración actualizada
            return this.validateCTAConfig(updated.value);
        } catch (error) {
            console.error("[ConfigService] Error al actualizar CTA config:", error);
            throw new Error("Error al actualizar la configuración del CTA");
        }
    }

    /**
     * Valida y normaliza la configuración del CTA
     */
    private validateCTAConfig(value: unknown): CTAConfig {
        if (!value || typeof value !== "object") {
            throw new Error("Configuración del CTA inválida");
        }

        const config = value as Record<string, unknown>;

        // Validar action
        if (
            !config.action ||
            !["SHOW_MODAL", "REDIRECT"].includes(config.action as string)
        ) {
            throw new Error(
                "Action inválida. Debe ser 'SHOW_MODAL' o 'REDIRECT'"
            );
        }

        const action = config.action as CTAAction;

        // Validar según el tipo de acción
        if (action === "SHOW_MODAL") {
            if (
                !config.modalType ||
                !["WAITLIST", "BUY_INTENT"].includes(config.modalType as string)
            ) {
                throw new Error(
                    "modalType inválido. Debe ser 'WAITLIST' o 'BUY_INTENT'"
                );
            }
            return {
                action,
                modalType: config.modalType as "WAITLIST" | "BUY_INTENT",
            };
        }

        // Para REDIRECT, validar URL
        if (action === "REDIRECT") {
            if (!config.url || typeof config.url !== "string") {
                throw new Error("URL es requerida para acción REDIRECT");
            }
            return {
                action,
                url: config.url,
            };
        }

        throw new Error("Configuración del CTA inválida");
    }

    /**
     * Obtiene un valor del cache si existe y no ha expirado
     */
    private getFromCache<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }

        return cached.value as T;
    }

    /**
     * Guarda un valor en el cache
     */
    private setCache(key: string, value: unknown): void {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
    }

    /**
     * Invalida un valor del cache
     */
    private invalidateCache(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Invalida todo el cache
     */
    invalidateAllCache(): void {
        this.cache.clear();
    }
}
