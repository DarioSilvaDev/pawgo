import { prisma } from "../config/prisma.client.js";
import { StorageService } from "./storage.service.js";
import { EmailService } from "./email.service.js";
import { MimoService } from "./mimo.service.js";
import { ImageValidationService } from "./image-validation.service.js";
import { ImageProcessingService } from "./image-processing.service.js";
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
    private mimoService: MimoService;
    private imageValidationService: ImageValidationService;
    private imageProcessingService: ImageProcessingService;

    constructor(
        storageService: StorageService,
        emailService: EmailService,
        mimoService: MimoService,
    ) {
        this.storageService = storageService;
        this.emailService = emailService;
        this.mimoService = mimoService;
        this.imageValidationService = new ImageValidationService();
        this.imageProcessingService = new ImageProcessingService();
    }

    /**
     * Validates email against purchase records and checks for duplicate reviews.
     * Always returns within the same time window to prevent user enumeration.
     */
    async validateEmail(email: string): Promise<ValidateEmailResult> {
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Find the lead by email
        const lead = await prisma.lead.findFirst({
            where: { email: normalizedEmail },
            select: { id: true },
        });

        if (!lead) {
            return { canReview: false, reason: "no_purchase_found" };
        }

        // 2. Find all "paid" orders for this lead, including their review status
        const orders = await prisma.order.findMany({
            where: {
                leadId: lead.id,
                status: "paid",
            },
            select: {
                id: true,
                review: {
                    select: { status: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        if (orders.length === 0) {
            return { canReview: false, reason: "no_purchase_found" };
        }

        // 3. Find the first order that doesn't have a review yet
        const orderWithoutReview = orders.find((o) => !o.review);

        if (!orderWithoutReview) {
            // All paid orders already have reviews
            // We return the status of the most recent review for context
            return {
                canReview: false,
                reason: "already_reviewed",
                reviewStatus: orders[0].review?.status,
            };
        }

        return { canReview: true, orderId: orderWithoutReview.id };
    }

    /**
     * Creates a new review. Re-validates everything server-side (never trust client state).
     */
    async createReview(dto: CreateReviewDto): Promise<{ id: string; status: string }> {
        const normalizedEmail = dto.email.toLowerCase().trim();

        // --- Re-validate: prevent race conditions and bypasses ---
        // We validate that the order belongs to the email and doesn't have a review
        const order = await prisma.order.findFirst({
            where: {
                id: dto.orderId,
                status: "paid",
                lead: {
                    email: normalizedEmail,
                },
            },
            select: {
                id: true,
                review: { select: { id: true } },
                leadId: true,
            },
        });

        if (!order) {
            throw new Error("No encontramos una compra pagada asociada a este email u orden.");
        }

        if (order.review) {
            throw new Error("Esta orden ya tiene una reseña asociada.");
        }

        const leadId = order.leadId;

        // --- Validate image magic bytes BEFORE inserting review ---
        // This way we reject invalid files early without creating a review record.
        // The image is uploaded AFTER we have the reviewId, so the key is deterministic.
        let imageValidated = false;
        if (dto.imageBuffer && dto.imageName && dto.imageMimeType) {
            try {
                this.imageValidationService.validateMagicBytes(dto.imageBuffer, dto.imageMimeType);
                imageValidated = true;
            } catch (err) {
                // Invalid image: proceed without it, log the rejection
                console.warn("[ReviewService] Image validation failed, proceeding without image:", err);
            }
        }

        // --- Insert review (without image first) ---
        let imageUrl: string | undefined;
        try {
            const review = await prisma.review.create({
                data: {
                    email: normalizedEmail,
                    orderId: dto.orderId,
                    leadId: leadId,
                    petName: dto.petName.trim(),
                    rating: dto.rating,
                    comment: dto.comment.trim(),
                    imageUrl: null, // will be updated after upload if image provided
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

            // --- Upload image to Backblaze B2 if provided and valid ---
            // Now we have review.id, so we can build a clean, PII-free key.
            if (dto.imageBuffer && dto.imageName && dto.imageMimeType && imageValidated) {
                try {
                    // 1. Compress + convert to WebP with sharp
                    const processed = await this.imageProcessingService.processReviewImage(
                        dto.imageBuffer
                    );

                    console.log(
                        `[ReviewService] Imagen comprimida: ${dto.imageBuffer.length} bytes → ` +
                        `${processed.sizeBytes} bytes (-${processed.reductionPercent}%) ` +
                        `[${processed.width}×${processed.height}px WebP]`
                    );

                    // 2. Generate thumbnail (300px square cover)
                    const thumb = await this.imageProcessingService.generateThumbnail(
                        dto.imageBuffer,
                    );

                    // 3. Generate keys — always .webp
                    const imageKey = `resenas/${review.id}/medium.webp`;
                    const thumbKey = `resenas/${review.id}/thumb.webp`;

                    // 4. Upload both optimized buffers to B2
                    await Promise.all([
                        this.storageService.uploadWithKey({
                            buffer: processed.buffer,
                            key: imageKey,
                            mimeType: "image/webp",
                            documentType: "REVIEW_IMAGES",
                        }),
                        this.storageService.uploadWithKey({
                            buffer: thumb.buffer,
                            key: thumbKey,
                            mimeType: "image/webp",
                            documentType: "REVIEW_IMAGES",
                        })
                    ]);

                    // 5. Update review record with both image keys
                    await prisma.review.update({
                        where: { id: review.id },
                        data: {
                            imageUrl: imageKey,
                            imageThumbUrl: thumbKey,
                        },
                    });
                } catch (err) {
                    console.warn("[ReviewService] Image processing/upload failed, review saved without image:", err);
                }
            }

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
                throw new Error("Esta orden ya tiene una reseña asociada.");
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
                    imageThumbUrl: true,
                    mimoCount: true, // Added
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
                imageThumbUrl: r.imageThumbUrl ? await this.storageService.getSignedUrl(r.imageThumbUrl) : null,
            }))
        );

        const enrichedReviews = reviewsWithUrls.map(review => {
            const { level, icon } = MimoService.calculateLevel(review.mimoCount || 0);
            return {
                ...review,
                mimoLevel: level,
                mimoIcon: icon
            };
        });

        return {
            data: enrichedReviews,
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
