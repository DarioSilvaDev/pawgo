import { FastifyInstance } from "fastify";
import { createDiscountCodeController } from "../controllers/discount-code.controller.js";
import { DiscountCodeService } from "../services/discount-code.service.js";
import { createAuthMiddleware, requireRole } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "@pawgo/shared";

export async function discountCodeRoutes(
  fastify: FastifyInstance,
  options: { discountCodeService: DiscountCodeService; tokenService: TokenService }
) {
  const { discountCodeService, tokenService } = options;
  const discountCodeController = createDiscountCodeController(discountCodeService);
  const authenticate = createAuthMiddleware(tokenService);

  // Public route - validate discount code
  fastify.post("/discount-codes/validate", discountCodeController.validate);

  // All routes below require authentication and admin role
  fastify.post(
    "/discount-codes",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
    },
    discountCodeController.create
  );

  fastify.get(
    "/discount-codes",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
    },
    discountCodeController.getAll
  );

  fastify.get(
    "/discount-codes/:id",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
    },
    discountCodeController.getById
  );

  fastify.put(
    "/discount-codes/:id",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
    },
    discountCodeController.update
  );

  fastify.delete(
    "/discount-codes/:id",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
    },
    discountCodeController.delete
  );
}

