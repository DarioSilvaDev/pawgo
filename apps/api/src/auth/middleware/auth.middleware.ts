import { FastifyRequest, FastifyReply } from "fastify";
import { TokenService } from "../services/token.service.js";
import { JwtPayload } from "@pawgo/shared";

// Extend FastifyRequest interface using a different approach
declare module "fastify" {
  interface FastifyRequest {
    authUser?: JwtPayload;
  }
}

// For backward compatibility, also add user property
// But we'll use authUser to avoid conflicts

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export function createAuthMiddleware(tokenService: TokenService) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        reply.status(401).send({
          error: "Token de autenticación requerido",
        });
        return;
      }

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        reply.status(401).send({
          error: "Formato de token inválido. Use: Bearer <token>",
        });
        return;
      }

      const token = parts[1];
      const payload = tokenService.verifyAccessToken(token);

      request.authUser = payload;
      // Also set user for backward compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request as any).user = payload;
    } catch (error) {
      reply.status(401).send({
        error: "Token inválido o expirado",
      });
    }
  };
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export function createOptionalAuthMiddleware(tokenService: TokenService) {
  return async (request: FastifyRequest): Promise<void> => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return; // No token, continue without user
      }

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        return; // Invalid format, continue without user
      }

      const token = parts[1];
      const payload = tokenService.verifyAccessToken(token);

      request.authUser = payload;
      // Also set user for backward compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request as any).user = payload;
    } catch (error) {
      // Ignore errors, continue without user
    }
  };
}

/**
 * Role-based authorization middleware factory
 */
export function requireRole(...roles: string[]) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const user = request.authUser;

    if (!user) {
      reply.status(401).send({
        error: "No autenticado",
      });
      return;
    }

    if (!roles.includes(user.role)) {
      reply.status(403).send({
        error: "No tienes permiso para acceder a este recurso",
      });
      return;
    }
  };
}
