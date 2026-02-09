import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { ConfigService } from "../services/config.service.js";

const configService = new ConfigService();

// Schema de validación para actualizar CTA
const updateCTAConfigSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("SHOW_MODAL"),
        modalType: z.enum(["WAITLIST", "BUY_INTENT"]),
    }),
    z.object({
        action: z.literal("REDIRECT"),
        url: z.string().min(1, "URL es requerida"),
    }),
]);

export const configController = {
    /**
     * Get public configuration
     * GET /api/config/public
     */
    async getPublicConfig(request: FastifyRequest, reply: FastifyReply) {
        try {
            const config = await configService.getPublicConfig();
            reply.send(config);
        } catch (error) {
            if (error instanceof Error) {
                reply.status(500).send({
                    error: "Error al obtener la configuración pública",
                    details: error.message,
                });
                return;
            }
            throw error;
        }
    },

    /**
     * Get CTA configuration (admin only)
     * GET /api/admin/config/cta
     */
    async getCTAConfig(request: FastifyRequest, reply: FastifyReply) {
        try {
            const config = await configService.getCTAConfig();
            reply.send(config);
        } catch (error) {
            if (error instanceof Error) {
                reply.status(500).send({
                    error: "Error al obtener la configuración del CTA",
                    details: error.message,
                });
                return;
            }
            throw error;
        }
    },

    /**
     * Update CTA configuration (admin only)
     * PUT /api/admin/config/cta
     */
    async updateCTAConfig(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = updateCTAConfigSchema.parse(request.body);
            const config = await configService.updateCTAConfig(body);

            reply.send({
                message: "Configuración del CTA actualizada exitosamente",
                config,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                reply.status(400).send({
                    error: "Error de validación",
                    details: error.errors,
                });
                return;
            }

            if (error instanceof Error) {
                reply.status(400).send({
                    error: error.message,
                });
                return;
            }
            throw error;
        }
    },

    /**
     * Invalidate cache (admin only)
     * POST /api/admin/config/cache/invalidate
     */
    async invalidateCache(request: FastifyRequest, reply: FastifyReply) {
        try {
            configService.invalidateAllCache();
            reply.send({
                message: "Cache invalidado exitosamente",
            });
        } catch (error) {
            if (error instanceof Error) {
                reply.status(500).send({
                    error: "Error al invalidar el cache",
                    details: error.message,
                });
                return;
            }
            throw error;
        }
    },
};
