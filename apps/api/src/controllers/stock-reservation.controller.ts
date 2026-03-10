import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { StockReservationService } from "../services/stock-reservation.service.js";

const createStockReservationSchema = z.object({
    email: z.string().email("Email inválido"),
    phoneNumber: z.string().optional(),
    name: z.string().optional(),
    items: z.array(z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive().default(1)
    })).min(1, "Debes seleccionar al menos un talle"),
});

export class StockReservationController {
    constructor(private readonly stockReservationService: StockReservationService) { }

    /**
     * Create multiple stock reservations for a lead
     * POST /api/stock-reservations
     */
    create = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = createStockReservationSchema.parse(request.body);

            const result = await this.stockReservationService.create(body);

            reply.status(201).send({
                message: "Interés registrado correctamente. Te avisaremos cuando haya stock.",
                count: result.count
            });
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
    };
}
