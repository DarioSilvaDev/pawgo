import { FastifyInstance } from "fastify";
import { createDiscountCodeController } from "../controllers/discount-code.controller.js";
import { DiscountCodeService } from "../services/discount-code.service.js";
import { createAuthMiddleware, requireRole } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "../shared/index.js";

export async function discountCodeRoutes(
  app: FastifyInstance,
  options: { discountCodeService: DiscountCodeService; tokenService: TokenService }
) {
  const { discountCodeService, tokenService } = options;
  const controller = createDiscountCodeController(discountCodeService);
  const authenticate = createAuthMiddleware(tokenService);
  const requireAdmin = requireRole(UserRole.ADMIN);

  // ── Public endpoints ──
  app.post("/discount-codes/validate", controller.validate);

  // ── Admin-only routes ──
  app.register(async (app) => {
    app.addHook("preHandler", authenticate);
    app.addHook("preHandler", requireAdmin);

    // Lead discount config (must be before /:id to avoid path conflicts)
    app.get("/discount-codes/lead-config", controller.getLeadDiscountConfig);
    app.put("/discount-codes/lead-config", controller.updateLeadDiscountConfig);

    // CRUD
    app.post("/discount-codes", controller.create);
    app.get("/discount-codes", controller.getAll);
    app.get("/discount-codes/:id", controller.getById);
    app.put("/discount-codes/:id", controller.update);
    app.delete("/discount-codes/:id", controller.delete);
  });
}
