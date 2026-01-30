import { PgBoss } from "pg-boss";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const JOB_DISCOUNT_CODE_SCAN = "discount-code.scan-expired";
export const JOB_DISCOUNT_CODE_SETTLE = "discount-code.settle";

export async function registerDiscountCodeExpirationScan(boss: PgBoss) {
  // Ensure queues exist before scheduling (pg-boss schedule references pgboss.queue).
  await boss.createQueue(JOB_DISCOUNT_CODE_SCAN);
  await boss.createQueue(JOB_DISCOUNT_CODE_SETTLE);

  // Run daily at 00:05 Argentina time by default (can be overridden with JOB_DISCOUNT_CODE_SCAN_CRON)
  const cron = process.env.JOB_DISCOUNT_CODE_SCAN_CRON || "5 0 * * *";
  console.log("🚀 ~ registerDiscountCodeExpirationScan ~ cron:", cron);
  // JOB_DISCOUNT_CODE_SCAN_CRON=*/1 * * * *
  await boss.schedule(JOB_DISCOUNT_CODE_SCAN, cron, null, {
    tz: "America/Argentina/Buenos_Aires",
  });

  boss.work(JOB_DISCOUNT_CODE_SCAN, { batchSize: 1 }, async () => {
    const now = new Date();

    const expiredCodes = await prisma.discountCode.findMany({
      where: {
        isActive: true,
        // validUntil is stored as end-of-day Argentina time (as UTC timestamp).
        // Inclusive until validUntil; expired strictly after.
        validUntil: { lt: now },
      },
      select: { id: true },
      take: 10,
    });

    for (const code of expiredCodes) {
      await boss.send(
        JOB_DISCOUNT_CODE_SETTLE,
        { discountCodeId: code.id },
        {
          singletonKey: `discount-code-settle:${code.id}`,
          singletonSeconds: 60 * 60 * 24, // 24h dedupe window
        }
      );
    }

    return { scanned: expiredCodes.length };
  });
}
