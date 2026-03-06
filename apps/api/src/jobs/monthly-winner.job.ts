import { PgBoss, Job } from "pg-boss";
import { MonthlyWinnerService } from "../services/monthly-winner.service.js";
import { EmailService } from "../services/email.service.js";
import { DiscountCodeService } from "../services/discount-code.service.js";
import { StorageService } from "../services/storage.service.js";

export const JOB_MONTHLY_WINNER_SELECTION = "review.monthly-winner-selection";

export async function registerMonthlyWinnerWorker(boss: PgBoss) {
    const emailService = new EmailService();
    const discountCodeService = new DiscountCodeService();
    const storageService = new StorageService();
    const service = new MonthlyWinnerService(emailService, discountCodeService, storageService);

    // Ensure queue exists
    await boss.createQueue(JOB_MONTHLY_WINNER_SELECTION);

    // This job runs on the 1st of each month. 
    // It can be scheduled via boss.schedule() or called from a system-wide cron.
    boss.work(
        JOB_MONTHLY_WINNER_SELECTION,
        async (jobs: Job<any>[]) => {
            for (const job of jobs) {
                try {
                    console.log(`[Job] Starting Monthly Winner Selection...`);
                    await service.selectMonthlyWinner();
                    console.log(`[Job] Monthly Winner Selection completed.`);
                } catch (error) {
                    console.error(`[Job] Failed to select monthly winner:`, error);
                }
            }
        }
    );
}

/**
 * Schedules the monthly winner job to run on the 1st of every month at 00:01 AM.
 * Cron expression: "1 0 1 * *"
 */
export async function scheduleMonthlyWinnerJob(boss: PgBoss) {
    // Check if already scheduled to avoid duplicates
    // Note: pg-boss handle cron deduplication based on the name
    await boss.schedule(JOB_MONTHLY_WINNER_SELECTION, "1 0 1 * *", {});
    console.log(`[Job] Scheduled Monthly Winner Selection for the 1st of every month.`);
}
