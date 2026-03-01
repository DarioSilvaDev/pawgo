import { FastifyRequest, FastifyReply } from "fastify";
import { ReviewService, CreateReviewDto } from "../services/review.service.js";
import { JwtPayload } from "../shared/index.js";

export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    /**
     * POST /api/reviews/validate-email
     * Public — validates if an email is eligible to leave a review.
     * Rate limited at the route level.
     */
    validateEmail = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { email } = request.body as { email?: string };
            console.log("🚀 ~ ReviewController ~ email:", email)

            if (!email || typeof email !== "string") {
                return reply.status(400).send({ error: "Email requerido." });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return reply.status(400).send({ error: "Formato de email inválido." });
            }

            const result = await this.reviewService.validateEmail(email.trim());
            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: "Error al validar el email." });
        }
    };

    /**
     * POST /api/reviews
     * Public — submit a review (multipart/form-data to support image upload).
     */
    createReview = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Parse multipart fields
            const parts = request.parts();
            const fields: Record<string, string> = {};
            let imageBuffer: Buffer | undefined;
            let imageName: string | undefined;
            let imageMimeType: string | undefined;

            for await (const part of parts) {
                if (part.type === "file") {
                    imageBuffer = await part.toBuffer();
                    imageName = part.filename;
                    imageMimeType = part.mimetype;
                } else {
                    fields[part.fieldname] = part.value as string;
                }
            }

            const { email, orderId, petName, rating, comment, photoConsent } = fields;

            // Validate required fields
            if (!email || !orderId || !petName || !rating || !comment) {
                return reply.status(400).send({ error: "Faltan campos requeridos: email, orderId, petName, rating, comment." });
            }

            const parsedRating = parseInt(rating, 10);
            if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
                return reply.status(400).send({ error: "El rating debe ser un número entre 1 y 5." });
            }

            if (petName.trim().length < 2 || petName.trim().length > 50) {
                return reply.status(400).send({ error: "El nombre de la mascota debe tener entre 2 y 50 caracteres." });
            }

            if (comment.trim().length < 10 || comment.trim().length > 500) {
                return reply.status(400).send({ error: "El comentario debe tener entre 10 y 500 caracteres." });
            }

            const dto: CreateReviewDto = {
                email: email.trim(),
                orderId: orderId.trim(),
                petName: petName.trim(),
                rating: parsedRating,
                comment: comment.trim(),
                photoConsent: photoConsent === "true",
                imageBuffer,
                imageName,
                imageMimeType,
                ipAddress: request.ip,
                userAgent: request.headers["user-agent"],
                submittedFrom: (request.headers["x-submission-source"] as string) ?? "web_direct",
            };

            const review = await this.reviewService.createReview(dto);
            return reply.status(201).send(review);
        } catch (error) {
            if (error instanceof Error) {
                return reply.status(400).send({ error: error.message });
            }
            request.log.error(error);
            return reply.status(500).send({ error: "Error al crear la reseña." });
        }
    };

    /**
     * GET /api/reviews
     * Public — returns approved reviews with pagination.
     */
    getReviews = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = request.query as {
                page?: string;
                limit?: string;
                rating?: string;
                featured?: string;
                sort?: string;
            };

            const result = await this.reviewService.getApprovedReviews({
                page: query.page ? parseInt(query.page, 10) : 1,
                limit: query.limit ? parseInt(query.limit, 10) : 12,
                rating: query.rating ? parseInt(query.rating, 10) : undefined,
                featured: query.featured === "true",
                sort: query.sort === "featured" ? "featured" : "recent",
            });

            return reply
                .header("Cache-Control", "public, max-age=60, stale-while-revalidate=30")
                .send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: "Error al obtener las reseñas." });
        }
    };

    /**
     * GET /api/admin/reviews
     * Admin only — returns all reviews for moderation.
     */
    getReviewsAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = request.query as {
                status?: string;
                page?: string;
                limit?: string;
            };

            const result = await this.reviewService.getAllReviewsAdmin({
                status: query.status,
                page: query.page ? parseInt(query.page, 10) : 1,
                limit: query.limit ? parseInt(query.limit, 10) : 20,
            });

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: "Error al obtener las reseñas." });
        }
    };

    /**
     * PATCH /api/admin/reviews/:id/moderate
     * Admin only — approve or reject a review.
     */
    moderateReview = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const user = request.authUser as JwtPayload | undefined;
            if (!user || user.role !== "admin") {
                return reply.status(403).send({ error: "Acceso denegado." });
            }

            const { id } = request.params as { id: string };
            const { action, rejectedReason } = request.body as {
                action?: string;
                rejectedReason?: string;
            };

            if (!action || !["approve", "reject"].includes(action)) {
                return reply.status(400).send({ error: "La acción debe ser 'approve' o 'reject'." });
            }

            await this.reviewService.moderateReview(
                id,
                action as "approve" | "reject",
                user.authId,
                rejectedReason
            );

            return reply.send({ success: true, action });
        } catch (error) {
            if (error instanceof Error) {
                return reply.status(400).send({ error: error.message });
            }
            request.log.error(error);
            return reply.status(500).send({ error: "Error al moderar la reseña." });
        }
    };

    /**
     * PATCH /api/admin/reviews/:id/featured
     * Admin only — toggle featured status of a review.
     */
    toggleFeatured = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const user = request.authUser as JwtPayload | undefined;
            if (!user || user.role !== "admin") {
                return reply.status(403).send({ error: "Acceso denegado." });
            }

            const { id } = request.params as { id: string };
            const { isFeatured } = request.body as { isFeatured?: boolean };

            if (typeof isFeatured !== "boolean") {
                return reply.status(400).send({ error: "isFeatured debe ser un booleano." });
            }

            await this.reviewService.toggleFeatured(id, isFeatured);
            return reply.send({ success: true, isFeatured });
        } catch (error) {
            if (error instanceof Error) {
                return reply.status(400).send({ error: error.message });
            }
            request.log.error(error);
            return reply.status(500).send({ error: "Error al actualizar destacado." });
        }
    };
}
