import { FastifyRequest, FastifyReply } from "fastify";
import { MimoService } from "../services/mimo.service.js";
import { JwtPayload } from "../shared/index.js";

export class MimoController {
    constructor(private readonly mimoService: MimoService) { }

    /**
     * POST /reviews/:id/mmo
     * Public — regalar un mimo a una reseña.
     * Identifies user via token (leadId) OR fingerprint + IP for anonymous.
     */
    addMimo = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as { id: string };
            const { fingerprint } = request.body as { fingerprint?: string };

            if (!fingerprint || typeof fingerprint !== "string") {
                return reply.status(400).send({ error: "El fingerprint es requerido para prevenir abusos." });
            }

            // Identify if the user is logged in (Lead)
            const user = request.authUser as JwtPayload | undefined;
            const leadId = user?.role === "user" ? user.authId : undefined; // Assuming authId is leadId for users

            const result = await this.mimoService.addMimo({
                reviewId: id,
                leadId,
                fingerprint: `${fingerprint}-${request.ip}` // Salt fingerprint with IP for extra anti-abuse
            });

            return reply.send(result);
        } catch (error) {
            if (error instanceof Error) {
                return reply.status(400).send({ error: error.message });
            }
            request.log.error(error);
            return reply.status(500).send({ error: "Error al regalar mimo." });
        }
    };

    /**
     * GET /reviews/ranking
     * Public — returns the monthly top pets.
     */
    getMonthlyRanking = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const ranking = await this.mimoService.getMonthlyRanking();
            return reply.send(ranking);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: "Error al obtener el ranking." });
        }
    };
}
