import { FastifyInstance } from "fastify";
import { productController } from "../controllers/product.controller.js";
import {
  createAuthMiddleware,
  requireRole,
} from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "../shared/index.js";

export async function productRoutes(
  fastify: FastifyInstance,
  options: { tokenService: TokenService }
) {
  const { tokenService } = options;
  const authenticate = createAuthMiddleware(tokenService);
  const requireAdmin = requireRole(UserRole.ADMIN);

  // Public routes - get products
  fastify.get("/products", productController.getAll);
  fastify.get("/products/:id", productController.getById);

  // Admin routes - manage products
  fastify.register(async (fastify) => {
    fastify.addHook("preHandler", authenticate);
    fastify.addHook("preHandler", requireAdmin);

    fastify.post("/products", productController.create);
    fastify.patch("/products/:id", productController.update);
    fastify.delete("/products/:id", productController.delete);

    // Variant routes
    fastify.post(
      "/products/:productId/variants",
      productController.createVariant
    );
    fastify.patch(
      "/products/variants/:variantId",
      productController.updateVariant
    );
    fastify.delete(
      "/products/variants/:variantId",
      productController.deleteVariant
    );
  });
}
