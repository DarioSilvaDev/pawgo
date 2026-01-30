import { FastifyInstance } from 'fastify';
import { eventController } from '../controllers/event.controller.js';

export async function eventRoutes(fastify: FastifyInstance) {
  fastify.post('/events', eventController.create);
  fastify.get('/events/counts', eventController.getCounts);
}

