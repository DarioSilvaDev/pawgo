import { FastifyInstance } from "fastify";
import { createOrderController } from "../controllers/order.controller.js";
import { OrderService } from "../services/order.service.js";
import { MercadoPagoService } from "../services/mercadopago.service.js";
// import { createAuthMiddleware } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";

export async function orderRoutes(
  fastify: FastifyInstance,
  options: {
    orderService: OrderService;
    mercadoPagoService: MercadoPagoService;
    tokenService: TokenService;
  }
) {
  const { orderService, mercadoPagoService } = options;
  const orderController = createOrderController(orderService, mercadoPagoService);
  // const authenticate = createAuthMiddleware(tokenService);

  // Public routes (for checkout)
  fastify.post("/orders", orderController.create);
  fastify.get("/orders/:id", orderController.getById);
  fastify.post("/orders/:id/apply-discount", orderController.applyDiscountCode);
  fastify.post("/orders/:id/payment", orderController.createPayment);
  fastify.get("/payments/:id/status", orderController.getPaymentStatus);
  
  // Testing route - simulate complete order with payment
  fastify.post("/orders/simulate", orderController.simulateCompleteOrder);
}

