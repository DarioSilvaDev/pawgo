import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AnalyticsService } from "../services/analytics.service.js";

const getStatsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const getSalesByPeriodQuerySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function createAnalyticsController(analyticsService: AnalyticsService) {
  return {
    /**
     * Get dashboard statistics
     * GET /api/analytics/stats
     */
    async getStats(request: FastifyRequest, reply: FastifyReply) {
      try {
        console.log("[Analytics Controller] getStats called");
        const query = getStatsQuerySchema.parse(request.query);

        const startDate = query.startDate
          ? new Date(query.startDate)
          : undefined;
        const endDate = query.endDate ? new Date(query.endDate) : undefined;

        console.log("[Analytics Controller] Date filters:", { startDate, endDate });
        const stats = await analyticsService.getDashboardStats(
          startDate,
          endDate
        );
        console.log("[Analytics Controller] Stats calculated:", {
          totalRevenue: stats.totalRevenue,
          pendingRevenue: stats.pendingRevenue,
          totalSales: stats.totalSales,
        });

        reply.send(stats);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    /**
     * Get sales by period
     * GET /api/analytics/sales-by-period
     */
    async getSalesByPeriod(request: FastifyRequest, reply: FastifyReply) {
      try {
        const query = getSalesByPeriodQuerySchema.parse(request.query);

        const startDate = new Date(query.startDate);
        const endDate = new Date(query.endDate);

        const sales = await analyticsService.getSalesByPeriod(
          query.period,
          startDate,
          endDate
        );

        reply.send(sales);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    /**
     * Get event metrics (funnel analytics)
     * GET /api/analytics/event-metrics
     */
    async getEventMetrics(request: FastifyRequest, reply: FastifyReply) {
      try {
        const query = getStatsQuerySchema.parse(request.query);

        const startDate = query.startDate
          ? new Date(query.startDate)
          : undefined;
        const endDate = query.endDate ? new Date(query.endDate) : undefined;

        const metrics = await analyticsService.getEventMetrics(
          startDate,
          endDate
        );

        reply.send(metrics);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    /**
     * Get event metrics trend (daily breakdown)
     * GET /api/analytics/event-metrics-trend
     */
    async getEventMetricsTrend(request: FastifyRequest, reply: FastifyReply) {
      try {
        const query = getSalesByPeriodQuerySchema.parse(request.query);

        const startDate = new Date(query.startDate);
        const endDate = new Date(query.endDate);

        const metrics = await analyticsService.getEventMetricsByDateRange(
          startDate,
          endDate
        );

        reply.send(metrics);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },
  };
}

