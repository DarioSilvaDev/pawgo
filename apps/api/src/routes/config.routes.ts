import { FastifyInstance } from "fastify";
import { configController } from "../controllers/config.controller.js";
import {
    createAuthMiddleware,
    requireRole,
} from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "../shared/index.js";

export async function configRoutes(
    fastify: FastifyInstance,
    options: { tokenService: TokenService }
) {
    const { tokenService } = options;
    const authenticate = createAuthMiddleware(tokenService);
    const requireAdmin = requireRole(UserRole.ADMIN);

    // Public route - get public configuration
    fastify.get("/config/public", configController.getPublicConfig);

    // Admin routes - manage configuration
    fastify.register(async (fastify) => {
        fastify.addHook("preHandler", authenticate);
        fastify.addHook("preHandler", requireAdmin);

        fastify.get("/admin/config/cta", configController.getCTAConfig);
        fastify.put("/admin/config/cta", configController.updateCTAConfig);
        fastify.post(
            "/admin/config/cache/invalidate",
            configController.invalidateCache
        );
    });
}
