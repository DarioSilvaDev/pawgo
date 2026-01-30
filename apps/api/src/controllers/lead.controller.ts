import { FastifyRequest, FastifyReply } from 'fastify';
import { leadService } from '../services/lead.service.js';
import { CreateLeadDto, DogSize } from '@pawgo/shared';
import { z } from 'zod';

const createLeadSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  dogSize: z.enum(['small', 'medium', 'large', 'extra_large']).optional(),
});

export const leadController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = createLeadSchema.parse(request.body);
      const lead = await leadService.create(body as CreateLeadDto);
      
      reply.status(201).send(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        reply.status(409).send({
          error: 'Email already registered',
        });
        return;
      }
      
      throw error;
    }
  },

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as {
        search?: string;
        dogSize?: string;
        startDate?: string;
        endDate?: string;
      };

      const filters: {
        search?: string;
        dogSize?: DogSize;
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (query.search) {
        filters.search = query.search;
      }

      if (query.dogSize && Object.values(DogSize).includes(query.dogSize as DogSize)) {
        filters.dogSize = query.dogSize as DogSize;
      }

      if (query.startDate) {
        filters.startDate = new Date(query.startDate);
      }

      if (query.endDate) {
        filters.endDate = new Date(query.endDate);
      }

      const leads = await leadService.getAll(filters);
      reply.send({ leads });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({
          error: error.message,
        });
        return;
      }
      throw error;
    }
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const lead = await leadService.getById(id);

      if (!lead) {
        reply.status(404).send({
          error: "Lead no encontrado",
        });
        return;
      }

      reply.send(lead);
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({
          error: error.message,
        });
        return;
      }
      throw error;
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      await leadService.delete(id);

      reply.status(204).send();
    } catch (error) {
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

