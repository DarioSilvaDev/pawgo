import { PgBoss, Job } from "pg-boss";
import { PrismaClient } from "@prisma/client";
import { emailService } from "../services/email.service.js";

const prisma = new PrismaClient();

export const JOB_REVIEW_REMINDER = "review.reminder-7-days";

interface ReviewReminderJobData {
    orderId: string;
    email: string;
    name?: string;
}

export async function registerReviewReminderWorker(boss: PgBoss) {
    // Ensure queue exists before registering worker
    await boss.createQueue(JOB_REVIEW_REMINDER);

    boss.work(
        JOB_REVIEW_REMINDER,
        async (jobs: Job<ReviewReminderJobData>[]) => {
            for (const job of jobs) {
                const { orderId, email, name } = job.data;

                try {
                    // Check if order still exists and isn't already reviewed
                    const existingReview = await prisma.review.findUnique({
                        where: { orderId },
                    });

                    if (existingReview) {
                        console.log(`[Job] Review reminder skipped for order ${orderId}: Review already exists.`);
                        continue;
                    }

                    // Send reminder email
                    await emailService.sendReviewReminderNotification(email, name);
                    console.log(`[Job] Review reminder sent to ${email} for order ${orderId}`);

                } catch (error) {
                    console.error(`[Job] Failed to send review reminder for order ${orderId}:`, error);
                }
            }
        }
    );
}
