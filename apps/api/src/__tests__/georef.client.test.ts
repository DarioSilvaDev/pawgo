/**
 * Tests unitarios para GeorefClient
 * Verifica el comportamiento del cliente HTTP con la API GeorefAR
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeorefClient } from "../clients/georef.client";

// Mock de fetch global
global.fetch = vi.fn();

describe("GeorefClient", () => {
    let client: GeorefClient;

    beforeEach(() => {
        client = new GeorefClient();
        vi.clearAllMocks();
    });

    describe("getProvincias", () => {
        it("debe obtener provincias exitosamente", async () => {
            const mockResponse = {
                provincias: [
                    { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" },
                    { id: "06", nombre: "Buenos Aires" },
                ],
                cantidad: 2,
                total: 24,
                inicio: 0,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await client.getProvincias();

            expect(result).toHaveLength(2);
            expect(result[0].nombre).toBe("Ciudad Autónoma de Buenos Aires");
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it("debe manejar errores de red", async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

            await expect(client.getProvincias()).rejects.toThrow(
                "Error al obtener provincias desde GeorefAR"
            );
        });

        it("debe manejar respuestas HTTP con error", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: "Internal Server Error",
            });

            await expect(client.getProvincias()).rejects.toThrow();
        });
    });

    describe("getMunicipiosByProvincia", () => {
        it("debe obtener municipios exitosamente", async () => {
            const mockResponse = {
                municipios: [
                    {
                        id: "060007",
                        nombre: "Adolfo Alsina",
                        provincia: { id: "06", nombre: "Buenos Aires" },
                    },
                ],
                cantidad: 1,
                total: 135,
                inicio: 0,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await client.getMunicipiosByProvincia("06");

            expect(result).toHaveLength(1);
            expect(result[0].nombre).toBe("Adolfo Alsina");
            expect(result[0].provincia.id).toBe("06");
        });

        it("debe validar ID de provincia", async () => {
            await expect(client.getMunicipiosByProvincia("")).rejects.toThrow(
                "ID de provincia inválido"
            );

            await expect(client.getMunicipiosByProvincia("abc")).rejects.toThrow(
                "ID de provincia inválido"
            );
        });

        it("debe manejar provincia sin municipios", async () => {
            const mockResponse = {
                municipios: [],
                cantidad: 0,
                total: 0,
                inicio: 0,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await client.getMunicipiosByProvincia("99");

            expect(result).toHaveLength(0);
        });
    });

    describe("Retry logic", () => {
        it("debe reintentar en caso de timeout", async () => {
            // Primera llamada: timeout
            (global.fetch as any).mockRejectedValueOnce({
                name: "AbortError",
                message: "The operation was aborted",
            });

            // Segunda llamada: éxito
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    provincias: [{ id: "02", nombre: "CABA" }],
                    cantidad: 1,
                    total: 1,
                    inicio: 0,
                }),
            });

            const result = await client.getProvincias();

            expect(result).toHaveLength(1);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });
});
