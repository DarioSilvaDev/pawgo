import { FastifyInstance } from "fastify";
import { createAnalyticsController } from "../controllers/analytics.controller.js";
import { AnalyticsService } from "../services/analytics.service.js";
import { createAuthMiddleware, requireRole } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "../../../../packages/shared/dist/index.js";

export async function analyticsRoutes(
  fastify: FastifyInstance,
  options: {
    analyticsService: AnalyticsService;
    tokenService: TokenService;
  }
) {
  const { analyticsService, tokenService } = options;
  const controller = createAnalyticsController(analyticsService);
  const authenticate = createAuthMiddleware(tokenService);
  const requireAdmin = requireRole(UserRole.ADMIN);

  // All routes require admin authentication
  fastify.get(
    "/analytics/stats",
    {
      preHandler: [authenticate, requireAdmin],
    },
    controller.getStats
  );

  fastify.get(
    "/analytics/sales-by-period",
    {
      preHandler: [authenticate, requireAdmin],
    },
    controller.getSalesByPeriod
  );

  fastify.get(
    "/analytics/event-metrics",
    {
      preHandler: [authenticate, requireAdmin],
    },
    controller.getEventMetrics
  );

  fastify.get(
    "/analytics/event-metrics-trend",
    {
      preHandler: [authenticate, requireAdmin],
    },
    controller.getEventMetricsTrend
  );
}

