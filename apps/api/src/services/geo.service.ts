/**
 * Servicio de Geolocalización para Argentina
 * Implementa caching en memoria con TTL para optimizar performance
 * y reducir llamadas a la API externa GeorefAR
 */

import { GeorefClient, GeorefProvincia, GeorefMunicipio } from "../clients/georef.client.js";

// DTOs normalizados para el frontend
export interface ProvinciaDTO {
    id: string;
    nombre: string;
}

export interface CiudadDTO {
    id: string;
    nombre: string;
    provinciaId: string;
    provinciaNombre: string;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Servicio con caching para datos geográficos de Argentina
 */
export class GeoService {
    private georefClient: GeorefClient;
    private provinciasCache: CacheEntry<ProvinciaDTO[]> | null = null;
    private municipiosCache: Map<string, CacheEntry<CiudadDTO[]>> = new Map();

    // TTL de 24 horas para provincias (datos muy estables)
    private readonly PROVINCIAS_TTL = 24 * 60 * 60 * 1000;

    // TTL de 12 horas para municipios (datos estables)
    private readonly MUNICIPIOS_TTL = 12 * 60 * 60 * 1000;

    constructor() {
        this.georefClient = new GeorefClient();
    }

    /**
     * Verifica si una entrada de caché está vigente
     */
    private isCacheValid<T>(entry: CacheEntry<T> | null | undefined, ttl: number): boolean {
        if (!entry) return false;
        const now = Date.now();
        return (now - entry.timestamp) < ttl;
    }

    /**
     * Obtiene todas las provincias (con cache)
     */
    async getProvincias(): Promise<ProvinciaDTO[]> {
        // Verificar cache
        if (this.isCacheValid(this.provinciasCache, this.PROVINCIAS_TTL)) {
            console.log("[GeoService] Provincias obtenidas desde cache");
            return this.provinciasCache!.data;
        }

        try {
            console.log("[GeoService] Obteniendo provincias desde GeorefAR...");
            const provincias = await this.georefClient.getProvincias();

            // Normalizar y ordenar alfabéticamente
            const normalized = this.normalizeProvincias(provincias);

            // Actualizar cache
            this.provinciasCache = {
                data: normalized,
                timestamp: Date.now(),
            };

            console.log(`[GeoService] ${normalized.length} provincias cacheadas exitosamente`);
            return normalized;
        } catch (error) {
            console.error("[GeoService] Error obteniendo provincias:", error);

            // Si hay cache expirado, devolverlo como fallback
            if (this.provinciasCache) {
                console.warn("[GeoService] Usando cache expirado como fallback");
                return this.provinciasCache.data;
            }

            throw new Error("No se pudieron obtener las provincias");
        }
    }

    /**
     * Obtiene los municipios de una provincia (con cache)
     */
    async getMunicipiosByProvincia(provinciaId: string): Promise<CiudadDTO[]> {
        // Validar parámetro
        if (!provinciaId || !/^\d+$/.test(provinciaId)) {
            throw new Error("ID de provincia inválido");
        }

        // Verificar cache
        const cached = this.municipiosCache.get(provinciaId);
        if (this.isCacheValid(cached, this.MUNICIPIOS_TTL)) {
            console.log(`[GeoService] Municipios de provincia ${provinciaId} obtenidos desde cache`);
            return cached!.data;
        }

        try {
            console.log(`[GeoService] Obteniendo municipios de provincia ${provinciaId} desde GeorefAR...`);
            const municipios = await this.georefClient.getMunicipiosByProvincia(provinciaId);

            // Normalizar y ordenar alfabéticamente
            const normalized = this.normalizeMunicipios(municipios);

            // Actualizar cache
            this.municipiosCache.set(provinciaId, {
                data: normalized,
                timestamp: Date.now(),
            });

            console.log(`[GeoService] ${normalized.length} municipios cacheados para provincia ${provinciaId}`);
            return normalized;
        } catch (error) {
            console.error(`[GeoService] Error obteniendo municipios de provincia ${provinciaId}:`, error);

            // Si hay cache expirado, devolverlo como fallback
            if (cached) {
                console.warn("[GeoService] Usando cache expirado como fallback");
                return cached.data;
            }

            throw new Error(`No se pudieron obtener los municipios de la provincia ${provinciaId}`);
        }
    }

    /**
     * Normaliza provincias al formato DTO
     */
    private normalizeProvincias(provincias: GeorefProvincia[]): ProvinciaDTO[] {
        return provincias
            .map((p) => ({
                id: p.id,
                nombre: p.nombre,
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"));
    }

    /**
     * Normaliza municipios al formato DTO
     */
    private normalizeMunicipios(municipios: GeorefMunicipio[]): CiudadDTO[] {
        return municipios
            .map((m) => ({
                id: m.id,
                nombre: m.nombre,
                provinciaId: m.provincia.id,
                provinciaNombre: m.provincia.nombre,
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"));
    }

    /**
     * Limpia el cache (útil para testing o mantenimiento)
     */
    clearCache(): void {
        this.provinciasCache = null;
        this.municipiosCache.clear();
        console.log("[GeoService] Cache limpiado");
    }

    /**
     * Obtiene estadísticas del cache
     */
    getCacheStats(): {
        provincias: { cached: boolean; age?: number };
        municipios: { count: number; entries: Array<{ provinciaId: string; age: number }> };
    } {
        const now = Date.now();

        return {
            provincias: {
                cached: !!this.provinciasCache,
                age: this.provinciasCache ? now - this.provinciasCache.timestamp : undefined,
            },
            municipios: {
                count: this.municipiosCache.size,
                entries: Array.from(this.municipiosCache.entries()).map(([provinciaId, entry]) => ({
                    provinciaId,
                    age: now - entry.timestamp,
                })),
            },
        };
    }
}
