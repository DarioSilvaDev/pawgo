import { prisma } from "../config/prisma.client.js";
import { Prisma } from "@prisma/client";
import { StorageService } from "./storage.service.js";

export type MimoLevel = "Peludo tierno" | "Rompe corazones" | "Estrella Pawgo" | "Leyenda Peluda";

export interface MimoResult {
    mimoCount: number;
    level: MimoLevel;
    levelIcon: string;
    alreadyVoted: boolean;
}

export class MimoService {
    constructor(private readonly storageService: StorageService) { }

    /**
     * Calculates the emotional level based on mimo count.
     */
    static calculateLevel(mimoCount: number): { level: MimoLevel; icon: string } {
        if (mimoCount <= 50) return { level: "Peludo tierno", icon: "💚" };
        if (mimoCount <= 150) return { level: "Rompe corazones", icon: "❤️" };
        if (mimoCount <= 300) return { level: "Estrella Pawgo", icon: "⭐" };
        return { level: "Leyenda Peluda", icon: "👑" };
    }

    /**
     * Adds a "mimo" to a review.
     * Prevents duplicate votes using leadId (if exists) or fingerprint.
     */
    async addMimo(params: {
        reviewId: string;
        leadId?: string;
        fingerprint: string;
    }): Promise<MimoResult> {
        const { reviewId, leadId, fingerprint } = params;

        // Verify review exists and is approved
        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            select: { id: true, status: true, mimoCount: true }
        });

        if (!review) throw new Error("Reseña no encontrada.");
        if (review.status !== "approved") throw new Error("Solo podés regalar mimos a fotos aprobadas.");

        // Check for existing vote
        const existingVote = await prisma.reviewMimo.findFirst({
            where: {
                reviewId,
                OR: [
                    leadId ? { leadId } : { id: 'none' }, // Skip if leadId is null
                    { fingerprint }
                ]
            }
        });

        if (existingVote) {
            const { level, icon } = MimoService.calculateLevel(review.mimoCount);
            return {
                mimoCount: review.mimoCount,
                level,
                levelIcon: icon,
                alreadyVoted: true
            };
        }

        // Add vote and increment count in a transaction
        try {
            const [newMimo, updatedReview] = await prisma.$transaction([
                prisma.reviewMimo.create({
                    data: {
                        reviewId,
                        leadId: leadId || null,
                        fingerprint
                    }
                }),
                prisma.review.update({
                    where: { id: reviewId },
                    data: {
                        mimoCount: { increment: 1 }
                    },
                    select: { mimoCount: true }
                })
            ]);

            const { level, icon } = MimoService.calculateLevel(updatedReview.mimoCount);

            return {
                mimoCount: updatedReview.mimoCount,
                level,
                levelIcon: icon,
                alreadyVoted: false
            };
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                // Race condition: already voted
                const { level, icon } = MimoService.calculateLevel(review.mimoCount);
                return {
                    mimoCount: review.mimoCount,
                    level,
                    levelIcon: icon,
                    alreadyVoted: true
                };
            }
            throw err;
        }
    }

    /**
     * Gets the current ranking for the month.
     */
    async getMonthlyRanking(limit: number = 5) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // This queries mimos created this month and groups them by review
        const ranking = await prisma.reviewMimo.groupBy({
            by: ['reviewId'],
            where: {
                createdAt: { gte: startOfMonth }
            },
            _count: {
                reviewId: true
            },
            orderBy: {
                _count: {
                    reviewId: 'desc'
                }
            },
            take: limit
        });

        // Enrich with review data
        const enrichedRanking = await Promise.all(
            ranking.map(async (item) => {
                const review = await prisma.review.findUnique({
                    where: { id: item.reviewId },
                    select: {
                        id: true,
                        petName: true,
                        comment: true,
                        rating: true,
                        imageUrl: true,
                        imageThumbUrl: true,
                        mimoCount: true,
                        purchaseVerified: true,
                        createdAt: true,
                        leadId: true,
                        lead: {
                            select: { name: true, email: true }
                        }
                    }
                });

                const [imageUrl, imageThumbUrl] = await Promise.all([
                    review?.imageUrl ? this.storageService.getSignedUrl(review.imageUrl) : Promise.resolve(null),
                    review?.imageThumbUrl ? this.storageService.getSignedUrl(review.imageThumbUrl) : Promise.resolve(null)
                ]);

                const { level, icon } = MimoService.calculateLevel(review?.mimoCount || 0);
                return {
                    ...review,
                    imageUrl,
                    imageThumbUrl,
                    mimoLevel: level,
                    mimoIcon: icon,
                    mimosThisMonth: item._count.reviewId
                };
            })
        );

        return enrichedRanking;
    }
}
