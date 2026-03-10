import { FastifyInstance } from "fastify";
import { StockReservationController } from "../controllers/stock-reservation.controller.js";

export async function stockReservationRoutes(
    fastify: FastifyInstance,
    options: { stockReservationController: StockReservationController }
) {
    const { stockReservationController } = options;

    // Public route to register interest in out-of-stock products
    fastify.post("/stock-reservations", stockReservationController.create);
}
