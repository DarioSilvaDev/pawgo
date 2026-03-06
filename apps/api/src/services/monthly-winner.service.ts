import { prisma } from "../config/prisma.client.js";
import { EmailService } from "./email.service.js";
import { DiscountCodeService } from "./discount-code.service.js";
import { StorageService } from "./storage.service.js";
import { DateTime } from "luxon";

export class MonthlyWinnerService {
    private readonly emailService: EmailService;
    private readonly discountCodeService: DiscountCodeService;
    private readonly storageService: StorageService;

    constructor(
        emailService: EmailService = new EmailService(),
        discountCodeService: DiscountCodeService = new DiscountCodeService(),
        storageService: StorageService = new StorageService()
    ) {
        this.emailService = emailService;
        this.discountCodeService = discountCodeService;
        this.storageService = storageService;
    }

    /**
     * Executes the monthly winner selection process.
     * Usually called on the 1st of each month.
     */
    async selectMonthlyWinner(targetMonth?: string) {
        // targetMonth format "YYYY-MM". If not provided, use previous month.
        const now = DateTime.now().setZone("America/Argentina/Buenos_Aires");
        const monthToProcess = targetMonth || now.minus({ months: 1 }).toFormat("yyyy-MM");

        console.log(`[MonthlyWinnerService] Processing winner for ${monthToProcess}...`);

        // Check if winner already exists for this month
        const existingWinner = await prisma.reviewMonthlyWinner.findUnique({
            where: { month: monthToProcess }
        });

        if (existingWinner) {
            console.warn(`[MonthlyWinnerService] Winner already announced for ${monthToProcess}.`);
            return existingWinner;
        }

        // 1. Calculate the period
        const [year, month] = monthToProcess.split("-").map(Number);
        const startOfMonth = DateTime.fromObject({ year, month, day: 1 }, { zone: "America/Argentina/Buenos_Aires" }).startOf("month").toJSDate();
        const endOfMonth = DateTime.fromObject({ year, month, day: 1 }, { zone: "America/Argentina/Buenos_Aires" }).endOf("month").toJSDate();

        // 2. Find the top review by mimos in that period
        const topMimo = await prisma.reviewMimo.groupBy({
            by: ['reviewId'],
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            _count: {
                reviewId: true
            },
            orderBy: {
                _count: {
                    reviewId: 'desc'
                }
            },
            take: 1
        });

        if (topMimo.length === 0) {
            console.log(`[MonthlyWinnerService] No mimos found for ${monthToProcess}.`);
            return null;
        }

        const winnerReviewId = topMimo[0].reviewId;
        const totalMimos = topMimo[0]._count.reviewId;

        // Fetch full review and lead info
        const review = await prisma.review.findUnique({
            where: { id: winnerReviewId },
            include: { lead: true }
        });

        if (!review || !review.lead) {
            console.error(`[MonthlyWinnerService] Winner review or lead not found.`);
            return null;
        }

        // 3. Generate the "Accessory Prize" Coupon
        // The user wants a physical accessory (poop bag holder, toy, etc.)
        // We generate a 100% discount code named "PELUDO-[MONTH]-[PETNAME]"
        const couponCode = `PELUDO-${monthToProcess.replace("-", "")}-${review.petName.toUpperCase().slice(0, 3)}`;

        const discountCode = await this.discountCodeService.create({
            code: couponCode,
            discountType: "percentage",
            discountValue: 100,
            maxUses: 1,
            validUntil: now.plus({ months: 1 }).toISO() || undefined, // Valid for 1 month
        });

        // 4. Record the winner
        const winner = await prisma.reviewMonthlyWinner.create({
            data: {
                reviewId: winnerReviewId,
                month: monthToProcess,
                mimosCount: totalMimos,
                couponCodeId: discountCode.id,
                announcedAt: new Date()
            }
        });

        // 5. Update review to "Featured"
        await prisma.review.update({
            where: { id: winnerReviewId },
            data: { isFeatured: true }
        });

        // 6. Notify the winner via Email
        const reviewImageUrl = review.imageUrl ? this.storageService.getPublicUrl(review.imageUrl) : '';

        await this.emailService.sendMonthlyWinnerNotification({
            email: review.email || review.lead.email, // Use review email or lead email as fallback
            petName: review.petName,
            couponCode: discountCode.code,
            monthName: DateTime.fromObject({ month }).setLocale("es").monthLong as string,
            reviewImageUrl,
        });

        console.log(`[MonthlyWinnerService] Winner for ${monthToProcess} is ${review.petName}! Notification sent.`);

        return winner;
    }
}
