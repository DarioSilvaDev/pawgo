import type { FastifyInstance } from "fastify";
import { MiCorreoService } from "../../services/micorreo/micorreo.service.js";
import { registerCustomerRoute } from "./register.route.js";
import { validateUserRoute } from "./validate.route.js";
import { getRatesRoute } from "./rates.route.js";

interface MiCorreoRoutesOptions {
    miCorreoService: MiCorreoService;
}

export async function miCorreoRoutes(
    fastify: FastifyInstance,
    options: MiCorreoRoutesOptions
) {
    const { miCorreoService } = options;

    // Registrar todas las rutas de MiCorreo
    await fastify.register(
        async (instance) => {
            await registerCustomerRoute(instance, { miCorreoService });
            await validateUserRoute(instance, { miCorreoService });
            await getRatesRoute(instance, { miCorreoService });
        },
        { prefix: "/micorreo" }
    );
}
