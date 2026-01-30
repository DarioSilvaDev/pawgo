import { FastifyInstance } from "fastify";
import { createInfluencerPaymentController } from "../controllers/influencer-payment.controller.js";
import { InfluencerPaymentService } from "../services/influencer-payment.service.js";
import { createAuthMiddleware } from "../auth/middleware/auth.middleware.js";
import { requireRole } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "@pawgo/shared";

export async function influencerPaymentRoutes(
  fastify: FastifyInstance,
  options: {
    influencerPaymentService: InfluencerPaymentService;
    tokenService: TokenService;
  }
) {
  const { influencerPaymentService, tokenService } = options;
  const controller = createInfluencerPaymentController(influencerPaymentService);
  const authenticate = createAuthMiddleware(tokenService);

  // Admin routes
  fastify.post(
    "/influencer-payments",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
    },
    controller.create
  );

  fastify.get(
    "/influencer-payments",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
    },
    controller.getAll
  );

  fastify.get(
    "/influencer-payments/:id",
    {
      preHandler: authenticate,
    },
    controller.getById
  );

  fastify.put(
    "/influencer-payments/:id",
    {
      preHandler: authenticate,
    },
    controller.update
  );

  fastify.post(
    "/influencer-payments/:id/cancel",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
    },
    controller.cancel
  );

  // Influencer routes
  fastify.get(
    "/influencer/payments",
    {
      preHandler: [authenticate, requireRole(UserRole.INFLUENCER)],
    },
    controller.getByInfluencer
  );
}

