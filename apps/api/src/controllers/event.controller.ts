import { FastifyRequest, FastifyReply } from 'fastify';
import { eventService } from '../services/event.service.js';
import { CreateEventDto, EventType } from '../shared/index.js';
import { z } from 'zod';

const createEventSchema = z.object({
  type: z.nativeEnum(EventType),
  metadata: z.record(z.unknown()).optional(),
});

const getCountsQuerySchema = z.object({
  type: z.nativeEnum(EventType).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // Formato YYYY-MM-DD
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  total: z.enum(['true', 'false']).optional().default('false'), // Si es true, devuelve totales
});

export const eventController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = createEventSchema.parse(request.body);
      const event = await eventService.create(body as CreateEventDto);

      reply.status(201).send(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      throw error;
    }
  },

  /**
   * Obtiene contadores de eventos
   * Query params:
   * - total: 'true' para obtener totales (suma de todas las fechas), 'false' para fecha específica
   * - date: Fecha específica en formato YYYY-MM-DD (por defecto: hoy)
   * - type: Tipo de evento específico (opcional)
   * - startDate, endDate: Rango de fechas (requiere ambos)
   */
  async getCounts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = getCountsQuerySchema.parse(request.query);

      // Si se proporciona rango de fechas
      if (query.startDate && query.endDate) {
        const startDate = new Date(query.startDate);
        const endDate = new Date(query.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          reply.status(400).send({
            error: 'Invalid date format. Use YYYY-MM-DD',
          });
          return;
        }

        const counts = await eventService.getCountsByDateRange(
          startDate,
          endDate,
          query.type
        );

        reply.send({
          startDate: query.startDate,
          endDate: query.endDate,
          type: query.type || 'all',
          counts,
        });
        return;
      }

      // Si se solicita total (suma de todas las fechas)
      if (query.total === 'true') {
        if (query.type) {
          const count = await eventService.getTotalCount(query.type);
          reply.send({
            type: query.type,
            total: count,
          });
        } else {
          const counts = await eventService.getAllCounts();
          reply.send({
            totals: counts,
          });
        }
        return;
      }

      // Contadores para fecha específica (o hoy por defecto)
      const targetDate = query.date ? new Date(query.date) : new Date();

      if (isNaN(targetDate.getTime())) {
        reply.status(400).send({
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
        return;
      }

      if (query.type) {
        const count = await eventService.getCount(query.type, targetDate);
        reply.send({
          type: query.type,
          date: query.date || new Date().toISOString().split('T')[0],
          count,
        });
      } else {
        const counts = await eventService.getCountsByDate(targetDate);
        reply.send({
          date: query.date || new Date().toISOString().split('T')[0],
          counts,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      throw error;
    }
  },
};

