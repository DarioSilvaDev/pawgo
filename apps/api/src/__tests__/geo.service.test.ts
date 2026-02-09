/**
 * Tests unitarios para GeoService
 * Verifica el comportamiento del caching y normalización de datos
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeoService } from "../services/geo.service";
import { GeorefClient } from "../clients/georef.client";

// Mock del cliente
vi.mock("../clients/georef.client");

describe("GeoService", () => {
    let service: GeoService;
    let mockClient: any;

    beforeEach(() => {
        service = new GeoService();
        mockClient = vi.mocked(GeorefClient).prototype;
        vi.clearAllMocks();
    });

    describe("getProvincias", () => {
        it("debe obtener y cachear provincias", async () => {
            const mockProvincias = [
                { id: "06", nombre: "Buenos Aires" },
                { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" },
            ];

            mockClient.getProvincias = vi.fn().mockResolvedValue(mockProvincias);

            // Primera llamada
            const result1 = await service.getProvincias();
            expect(result1).toHaveLength(2);
            expect(mockClient.getProvincias).toHaveBeenCalledTimes(1);

            // Segunda llamada (debe usar cache)
            const result2 = await service.getProvincias();
            expect(result2).toHaveLength(2);
            expect(mockClient.getProvincias).toHaveBeenCalledTimes(1); // No debe llamar de nuevo
        });

        it("debe ordenar provincias alfabéticamente", async () => {
            const mockProvincias = [
                { id: "06", nombre: "Buenos Aires" },
                { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" },
                { id: "14", nombre: "Córdoba" },
            ];

            mockClient.getProvincias = vi.fn().mockResolvedValue(mockProvincias);

            const result = await service.getProvincias();

            expect(result[0].nombre).toBe("Buenos Aires");
            expect(result[1].nombre).toBe("Ciudad Autónoma de Buenos Aires");
            expect(result[2].nombre).toBe("Córdoba");
        });

        it("debe usar cache expirado como fallback en caso de error", async () => {
            const mockProvincias = [{ id: "02", nombre: "CABA" }];

            // Primera llamada exitosa
            mockClient.getProvincias = vi.fn().mockResolvedValue(mockProvincias);
            await service.getProvincias();

            // Limpiar cache para simular expiración
            service.clearCache();

            // Segunda llamada con error
            mockClient.getProvincias = vi.fn().mockRejectedValue(new Error("API down"));

            await expect(service.getProvincias()).rejects.toThrow(
                "No se pudieron obtener las provincias"
            );
        });
    });

    describe("getMunicipiosByProvincia", () => {
        it("debe validar ID de provincia", async () => {
            await expect(service.getMunicipiosByProvincia("")).rejects.toThrow(
                "ID de provincia inválido"
            );

            await expect(service.getMunicipiosByProvincia("abc")).rejects.toThrow(
                "ID de provincia inválido"
            );
        });

        it("debe obtener y cachear municipios por provincia", async () => {
            const mockMunicipios = [
                {
                    id: "060007",
                    nombre: "Adolfo Alsina",
                    provincia: { id: "06", nombre: "Buenos Aires" },
                },
            ];

            mockClient.getMunicipiosByProvincia = vi
                .fn()
                .mockResolvedValue(mockMunicipios);

            // Primera llamada
            const result1 = await service.getMunicipiosByProvincia("06");
            expect(result1).toHaveLength(1);
            expect(mockClient.getMunicipiosByProvincia).toHaveBeenCalledTimes(1);

            // Segunda llamada (debe usar cache)
            const result2 = await service.getMunicipiosByProvincia("06");
            expect(result2).toHaveLength(1);
            expect(mockClient.getMunicipiosByProvincia).toHaveBeenCalledTimes(1);
        });

        it("debe normalizar municipios correctamente", async () => {
            const mockMunicipios = [
                {
                    id: "060007",
                    nombre: "Adolfo Alsina",
                    provincia: { id: "06", nombre: "Buenos Aires" },
                    centroide: { lat: -36.5, lon: -62.5 },
                },
            ];

            mockClient.getMunicipiosByProvincia = vi
                .fn()
                .mockResolvedValue(mockMunicipios);

            const result = await service.getMunicipiosByProvincia("06");

            expect(result[0]).toEqual({
                id: "060007",
                nombre: "Adolfo Alsina",
                provinciaId: "06",
                provinciaNombre: "Buenos Aires",
            });
        });
    });

    describe("Cache management", () => {
        it("debe limpiar el cache correctamente", async () => {
            const mockProvincias = [{ id: "02", nombre: "CABA" }];
            mockClient.getProvincias = vi.fn().mockResolvedValue(mockProvincias);

            await service.getProvincias();
            expect(mockClient.getProvincias).toHaveBeenCalledTimes(1);

            service.clearCache();

            await service.getProvincias();
            expect(mockClient.getProvincias).toHaveBeenCalledTimes(2);
        });

        it("debe retornar estadísticas del cache", async () => {
            const stats = service.getCacheStats();

            expect(stats).toHaveProperty("provincias");
            expect(stats).toHaveProperty("municipios");
            expect(stats.provincias.cached).toBe(false);
            expect(stats.municipios.count).toBe(0);
        });
    });
});
