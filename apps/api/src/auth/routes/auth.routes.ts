import { FastifyInstance } from "fastify";
import { createAuthController } from "../controllers/auth.controller.js";
import { AuthService } from "../services/auth.service.js";
import { TokenService } from "../services/token.service.js";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";

export async function authRoutes(
  fastify: FastifyInstance,
  options: { authService: AuthService; tokenService: TokenService }
) {
  const { authService, tokenService } = options;
  const authController = createAuthController(authService);
  const authenticate = createAuthMiddleware(tokenService);

  // Public routes
  fastify.post("/auth/register", authController.register);
  fastify.post("/auth/login", authController.login);
  fastify.post("/auth/refresh", authController.refreshToken);
  fastify.post("/auth/logout", authController.logout);
  fastify.post("/auth/forgot-password", authController.forgotPassword);
  fastify.post("/auth/reset-password", authController.resetPassword);
  fastify.get("/auth/verify-email", authController.verifyEmail);

  // Protected routes
  fastify.get(
    "/auth/me",
    {
      preHandler: authenticate,
    },
    authController.getMe
  );

  fastify.post(
    "/auth/logout-all",
    {
      preHandler: authenticate,
    },
    authController.logoutAll
  );
}
