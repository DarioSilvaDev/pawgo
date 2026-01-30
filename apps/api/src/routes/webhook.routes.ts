import { FastifyInstance } from "fastify";
import { createWebhookController } from "../controllers/webhook.controller.js";
import { MercadoPagoService } from "../services/mercadopago.service.js";
import { OrderService } from "../services/order.service.js";

export async function webhookRoutes(
  fastify: FastifyInstance,
  options: {
    mercadoPagoService: MercadoPagoService;
    orderService: OrderService;
  }
) {
  const { mercadoPagoService, orderService } = options;
  const webhookController = createWebhookController(
    mercadoPagoService,
    orderService
  );

  // Public webhook endpoint (MercadoPago will call this)
  fastify.post("/webhooks/mercadopago", webhookController.mercadopago);
}

