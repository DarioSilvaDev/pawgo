import { PgBoss, Job } from "pg-boss";
import { PrismaClient } from "@prisma/client";
import { emailService } from "../services/email.service.js";
import { DiscountCodeService } from "../services/discount-code.service.js";

const prisma = new PrismaClient();
const discountCodeService = new DiscountCodeService();

export const JOB_LEAD_NOTIFICATION = "lead.notify-availability";

interface LeadNotificationJobData {
    leadId: string;
}

export async function registerLeadNotificationWorker(boss: PgBoss) {
    // Ensure queue exists before registering worker
    await boss.createQueue(JOB_LEAD_NOTIFICATION);

    const concurrency = Number(
        process.env.JOB_LEAD_NOTIFICATION_CONCURRENCY || 5
    );

    boss.work(
        JOB_LEAD_NOTIFICATION,
        { batchSize: concurrency },
        async (jobs: Job<LeadNotificationJobData>[]) => {
            const results = [];

            // Process jobs sequentially with delay to avoid rate limiting
            for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                const { leadId } = job.data;

                try {
                    const lead = await prisma.lead.findUnique({
                        where: { id: leadId },
                    });

                    if (!lead) {
                        results.push({ status: "not_found" as const, leadId });
                        continue;
                    }

                    // Generate unique discount code for this lead using unified service
                    const discountCode = await discountCodeService.createLeadReservationCode(leadId);

                    // Send email with discount code
                    await emailService.sendProductAvailabilityNotification(
                        lead.email,
                        discountCode.code,
                        lead.name || undefined,
                        lead.dogSize || undefined
                    );

                    // Update lead notification tracking
                    await prisma.lead.update({
                        where: { id: leadId },
                        data: {
                            notifiedAt: new Date(),
                            notificationSentCount: { increment: 1 },
                        },
                    });

                    console.log(`✅ Availability notification sent to lead: ${lead.email} with code: ${discountCode.code}`);

                    results.push({ status: "sent" as const, leadId, email: lead.email, discountCode: discountCode.code });

                    // Add delay between emails to respect rate limits (except for the last one)
                    if (i < jobs.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (error) {
                    console.error(`❌ Failed to notify lead ${leadId}:`, error);
                    results.push({
                        status: "error" as const,
                        leadId,
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                }
            }

            return results;
        }
    );
}
