import type { FastifyInstance } from "fastify";
import { MiCorreoService } from "../../services/micorreo/micorreo.service.js";
import { TokenService } from "../../auth/services/token.service.js";
import { createAuthMiddleware } from "../../auth/middleware/auth.middleware.js";
import { registerCustomerRoute } from "./register.route.js";
import { validateUserRoute } from "./validate.route.js";
import { getRatesRoute } from "./rates.route.js";

interface MiCorreoRoutesOptions {
    miCorreoService: MiCorreoService;
    tokenService: TokenService;
}

export async function miCorreoRoutes(
    fastify: FastifyInstance,
    options: MiCorreoRoutesOptions
) {
    const { miCorreoService, tokenService } = options;
    const authenticate = createAuthMiddleware(tokenService);

    // Admin-only routes — todos los endpoints de MiCorreo requieren autenticación
    await fastify.register(
        async (instance) => {
            // Aplicar auth a todas las rutas del plugin
            instance.addHook("preHandler", authenticate);

            await registerCustomerRoute(instance, { miCorreoService });
            await validateUserRoute(instance, { miCorreoService });
            await getRatesRoute(instance, { miCorreoService });
        },
        { prefix: "/micorreo" }
    );
}
