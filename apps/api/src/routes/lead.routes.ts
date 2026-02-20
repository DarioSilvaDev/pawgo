import { FastifyInstance } from "fastify";
import { LeadController } from "../controllers/lead.controller.js";
import { createAuthMiddleware, requireRole } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "../shared/index.js";

export async function leadRoutes(
  fastify: FastifyInstance,
  options: { tokenService: TokenService; leadController: LeadController }
) {
  const { tokenService, leadController } = options;
  const authenticate = createAuthMiddleware(tokenService);
  const requireAdmin = requireRole(UserRole.ADMIN);

  // Public route - create lead
  fastify.post("/leads", leadController.create);

  // Admin routes - manage leads
  fastify.register(async (fastify) => {
    fastify.addHook("preHandler", authenticate);
    fastify.addHook("preHandler", requireAdmin);

    fastify.get("/leads", leadController.getAll);
    fastify.get("/leads/:id", leadController.getById);
    fastify.delete("/leads/:id", leadController.delete);
  });
}
