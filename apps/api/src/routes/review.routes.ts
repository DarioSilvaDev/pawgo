import { FastifyInstance } from "fastify";
import { ReviewController } from "../controllers/review.controller.js";
import { ReviewService } from "../services/review.service.js";
import { StorageService } from "../services/storage.service.js";
import { EmailService } from "../services/email.service.js";
import { createAuthMiddleware, createOptionalAuthMiddleware } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { MimoController } from "../controllers/mimo.controller.js";
import { MimoService } from "../services/mimo.service.js";

export async function reviewRoutes(
    fastify: FastifyInstance,
    options: {
        tokenService: TokenService;
        storageService: StorageService;
    }
) {
    const { tokenService, storageService } = options;
    const emailService = new EmailService();
    const mimoService = new MimoService(storageService);
    const reviewService = new ReviewService(storageService, emailService, mimoService);
    const controller = new ReviewController(reviewService);
    const mimoController = new MimoController(mimoService);
    const authenticate = createAuthMiddleware(tokenService);
    const authenticateOptional = createOptionalAuthMiddleware(tokenService);

    // ──────────────────────────────────────────
    // Public routes
    // ──────────────────────────────────────────

    /**
     * POST /api/reviews/validate-email
     * Validates if an email has an associated paid order and no prior review.
     * Soft rate-limited by IP at the infrastructure level (nginx/cloudflare).
     */
    fastify.post("/reviews/validate-email", controller.validateEmail);

    /**
     * POST /api/reviews
     * Submit a new review (multipart/form-data).
     */
    fastify.post("/reviews", controller.createReview);

    /**
     * GET /api/reviews
     * Public gallery of approved reviews.
     * Query: ?page=1&limit=12&rating=5&featured=true&sort=recent|featured
     */
    fastify.get("/reviews", controller.getReviews);

    /**
     * POST /api/reviews/:id/mmo
     * Regalá un mimo.
     */
    fastify.post(
        "/reviews/:id/mimo",
        { preHandler: authenticateOptional },
        mimoController.addMimo
    );

    /**
     * GET /api/reviews/ranking
     * Ranking mensual de mascotas.
     */
    fastify.get("/reviews/ranking", mimoController.getMonthlyRanking);

    // ──────────────────────────────────────────
    // Admin routes (protected)
    // ──────────────────────────────────────────

    /**
     * GET /api/admin/reviews
     * All reviews for moderation panel.
     * Query: ?status=pending|approved|rejected&page=1&limit=20
     */
    fastify.get(
        "/admin/reviews",
        { preHandler: authenticate },
        controller.getReviewsAdmin
    );

    /**
     * PATCH /api/admin/reviews/:id/moderate
     * Approve or reject a review.
     * Body: { action: "approve" | "reject", rejectedReason?: string }
     */
    fastify.patch(
        "/admin/reviews/:id/moderate",
        { preHandler: authenticate },
        controller.moderateReview
    );

    /**
     * PATCH /api/admin/reviews/:id/featured
     * Toggle featured status (for Mascota del Mes / landing section).
     * Body: { isFeatured: boolean }
     */
    fastify.patch(
        "/admin/reviews/:id/featured",
        { preHandler: authenticate },
        controller.toggleFeatured
    );

    /**
     * POST /api/admin/reviews/email-access
     * Upsert quota for email-based reviews without orders.
     * Body: { email: string, remainingReviews: number, notes?: string }
     */
    fastify.post(
        "/admin/reviews/email-access",
        { preHandler: authenticate },
        controller.upsertReviewEmailAccess
    );

    /**
     * GET /api/admin/reviews/email-access
     * List quota rows for admin dashboard.
     */
    fastify.get(
        "/admin/reviews/email-access",
        { preHandler: authenticate },
        controller.getReviewEmailAccessList
    );

    /**
     * PATCH /api/admin/reviews/email-access/:id
     * Update quota row (remainingReviews, isActive, notes).
     */
    fastify.patch(
        "/admin/reviews/email-access/:id",
        { preHandler: authenticate },
        controller.updateReviewEmailAccess
    );
}
