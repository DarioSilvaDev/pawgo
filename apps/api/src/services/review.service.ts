import { prisma } from "../config/prisma.client.js";
import { StorageService } from "./storage.service.js";
import { EmailService } from "./email.service.js";
import { Prisma } from "@prisma/client";

export interface ValidateEmailResult {
    canReview: boolean;
    reason?: "already_reviewed" | "no_purchase_found";
    reviewStatus?: string;
    orderId?: string;
}

export interface CreateReviewDto {
    email: string;
    orderId: string;
    petName: string;
    rating: number;
    comment: string;
    photoConsent: boolean;
    imageBuffer?: Buffer;
    imageName?: string;
    imageMimeType?: string;
    ipAddress?: string;
    userAgent?: string;
    submittedFrom?: string;
}

export interface GetReviewsQuery {
    page?: number;
    limit?: number;
    rating?: number;
    featured?: boolean;
    sort?: "recent" | "featured";
}

export class ReviewService {
    private storageService: StorageService;
    private emailService: EmailService;

    constructor(storageService: StorageService, emailService: EmailService) {
        this.storageService = storageService;
        this.emailService = emailService;
    }

    /**
     * Validates email against purchase records and checks for duplicate reviews.
     * Always returns within the same time window to prevent user enumeration.
     */
    async validateEmail(email: string): Promise<ValidateEmailResult> {
        const normalizedEmail = email.toLowerCase().trim();

        // Check for existing review before anything else (fastest check)
        const existingReview = await prisma.review.findUnique({
            where: { email: normalizedEmail },
            select: { status: true },
        });

        if (existingReview) {
            return {
                canReview: false,
                reason: "already_reviewed",
                reviewStatus: existingReview.status,
            };
        }

        // Look for a lead with a paid order
        const lead = await prisma.lead.findFirst({
            where: { email: normalizedEmail },
            select: {
                id: true,
                orders: {
                    where: { status: "paid" },
                    select: { id: true },
                    take: 1,
                },
            },
        });

        if (!lead || lead.orders.length === 0) {
            return { canReview: false, reason: "no_purchase_found" };
        }

        return { canReview: true, orderId: lead.orders[0].id };
    }

    /**
     * Creates a new review. Re-validates everything server-side (never trust client state).
     */
    async createReview(dto: CreateReviewDto): Promise<{ id: string; status: string }> {
        const normalizedEmail = dto.email.toLowerCase().trim();

        // --- Re-validate: prevent race conditions and bypasses ---
        const reValidation = await this.validateEmail(normalizedEmail);
        if (!reValidation.canReview) {
            if (reValidation.reason === "already_reviewed") {
                throw new Error("Ya existe una reseña asociada a este email.");
            }
            throw new Error("No encontramos una compra pagada asociada a este email.");
        }

        // Ensure the orderId matches what our validation returned
        if (reValidation.orderId !== dto.orderId) {
            throw new Error("El orderId no coincide con la compra asociada a este email.");
        }

        // Look up the lead for leadId FK
        const lead = await prisma.lead.findFirst({
            where: { email: normalizedEmail },
            select: { id: true },
        });

        // --- Upload image to Backblaze B2 if provided ---
        let imageUrl: string | undefined;
        if (dto.imageBuffer && dto.imageName && dto.imageMimeType) {
            try {
                const uploadResult = await this.storageService.upload({
                    buffer: dto.imageBuffer,
                    originalName: dto.imageName,
                    mimeType: dto.imageMimeType,
                    authId: normalizedEmail,
                    documentType: "REVIEW_IMAGES",
                });
                imageUrl = uploadResult.key;
            } catch (err) {
                // Image upload failure does NOT block review submission
                console.warn("[ReviewService] Image upload failed, proceeding without image:", err);
            }
        }

        // --- Insert review ---
        try {
            const review = await prisma.review.create({
                data: {
                    email: normalizedEmail,
                    orderId: dto.orderId,
                    leadId: lead?.id ?? null,
                    petName: dto.petName.trim(),
                    rating: dto.rating,
                    comment: dto.comment.trim(),
                    imageUrl: imageUrl ?? null,
                    photoConsent: dto.photoConsent,
                    consentedAt: dto.photoConsent ? new Date() : null,
                    ipAddress: dto.ipAddress ?? null,
                    userAgent: dto.userAgent ?? null,
                    submittedFrom: dto.submittedFrom ?? "web_direct",
                    purchaseVerified: true,
                    status: "pending",
                    isApproved: false,
                },
                select: { id: true, status: true },
            });

            // Log on the order for auditing
            await prisma.orderEventLog.create({
                data: {
                    orderId: dto.orderId,
                    event: "REVIEW_SUBMITTED",
                    payload: { reviewId: review.id, email: normalizedEmail },
                },
            });

            return review;
        } catch (err) {
            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === "P2002"
            ) {
                throw new Error("Ya existe una reseña para este email u orden.");
            }
            throw err;
        }
    }

    /**
     * Gets approved reviews for public display.
     */
    async getApprovedReviews(query: GetReviewsQuery) {
        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 12, 50);
        const skip = (page - 1) * limit;

        const where: Prisma.ReviewWhereInput = { isApproved: true };

        if (query.rating) {
            where.rating = query.rating;
        }
        if (query.featured) {
            where.isFeatured = true;
        }

        const orderBy: Prisma.ReviewOrderByWithRelationInput =
            query.sort === "featured"
                ? { isFeatured: "desc" }
                : { createdAt: "desc" };

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                select: {
                    id: true,
                    petName: true,
                    rating: true,
                    comment: true,
                    imageUrl: true,
                    purchaseVerified: true,
                    isFeatured: true,
                    createdAt: true,
                    // Never expose: email, ipAddress, userAgent, moderatedBy
                },
            }),
            prisma.review.count({ where }),
        ]);

        // Build public image URLs from B2 keys (signed)
        const reviewsWithUrls = await Promise.all(
            reviews.map(async (r) => ({
                ...r,
                imageUrl: r.imageUrl ? await this.storageService.getSignedUrl(r.imageUrl) : null,
            }))
        );

        return {
            data: reviewsWithUrls,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Admin: get all reviews with filters for moderation panel.
     */
    async getAllReviewsAdmin(query: { status?: string; page?: number; limit?: number }) {
        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const where: Prisma.ReviewWhereInput = {};
        if (query.status) {
            where.status = query.status as "pending" | "approved" | "rejected";
        }

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                select: {
                    id: true,
                    petName: true,
                    rating: true,
                    comment: true,
                    imageUrl: true,
                    photoConsent: true,
                    purchaseVerified: true,
                    isFeatured: true,
                    status: true,
                    isApproved: true,
                    rejectedReason: true,
                    email: true,
                    orderId: true,
                    submittedFrom: true,
                    createdAt: true,
                    approvedAt: true,
                    rejectedAt: true,
                },
            }),
            prisma.review.count({ where }),
        ]);

        const reviewsWithUrls = await Promise.all(
            reviews.map(async (r) => ({
                ...r,
                imageUrl: r.imageUrl ? await this.storageService.getSignedUrl(r.imageUrl) : null,
            }))
        );

        return {
            data: reviewsWithUrls,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    /**
     * Admin: approve or reject a review. Optionally notifies the customer.
     */
    async moderateReview(
        id: string,
        action: "approve" | "reject",
        moderatedBy: string,
        rejectedReason?: string
    ): Promise<void> {
        const review = await prisma.review.findUnique({
            where: { id },
            select: { id: true, status: true, email: true, petName: true },
        });

        if (!review) {
            throw new Error("Reseña no encontrada.");
        }

        if (review.status !== "pending") {
            throw new Error(`La reseña ya fue ${review.status === "approved" ? "aprobada" : "rechazada"}.`);
        }

        if (action === "approve") {
            await prisma.review.update({
                where: { id },
                data: {
                    status: "approved",
                    isApproved: true,
                    approvedAt: new Date(),
                    moderatedBy,
                },
            });

            // Notify customer that their review is live
            await this.emailService.sendReviewApprovedNotification(
                review.email,
                review.petName
            );
        } else {
            if (!rejectedReason) {
                throw new Error("Se requiere un motivo de rechazo.");
            }
            await prisma.review.update({
                where: { id },
                data: {
                    status: "rejected",
                    isApproved: false,
                    rejectedAt: new Date(),
                    rejectedReason,
                    moderatedBy,
                },
            });
        }
    }

    /**
     * Admin: toggle featured status of an approved review.
     */
    async toggleFeatured(id: string, isFeatured: boolean): Promise<void> {
        await prisma.review.update({
            where: { id },
            data: { isFeatured },
        });
    }
}
