import { prisma } from "../config/prisma.client.js";
import { StorageService } from "./storage.service.js";
import { EmailService } from "./email.service.js";
import { MimoService } from "./mimo.service.js";
import { ImageValidationService } from "./image-validation.service.js";
import { ImageProcessingService } from "./image-processing.service.js";
import { OrderStatus, Prisma } from "@prisma/client";

export interface ValidateEmailResult {
    canReview: boolean;
    reason?: "already_reviewed" | "no_purchase_found";
    reviewStatus?: string;
    orderId?: string;
    accessType?: "purchase" | "admin_email";
    remainingReviews?: number;
}

export interface CreateReviewDto {
    email: string;
    orderId?: string;
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

export interface UpsertReviewEmailAccessDto {
    email: string;
    remainingReviews: number;
    notes?: string;
    adminAuthId: string;
}

export interface UpdateReviewEmailAccessDto {
    remainingReviews?: number;
    notes?: string | null;
    isActive?: boolean;
    adminAuthId: string;
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

        const adminAccess = await prisma.reviewEmailAccess.findUnique({
            where: { email: normalizedEmail },
            select: {
                isActive: true,
                remainingReviews: true,
            },
        });

        const hasAdminAccess =
            !!adminAccess && adminAccess.isActive && adminAccess.remainingReviews > 0;

        // 1. Find the lead by email
        const lead = await prisma.lead.findFirst({
            where: { email: normalizedEmail },
            select: { id: true },
        });

        if (!lead) {
            if (hasAdminAccess) {
                return {
                    canReview: true,
                    accessType: "admin_email",
                    remainingReviews: adminAccess.remainingReviews,
                };
            }

            return { canReview: false, reason: "no_purchase_found" };
        }

        // 2. Find all "shipped" orders for this lead, including their review status
        const orders = await prisma.order.findMany({
            where: {
                leadId: lead.id,
                status: OrderStatus.shipped,
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
            if (hasAdminAccess) {
                return {
                    canReview: true,
                    accessType: "admin_email",
                    remainingReviews: adminAccess.remainingReviews,
                };
            }

            return { canReview: false, reason: "no_purchase_found" };
        }

        // 3. Find the first order that doesn't have a review yet
        const orderWithoutReview = orders.find((o) => !o.review);

        if (orderWithoutReview) {
            return {
                canReview: true,
                orderId: orderWithoutReview.id,
                accessType: "purchase",
            };
        }

        if (hasAdminAccess) {
            return {
                canReview: true,
                accessType: "admin_email",
                remainingReviews: adminAccess.remainingReviews,
            };
        }

        // All shipped orders already have reviews
        // We return the status of the most recent review for context
        return {
            canReview: false,
            reason: "already_reviewed",
            reviewStatus: orders[0].review?.status,
        };
    }

    /**
     * Creates a new review. Re-validates everything server-side (never trust client state).
     */
    async createReview(dto: CreateReviewDto): Promise<{ id: string; status: string }> {
        const normalizedEmail = dto.email.toLowerCase().trim();
        const normalizedOrderId = dto.orderId?.trim() || null;

        let leadId: string | null = null;
        let purchaseVerified = false;

        // --- Re-validate: prevent race conditions and bypasses ---
        // We validate that either:
        // 1) order belongs to the email and doesn't have a review, or
        // 2) email is enabled by admin and has remaining quota.
        if (normalizedOrderId) {
            const order = await prisma.order.findFirst({
                where: {
                    id: normalizedOrderId,
                    status: OrderStatus.shipped,
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

            leadId = order.leadId;
            purchaseVerified = true;
        } else {
            const access = await prisma.reviewEmailAccess.findUnique({
                where: { email: normalizedEmail },
                select: {
                    id: true,
                    isActive: true,
                    remainingReviews: true,
                },
            });

            if (!access || !access.isActive || access.remainingReviews <= 0) {
                throw new Error("Este email no tiene cupos habilitados para reseñas.");
            }

            const lead = await prisma.lead.findFirst({
                where: { email: normalizedEmail },
                select: { id: true },
            });

            leadId = lead?.id ?? null;
            purchaseVerified = false;
        }

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
        try {
            const review = normalizedOrderId
                ? await prisma.review.create({
                    data: {
                        email: normalizedEmail,
                        orderId: normalizedOrderId,
                        leadId,
                        petName: dto.petName.trim(),
                        rating: dto.rating,
                        comment: dto.comment.trim(),
                        imageUrl: null,
                        photoConsent: dto.photoConsent,
                        consentedAt: dto.photoConsent ? new Date() : null,
                        ipAddress: dto.ipAddress ?? null,
                        userAgent: dto.userAgent ?? null,
                        submittedFrom: dto.submittedFrom ?? "web_direct",
                        purchaseVerified,
                        status: "pending",
                        isApproved: false,
                    },
                    select: { id: true, status: true },
                })
                : await prisma.$transaction(async (tx) => {
                    const consumed = await tx.reviewEmailAccess.updateMany({
                        where: {
                            email: normalizedEmail,
                            isActive: true,
                            remainingReviews: { gt: 0 },
                        },
                        data: {
                            remainingReviews: { decrement: 1 },
                            usedReviews: { increment: 1 },
                            lastUsedAt: new Date(),
                        },
                    });

                    if (consumed.count === 0) {
                        throw new Error("No quedan cupos disponibles para este email.");
                    }

                    return tx.review.create({
                        data: {
                            email: normalizedEmail,
                            orderId: null,
                            leadId,
                            petName: dto.petName.trim(),
                            rating: dto.rating,
                            comment: dto.comment.trim(),
                            imageUrl: null,
                            photoConsent: dto.photoConsent,
                            consentedAt: dto.photoConsent ? new Date() : null,
                            ipAddress: dto.ipAddress ?? null,
                            userAgent: dto.userAgent ?? null,
                            submittedFrom: dto.submittedFrom ?? "web_direct",
                            purchaseVerified,
                            status: "pending",
                            isApproved: false,
                        },
                        select: { id: true, status: true },
                    });
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
            if (normalizedOrderId) {
                await prisma.orderEventLog.create({
                    data: {
                        orderId: normalizedOrderId,
                        event: "REVIEW_SUBMITTED",
                        payload: { reviewId: review.id, email: normalizedEmail },
                    },
                });
            }

            return review;
        } catch (err) {
            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === "P2002"
            ) {
                throw new Error(
                    normalizedOrderId
                        ? "Esta orden ya tiene una reseña asociada."
                        : "Ya existe una reseña en conflicto para este email."
                );
            }
            throw err;
        }
    }

    async upsertReviewEmailAccess(dto: UpsertReviewEmailAccessDto) {
        const normalizedEmail = dto.email.toLowerCase().trim();
        const notes = dto.notes?.trim() ? dto.notes.trim() : null;

        const existingAccess = await prisma.reviewEmailAccess.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        });

        const isNewAccess = !existingAccess;

        const access = await prisma.reviewEmailAccess.upsert({
            where: { email: normalizedEmail },
            update: {
                remainingReviews: dto.remainingReviews,
                notes,
                isActive: true,
                updatedBy: dto.adminAuthId,
            },
            create: {
                email: normalizedEmail,
                remainingReviews: dto.remainingReviews,
                notes,
                enabledBy: dto.adminAuthId,
                updatedBy: dto.adminAuthId,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                remainingReviews: true,
                usedReviews: true,
                isActive: true,
                notes: true,
                enabledBy: true,
                updatedBy: true,
                lastUsedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (isNewAccess && access.isActive && access.remainingReviews > 0) {
            try {
                await this.emailService.sendReviewAccessEnabledNotificationIdempotent({
                    idempotencyKey: `REVIEW_ACCESS_ENABLED:${normalizedEmail}`,
                    email: normalizedEmail,
                    remainingReviews: access.remainingReviews,
                });
            } catch (error) {
                console.warn(
                    `[ReviewService] Failed to send review access enabled email to ${normalizedEmail}:`,
                    error
                );
            }
        }

        return access;
    }

    async getReviewEmailAccessList(query: {
        search?: string;
        page?: number;
        limit?: number;
        isActive?: boolean;
    }) {
        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const where: Prisma.ReviewEmailAccessWhereInput = {};

        if (query.search?.trim()) {
            where.email = {
                contains: query.search.trim().toLowerCase(),
                mode: "insensitive",
            };
        }

        if (typeof query.isActive === "boolean") {
            where.isActive = query.isActive;
        }

        const [rows, total] = await Promise.all([
            prisma.reviewEmailAccess.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    remainingReviews: true,
                    usedReviews: true,
                    isActive: true,
                    notes: true,
                    enabledBy: true,
                    updatedBy: true,
                    lastUsedAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma.reviewEmailAccess.count({ where }),
        ]);

        return {
            data: rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    async updateReviewEmailAccess(id: string, dto: UpdateReviewEmailAccessDto) {
        const data: Prisma.ReviewEmailAccessUpdateInput = {
            updatedBy: dto.adminAuthId,
        };

        if (typeof dto.remainingReviews === "number") {
            data.remainingReviews = dto.remainingReviews;
        }

        if (typeof dto.isActive === "boolean") {
            data.isActive = dto.isActive;
        }

        if (dto.notes !== undefined) {
            data.notes = dto.notes?.trim() ? dto.notes.trim() : null;
        }

        if (
            typeof dto.remainingReviews !== "number" &&
            typeof dto.isActive !== "boolean" &&
            dto.notes === undefined
        ) {
            throw new Error("No hay cambios para aplicar.");
        }

        try {
            return await prisma.reviewEmailAccess.update({
                where: { id },
                data,
                select: {
                    id: true,
                    email: true,
                    remainingReviews: true,
                    usedReviews: true,
                    isActive: true,
                    notes: true,
                    enabledBy: true,
                    updatedBy: true,
                    lastUsedAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new Error("No encontramos la habilitación solicitada.");
            }
            throw error;
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
