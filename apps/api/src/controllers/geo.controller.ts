/**
 * Controlador para endpoints de geolocalización
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { GeoService } from "../services/geo.service.js";

export class GeoController {
    constructor(private geoService: GeoService) { }

    /**
     * GET /api/geo/provincias
     * Obtiene todas las provincias de Argentina
     */
    async getProvincias(request: FastifyRequest, reply: FastifyReply) {
        try {
            const provincias = await this.geoService.getProvincias();

            return reply.status(200).send({
                success: true,
                data: provincias,
                count: provincias.length,
            });
        } catch (error) {
            console.error("[GeoController] Error en getProvincias:", error);

            return reply.status(503).send({
                success: false,
                error: {
                    message: "Error al obtener las provincias",
                    code: "GEOREF_UNAVAILABLE",
                },
            });
        }
    }

    /**
     * GET /api/geo/ciudades?provinciaId={id}
     * Obtiene las ciudades/municipios de una provincia
     */
    async getCiudades(
        request: FastifyRequest<{
            Querystring: { provinciaId?: string };
        }>,
        reply: FastifyReply
    ) {
        try {
            const { provinciaId } = request.query;

            // Validar parámetro requerido
            if (!provinciaId) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        message: "El parámetro 'provinciaId' es requerido",
                        code: "MISSING_PARAMETER",
                    },
                });
            }

            // Validar formato del ID
            if (!/^\d+$/.test(provinciaId)) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        message: "El parámetro 'provinciaId' debe ser un número válido",
                        code: "INVALID_PARAMETER",
                    },
                });
            }

            const ciudades = await this.geoService.getMunicipiosByProvincia(provinciaId);

            return reply.status(200).send({
                success: true,
                data: ciudades,
                count: ciudades.length,
                provinciaId,
            });
        } catch (error) {
            console.error("[GeoController] Error en getCiudades:", error);

            // Distinguir entre error de validación y error de servicio
            if (error instanceof Error && error.message.includes("inválido")) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        message: error.message,
                        code: "INVALID_PARAMETER",
                    },
                });
            }

            return reply.status(503).send({
                success: false,
                error: {
                    message: "Error al obtener las ciudades",
                    code: "GEOREF_UNAVAILABLE",
                },
            });
        }
    }

    /**
     * GET /api/geo/cache/stats
     * Obtiene estadísticas del cache (útil para debugging)
     */
    async getCacheStats(request: FastifyRequest, reply: FastifyReply) {
        try {
            const stats = this.geoService.getCacheStats();

            return reply.status(200).send({
                success: true,
                data: stats,
            });
        } catch (error) {
            console.error("[GeoController] Error en getCacheStats:", error);

            return reply.status(500).send({
                success: false,
                error: {
                    message: "Error al obtener estadísticas del cache",
                    code: "INTERNAL_ERROR",
                },
            });
        }
    }

    /**
     * POST /api/geo/cache/clear
     * Limpia el cache (solo para admin)
     */
    async clearCache(request: FastifyRequest, reply: FastifyReply) {
        try {
            this.geoService.clearCache();

            return reply.status(200).send({
                success: true,
                message: "Cache limpiado exitosamente",
            });
        } catch (error) {
            console.error("[GeoController] Error en clearCache:", error);

            return reply.status(500).send({
                success: false,
                error: {
                    message: "Error al limpiar el cache",
                    code: "INTERNAL_ERROR",
                },
            });
        }
    }
}
