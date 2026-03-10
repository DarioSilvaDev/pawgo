import { PgBoss, Job } from "pg-boss";
import { prisma } from "../config/prisma.client.js";
import { emailService } from "../services/email.service.js";
import { DiscountCodeService } from "../services/discount-code.service.js";

const discountCodeService = new DiscountCodeService();

export const JOB_STOCK_REPLENISHMENT = "stock.notify-replenishment";

interface StockReplenishmentJobData {
    reservationId: string;
}

export async function registerStockReplenishmentWorker(boss: PgBoss) {
    await boss.createQueue(JOB_STOCK_REPLENISHMENT);

    const concurrency = Number(
        process.env.JOB_STOCK_REPLENISHMENT_CONCURRENCY || 5
    );

    boss.work(
        JOB_STOCK_REPLENISHMENT,
        { batchSize: concurrency },
        async (jobs: Job<StockReplenishmentJobData>[]) => {
            const results = [];

            for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                const { reservationId } = job.data;

                try {
                    const reservation = await prisma.stockReservation.findUnique({
                        where: { id: reservationId },
                        include: {
                            lead: true,
                            variant: {
                                include: {
                                    product: true
                                }
                            }
                        }
                    });

                    if (!reservation || reservation.notifiedAt) {
                        results.push({ status: "processed_or_not_found", reservationId });
                        continue;
                    }

                    const { lead, variant } = reservation;

                    // 1. Generate unique discount code for this lead
                    const discountCode = await discountCodeService.createLeadReservationCode(lead.id);

                    // 2. Send email with discount code and product info
                    await emailService.sendProductAvailabilityNotification(
                        lead.email,
                        discountCode.code,
                        lead.name || undefined,
                        variant.product.name,
                        variant.name
                    );

                    // 3. Mark reservation as notified
                    await prisma.stockReservation.update({
                        where: { id: reservationId },
                        data: { notifiedAt: new Date() }
                    });

                    console.log(`✅ Stock notification sent for variant ${variant.sku} to lead: ${lead.email}`);

                    results.push({ status: "sent", reservationId, email: lead.email });

                    if (i < jobs.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (error) {
                    console.error(`❌ Failed to notify stock reservation ${reservationId}:`, error);
                    results.push({
                        status: "error",
                        reservationId,
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                }
            }

            return results;
        }
    );
}
