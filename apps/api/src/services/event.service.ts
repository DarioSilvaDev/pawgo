import { PrismaClient } from "@prisma/client";
import { CreateEventDto, Event, EventType } from "../shared/index.js";

const prisma = new PrismaClient();

// Eventos que solo se cuentan (no se registran individualmente)
// Solo guardamos contadores diarios para estos eventos de alto volumen
const COUNT_ONLY_EVENTS = [
  EventType.PAGE_VIEW,
  EventType.CTA_CLICK,
  EventType.BUY_INTENT_CLICKED,
];

/**
 * Obtiene la fecha actual sin hora (solo fecha)
 */
function getTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export const eventService = {
  /**
   * Registra un evento. Para eventos simples (clicks), incrementa un contador por fecha.
   * Para eventos importantes, crea un registro individual (aunque actualmente
   * los eventos importantes como LEAD_SUBMITTED se manejan en el servicio de leads).
   */
  async create(data: CreateEventDto): Promise<Event> {
    // Si es un evento que solo se cuenta, incrementar contador por fecha
    if (COUNT_ONLY_EVENTS.includes(data.type)) {
      const today = getTodayDate();

      await prisma.eventCounter.upsert({
        where: {
          type_date: {
            type: data.type,
            date: today,
          },
        },
        update: {
          count: { increment: 1 },
        },
        create: {
          type: data.type,
          date: today,
          count: 1,
        },
      });

      // Retornar un evento simulado para mantener compatibilidad con la API
      return {
        id: "counter",
        type: data.type,
        metadata: data.metadata,
        createdAt: new Date(),
      };
    }

    // Para otros eventos, mantener el comportamiento original (aunque actualmente
    // no se usan eventos individuales, se mantiene por compatibilidad)
    const event = await prisma.event.create({
      data: {
        type: data.type,
        metadata: (data.metadata || {}) as any,
      },
    });

    return {
      id: event.id,
      type: event.type as EventType,
      metadata: event.metadata as Record<string, unknown> | undefined,
      createdAt: event.createdAt,
    };
  },

  /**
   * Obtiene el contador de un tipo de evento específico para una fecha
   * Si no se proporciona fecha, usa la fecha actual
   */
  async getCount(type: EventType, date?: Date): Promise<number> {
    const targetDate = date
      ? new Date(date.setHours(0, 0, 0, 0))
      : getTodayDate();

    const counter = await prisma.eventCounter.findUnique({
      where: {
        type_date: {
          type,
          date: targetDate,
        },
      },
    });
    return counter?.count || 0;
  },

  /**
   * Obtiene el contador total de un tipo de evento (suma de todas las fechas)
   */
  async getTotalCount(type: EventType): Promise<number> {
    const result = await prisma.eventCounter.aggregate({
      where: { type },
      _sum: { count: true },
    });
    return result._sum.count || 0;
  },

  /**
   * Obtiene todos los contadores de eventos para una fecha específica
   * Si no se proporciona fecha, usa la fecha actual
   */
  async getCountsByDate(date?: Date): Promise<Record<string, number>> {
    const targetDate = date
      ? new Date(date.setHours(0, 0, 0, 0))
      : getTodayDate();

    const counters = await prisma.eventCounter.findMany({
      where: { date: targetDate },
    });

    return counters.reduce(
      (
        acc: Record<string, number>,
        counter: { type: string; count: number }
      ) => {
        acc[counter.type] = counter.count;
        return acc;
      },
      {} as Record<string, number>
    );
  },

  /**
   * Obtiene todos los contadores totales (suma de todas las fechas por tipo)
   */
  async getAllCounts(): Promise<Record<string, number>> {
    const counters = await prisma.eventCounter.groupBy({
      by: ["type"],
      _sum: {
        count: true,
      },
    });

    return counters.reduce(
      (
        acc: Record<string, number>,
        counter: { type: string; _sum: { count: number | null } }
      ) => {
        acc[counter.type] = counter._sum.count || 0;
        return acc;
      },
      {} as Record<string, number>
    );
  },

  /**
   * Obtiene contadores por rango de fechas
   */
  async getCountsByDateRange(
    startDate: Date,
    endDate: Date,
    type?: EventType
  ): Promise<Array<{ type: string; date: Date; count: number }>> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const where: {
      date: { gte: Date; lte: Date };
      type?: EventType;
    } = {
      date: {
        gte: start,
        lte: end,
      },
    };

    if (type) {
      where.type = type;
    }

    const counters = await prisma.eventCounter.findMany({
      where,
      orderBy: [{ date: "desc" }, { type: "asc" }],
    });

    return counters.map(
      (counter: { type: string; date: Date; count: number }) => ({
        type: counter.type,
        date: counter.date,
        count: counter.count,
      })
    );
  },
};
