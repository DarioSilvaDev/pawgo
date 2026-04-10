/**
 * Servicio de Geolocalización para Argentina
 * Implementa caching en memoria con TTL para optimizar performance
 * y sirve datos estáticos de provincias/ciudades.
 */

import { STATIC_CIUDADES_BY_PROVINCIA } from "./geo.static-data.js";

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

const STATIC_PROVINCIAS: ProvinciaDTO[] = [
    { id: "06", nombre: "Buenos Aires" },
    { id: "10", nombre: "Catamarca" },
    { id: "22", nombre: "Chaco" },
    { id: "26", nombre: "Chubut" },
    { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" },
    { id: "14", nombre: "Córdoba" },
    { id: "18", nombre: "Corrientes" },
    { id: "30", nombre: "Entre Ríos" },
    { id: "34", nombre: "Formosa" },
    { id: "38", nombre: "Jujuy" },
    { id: "42", nombre: "La Pampa" },
    { id: "46", nombre: "La Rioja" },
    { id: "50", nombre: "Mendoza" },
    { id: "54", nombre: "Misiones" },
    { id: "58", nombre: "Neuquén" },
    { id: "62", nombre: "Río Negro" },
    { id: "66", nombre: "Salta" },
    { id: "70", nombre: "San Juan" },
    { id: "74", nombre: "San Luis" },
    { id: "78", nombre: "Santa Cruz" },
    { id: "82", nombre: "Santa Fe" },
    { id: "86", nombre: "Santiago del Estero" },
    { id: "94", nombre: "Tierra del Fuego, Antártida e Islas del Atlántico Sur" },
    { id: "90", nombre: "Tucumán" },
];

/**
 * Servicio con caching para datos geográficos de Argentina
 */
export class GeoService {
    private provinciasCache: CacheEntry<ProvinciaDTO[]> | null = null;
    private municipiosCache: Map<string, CacheEntry<CiudadDTO[]>> = new Map();

    private readonly PROVINCIAS_TTL = 24 * 60 * 60 * 1000;
    private readonly MUNICIPIOS_TTL = 12 * 60 * 60 * 1000;

    private isCacheValid<T>(entry: CacheEntry<T> | null | undefined, ttl: number): boolean {
        if (!entry) return false;
        const now = Date.now();
        return (now - entry.timestamp) < ttl;
    }

    async getProvincias(): Promise<ProvinciaDTO[]> {
        if (this.isCacheValid(this.provinciasCache, this.PROVINCIAS_TTL)) {
            console.log("[GeoService] Provincias obtenidas desde cache");
            return this.provinciasCache!.data;
        }

        const provincias = [...STATIC_PROVINCIAS];
        this.provinciasCache = {
            data: provincias,
            timestamp: Date.now(),
        };

        console.log(`[GeoService] ${provincias.length} provincias estáticas cacheadas exitosamente`);
        return provincias;
    }

    async getMunicipiosByProvincia(provinciaId: string): Promise<CiudadDTO[]> {
        if (!provinciaId || !/^\d+$/.test(provinciaId)) {
            throw new Error("ID de provincia inválido");
        }

        const cached = this.municipiosCache.get(provinciaId);
        if (this.isCacheValid(cached, this.MUNICIPIOS_TTL)) {
            console.log(`[GeoService] Municipios de provincia ${provinciaId} obtenidos desde cache`);
            return cached!.data;
        }

        const ciudades = [...(STATIC_CIUDADES_BY_PROVINCIA[provinciaId] ?? [])];

        this.municipiosCache.set(provinciaId, {
            data: ciudades,
            timestamp: Date.now(),
        });

        console.log(`[GeoService] ${ciudades.length} ciudades estáticas cacheadas para provincia ${provinciaId}`);
        return ciudades;
    }

    clearCache(): void {
        this.provinciasCache = null;
        this.municipiosCache.clear();
        console.log("[GeoService] Cache limpiado");
    }

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
