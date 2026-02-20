/**
 * Rutas para endpoints de geolocalización
 */

import { FastifyInstance } from "fastify";
import { GeoController } from "../controllers/geo.controller.js";
import { GeoService } from "../services/geo.service.js";
import { createAuthMiddleware, requireRole } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "../shared/index.js";

export async function geoRoutes(
    fastify: FastifyInstance,
    options: {
        tokenService: TokenService;
    }
) {
    const geoService = new GeoService();
    const geoController = new GeoController(geoService);
    const authenticate = createAuthMiddleware(options.tokenService);
    const requireAdmin = requireRole(UserRole.ADMIN);

    /**
     * GET /api/geo/provincias
     * Público - Obtiene todas las provincias
     */
    fastify.get("/geo/provincias", async (request, reply) => {
        return geoController.getProvincias(request, reply);
    });

    /**
     * GET /api/geo/ciudades
     * Público - Obtiene ciudades de una provincia
     */
    fastify.get<{
        Querystring: { provinciaId?: string };
    }>("/geo/ciudades", async (request, reply) => {
        return geoController.getCiudades(request, reply);
    });

    /**
     * GET /api/geo/cache/stats
     * Protegido - Estadísticas del cache (solo admin)
     */
    fastify.get(
        "/geo/cache/stats",
        {
            preHandler: [authenticate, requireAdmin],
        },
        async (request, reply) => {
            return geoController.getCacheStats(request, reply);
        }
    );

    /**
     * POST /api/geo/cache/clear
     * Protegido - Limpia el cache (solo admin)
     */
    fastify.post(
        "/geo/cache/clear",
        {
            preHandler: [authenticate, requireAdmin],
        },
        async (request, reply) => {
            return geoController.clearCache(request, reply);
        }
    );
}
