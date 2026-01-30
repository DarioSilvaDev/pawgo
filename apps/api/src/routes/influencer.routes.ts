import { FastifyInstance } from "fastify";
import { influencerController } from "../controllers/influencer.controller.js";
import { createAuthMiddleware, requireRole } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "@pawgo/shared";

export async function influencerRoutes(
  fastify: FastifyInstance,
  options: { tokenService: TokenService }
) {
  const { tokenService } = options;
  const authenticate = createAuthMiddleware(tokenService);
  const requireInfluencer = requireRole(UserRole.INFLUENCER);
  const requireAdmin = requireRole(UserRole.ADMIN);

  // All routes require authentication and influencer role
  fastify.register(async (fastify) => {
    fastify.addHook("preHandler", authenticate);
    fastify.addHook("preHandler", requireInfluencer);

    // Dashboard
    fastify.get("/influencers/me/dashboard", influencerController.getDashboard);

    // Profile
    fastify.get("/influencers/me", influencerController.getProfile);

    // Commissions
    fastify.get(
      "/influencers/me/commissions",
      influencerController.getCommissions
    );

    // Discount codes
    fastify.get(
      "/influencers/me/discount-codes",
      influencerController.getDiscountCodes
    );

    // Payment info
    fastify.put(
      "/influencers/me/payment-info",
      influencerController.updatePaymentInfo
    );
  });

  // Admin routes
  fastify.register(async (adminRoutes) => {
    adminRoutes.addHook("preHandler", authenticate);
    adminRoutes.addHook("preHandler", requireAdmin);

    // List all influencers
    adminRoutes.get("/influencers", influencerController.getAll);

    // Get influencer by ID
    adminRoutes.get("/influencers/:id", influencerController.getById);

    // Create influencer
    adminRoutes.post("/influencers", influencerController.create);

    // Update influencer
    adminRoutes.put("/influencers/:id", influencerController.update);

    // Delete influencer (soft delete)
    adminRoutes.delete("/influencers/:id", influencerController.delete);

    // Get commissions for a specific influencer
    adminRoutes.get(
      "/influencers/:id/commissions",
      influencerController.getCommissionsByInfluencer
    );
  });
}

