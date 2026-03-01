import { FastifyInstance } from "fastify";
import { ReviewController } from "../controllers/review.controller.js";
import { ReviewService } from "../services/review.service.js";
import { StorageService } from "../services/storage.service.js";
import { EmailService } from "../services/email.service.js";
import { createAuthMiddleware } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";

export async function reviewRoutes(
    fastify: FastifyInstance,
    options: {
        tokenService: TokenService;
        storageService: StorageService;
    }
) {
    const { tokenService, storageService } = options;
    const emailService = new EmailService();
    const reviewService = new ReviewService(storageService, emailService);
    const controller = new ReviewController(reviewService);
    const authenticate = createAuthMiddleware(tokenService);

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
}
